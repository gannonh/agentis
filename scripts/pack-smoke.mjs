import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync, realpathSync } from "node:fs";
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
  const installedPackage = join(installDir, "node_modules/@agentis-labs/cli");
  const installedWeb = realpathSync(join(installedPackage, "dist/web"));
  const webFiles = readdirSync(installedWeb, { recursive: true }).map(String);
  assert.ok(webFiles.includes("index.html"), "pack omitted the browser shell");
  assert.ok(
    webFiles.some((path) => path.endsWith(".js")),
    "pack omitted browser JavaScript",
  );
  assert.ok(
    webFiles.some((path) => path.endsWith(".css")),
    "pack omitted browser CSS",
  );
  assert.ok(!webFiles.some((path) => path.endsWith(".map")), "pack exposed browser source maps");
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
    installedWeb,
  );
  const endpoint = new URL(report.endpoint);
  const shell = await fetch(endpoint);
  assert.equal(shell.status, 200);
  assert.match(await shell.text(), /<div id="root"><\/div>/);

  const { stdout: webOutput } = await exec(bin, [
    "web",
    "--endpoint",
    report.endpoint,
    "--data-root",
    report.dataRoot,
  ]);
  const browserUrl = new URL(webOutput.trim());
  assert.equal(browserUrl.origin, endpoint.origin);
  const bootstrap = new URLSearchParams(browserUrl.hash.slice(1)).get("bootstrap");
  assert.ok(bootstrap, "web command omitted its fragment bootstrap");
  const exchanged = await fetch(new URL("/v1/browser/session", endpoint), {
    method: "POST",
    headers: { "content-type": "application/json", origin: endpoint.origin },
    body: JSON.stringify({ code: bootstrap }),
  });
  assert.equal(exchanged.status, 200);
  const exchange = await exchanged.json();
  const cookie = exchanged.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
  assert.ok(cookie.includes("agentis_session="), "session exchange omitted its cookie");
  const mutationHeaders = {
    "content-type": "application/json",
    cookie,
    origin: endpoint.origin,
    "x-agentis-csrf": exchange.csrfToken,
  };
  const setup = await fetch(new URL("/v1/browser/setup", endpoint), {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify({ provider: "fake", sources: ["pasted"] }),
  });
  assert.equal(setup.status, 200);

  const command = {
    idempotencyKey: `pack_smoke_${Date.now()}`,
    command: {
      kind: "submit_task",
      coordinator: "mara",
      brief: "pack-smoke",
      outcome: "pack-smoke",
      fixture: "smoke",
      source: {
        kind: "pasted",
        label: "Pack smoke input",
        text: "Materialized read-only pack smoke input.",
        citations: [{ label: "Pack smoke", excerpt: "read-only pack smoke input" }],
      },
    },
  };
  const submitted = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify(command),
  });
  assert.equal(submitted.status, 200);
  const receipt = await submitted.json();
  assert.ok(receipt.accepted && receipt.taskId && receipt.runId, "fake task was not accepted");
  const retried = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: mutationHeaders,
    body: JSON.stringify(command),
  });
  assert.equal(retried.status, 200);
  assert.deepEqual(await retried.json(), { ...receipt, replayed: true, effects: [] });

  let snapshot;
  const deadline = Date.now() + 10000;
  for (;;) {
    const response = await fetch(new URL("/v1/status", endpoint), { headers: { cookie } });
    assert.equal(response.status, 200);
    snapshot = await response.json();
    if (snapshot.runs.find((item) => item.id === receipt.runId)?.status === "succeeded") break;
    assert.ok(Date.now() < deadline, "packaged task did not complete");
    await delay(100);
  }
  const artifact = snapshot.artifacts.find((item) => item.runId === receipt.runId);
  assert.ok(artifact, "packaged task omitted its artifact");
  assert.equal(Object.hasOwn(artifact, "path"), false, "public artifact exposed a private path");
  const metadata = await fetch(new URL(artifact.metadataUrl, endpoint), {
    headers: { cookie },
  });
  assert.equal(metadata.status, 200);
  assert.deepEqual(await metadata.json(), artifact);
  const content = await fetch(new URL(artifact.contentUrl, endpoint), {
    headers: { cookie },
  });
  assert.equal(content.status, 200);
  const bytes = Buffer.from(await content.arrayBuffer());
  assert.equal(bytes.toString(), "# pack-smoke\n");
  assert.equal(bytes.length, artifact.byteSize);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256);
  assert.deepEqual(artifact.citations, [
    { label: "Pack smoke", excerpt: "read-only pack smoke input" },
  ]);
  const refreshed = await (
    await fetch(new URL("/v1/status", endpoint), { headers: { cookie } })
  ).json();
  assert.equal(refreshed.tasks.filter((item) => item.id === receipt.taskId).length, 1);
  assert.equal(refreshed.artifacts.filter((item) => item.id === artifact.id).length, 1);
  assert.equal(
    refreshed.messages.filter((item) => item.taskId === receipt.taskId && item.kind === "request")
      .length,
    1,
  );
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
