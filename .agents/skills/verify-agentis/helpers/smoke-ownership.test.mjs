import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, execFile } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
const exec = promisify(execFile);
const repo = resolve(process.cwd());
const helper = resolve(repo, ".agents/skills/verify-agentis/helpers/smoke.mjs");
const within = async (promise, ms) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("test timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

test("failed readiness never adopts a separate running fixture", { timeout: 60000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "agentis-helper-ownership-"));
  const fixture = spawn(
    process.execPath,
    [resolve(repo, "packages/cli/dist/bin.js"), "verify", "launch"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const ended = new Promise((resolve) => fixture.once("exit", resolve));
  let report;
  try {
    report = await within(
      new Promise((done, fail) => {
        let output = "",
          errors = "";
        fixture.once("error", fail);
        fixture.stderr.on("data", (chunk) => (errors += chunk));
        fixture.once("exit", () => fail(new Error("fixture exited: " + errors)));
        fixture.stdout.on("data", (chunk) => {
          output += chunk;
          try {
            const parsed = JSON.parse(output);
            if (parsed.containerId) done(parsed);
          } catch {}
        });
      }),
      30000,
    );
    const marker = join(report.dataRoot, "unrelated-fixture-marker");
    writeFileSync(marker, "keep this fixture\n");
    const ownerBefore = readFileSync(join(report.dataRoot, "owner.token"));
    const bin = join(root, "packages/cli/dist/bin.js");
    mkdirSync(join(root, "packages/cli/dist"), { recursive: true });
    writeFileSync(bin, "process.stdout.write('malformed readiness'); process.exitCode=1;\n");
    await assert.rejects(
      exec(process.execPath, [helper, join(root, "evidence")], { cwd: root, timeout: 20000 }),
      (error) => error.code === 1,
    );
    const result = JSON.parse(readFileSync(join(root, "evidence/result.json"), "utf8"));
    assert.equal(result.verdict, "FAIL");
    assert.equal(result.observed.launch, undefined);
    assert.equal((await fetch(new URL("/v1/health", report.endpoint))).status, 200);
    assert.equal(readFileSync(marker, "utf8"), "keep this fixture\n");
    assert.deepEqual(readFileSync(join(report.dataRoot, "owner.token")), ownerBefore);
    const { stdout } = await exec("docker", ["inspect", report.containerId]);
    assert.equal(JSON.parse(stdout)[0].State.Running, true);
  } finally {
    fixture.kill("SIGTERM");
    await within(ended, 15000);
    if (report) {
      try {
        const { stdout } = await exec("docker", ["inspect", report.containerId]);
        const [value] = JSON.parse(stdout);
        if (
          value.Id === report.containerId &&
          value.Config.Labels["io.agentis.managed"] === "verify-fixture"
        )
          await exec("docker", ["rm", "-f", report.containerId]);
      } catch (error) {
        if (!/No such (object|container)/i.test(error.stderr ?? "")) throw error;
      }
      rmSync(report.dataRoot, { recursive: true, force: true });
    }
    rmSync(root, { recursive: true, force: true });
  }
});
