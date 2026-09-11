import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, realpathSync, lstatSync } from "node:fs";
import { spawn, execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { prepareIsolationCanaries, verifyFixtureIsolation } from "./fixture-isolation.mjs";

const exec = promisify(execFile);
const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const cli = join(root, "packages/cli");
const run = (command, args, cwd = root) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
    );
  });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const withTimeout = async (promise, ms, message) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
await run("pnpm", ["--filter", "@agentis-labs/cli", "build"]);
const packDir = mkdtempSync(join(tmpdir(), "agentis-pack-"));
const installDir = mkdtempSync(join(tmpdir(), "agentis-install-"));
const canaries = await prepareIsolationCanaries();
let launch;
let report;
let exit;
let succeeded = false;
try {
  await run("pnpm", ["pack", "--pack-destination", packDir], cli);
  const tarball = readdirSync(packDir).find((name) => name.endsWith(".tgz"));
  assert.ok(tarball, "pack produced no tarball");
  await run("npm", ["install", "--prefix", installDir, join(packDir, tarball)]);
  const bin = join(installDir, "node_modules/.bin/agentis");
  launch = spawn(bin, ["verify", "launch"], {
    env: { ...process.env, ...canaries.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  exit = new Promise((resolve) => launch.once("exit", (code, signal) => resolve({ code, signal })));
  report = await new Promise((resolve, reject) => {
    let out = "";
    let errors = "";
    const timer = setTimeout(() => reject(new Error(`verify launch timed out: ${errors}`)), 180000);
    const fail = (error) => {
      clearTimeout(timer);
      reject(error);
    };
    launch.once("error", fail);
    launch.stdout.on("data", (chunk) => {
      out += chunk;
      try {
        const value = JSON.parse(out);
        if (value.endpoint && value.containerId && value.pid && value.dataRoot) {
          clearTimeout(timer);
          resolve(value);
        }
      } catch {}
    });
    launch.stderr.on("data", (chunk) => {
      errors += chunk;
    });
    launch.once("exit", (code) => fail(new Error(`verify launch exited ${code}: ${errors}`)));
  });
  await run(bin, ["doctor", "--endpoint", report.endpoint, "--data-root", report.dataRoot]);
  const isolation = await verifyFixtureIsolation(
    report,
    canaries,
    realpathSync(join(installDir, "node_modules/@agentis-labs/cli/dist/fixture-daemon.mjs")),
  );
  const { stdout } = await exec(bin, [
    "task",
    "submit",
    "--endpoint",
    report.endpoint,
    "--data-root",
    report.dataRoot,
    "--brief",
    "pack-smoke",
    "--fixture",
    "smoke",
  ]);
  const receipt = JSON.parse(stdout);
  assert.ok(receipt.accepted && receipt.taskId && receipt.runId, "fake task was not accepted");
  const token = JSON.parse(readFileSync(join(report.dataRoot, "owner.token"), "utf8")).token;
  let snapshot;
  const deadline = Date.now() + 10000;
  for (;;) {
    const response = await fetch(new URL("/v1/status", report.endpoint), {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    snapshot = await response.json();
    if (snapshot.runs.find((item) => item.id === receipt.runId)?.status === "succeeded") break;
    assert.ok(Date.now() < deadline, "packaged task did not complete");
    await delay(100);
  }
  const artifact = snapshot.artifacts.find((item) => item.runId === receipt.runId);
  assert.ok(
    artifact && artifact.path.startsWith(report.workspace + "/"),
    "artifact outside scratch",
  );
  assert.ok(lstatSync(artifact.path).isFile(), "artifact must be a regular file");
  assert.ok(
    realpathSync(artifact.path).startsWith(realpathSync(report.workspace) + "/"),
    "artifact resolves outside scratch",
  );
  const bytes = readFileSync(artifact.path);
  assert.equal(bytes.toString(), "# pack-smoke\n");
  assert.equal(bytes.length, artifact.byteSize);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256);
  launch.kill("SIGTERM");
  const stopped = await withTimeout(exit, 15000, "launcher did not stop");
  assert.ok(stopped.code === 0 || stopped.signal === "SIGTERM", "launcher failed during cleanup");
  await assert.rejects(exec("docker", ["inspect", report.containerId]), (error) =>
    /No such (object|container)/i.test(error.stderr ?? ""),
  );
  await assert.rejects(
    fetch(new URL("/v1/health", report.endpoint), { signal: AbortSignal.timeout(2000) }),
  );
  succeeded = true;
  console.log(
    JSON.stringify({
      ok: true,
      endpoint: report.endpoint,
      containerId: report.containerId,
      tarball,
      taskId: receipt.taskId,
      runId: receipt.runId,
      artifact,
      isolation,
      cleanup: "launcher exited; container absent; endpoint closed",
    }),
  );
} finally {
  try {
    if (launch && launch.exitCode === null && launch.signalCode === null) {
      launch.kill("SIGTERM");
      await withTimeout(exit, 15000, "launcher cleanup timed out");
    }
  } finally {
    if (launch && launch.exitCode === null && launch.signalCode === null) launch.kill("SIGKILL");
    await canaries.close();
    rmSync(packDir, { recursive: true, force: true });
    rmSync(installDir, { recursive: true, force: true });
    if (succeeded) {
      rmSync(report.dataRoot, { recursive: true, force: true });
    }
  }
}
