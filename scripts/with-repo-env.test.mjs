import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const wrapperPath = fileURLToPath(new URL("./with-repo-env.mjs", import.meta.url));

async function waitForFile(path, timeoutMs = 3000) {
  const start = Date.now();
  while (!existsSync(path)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${path}`);
    }
    await delay(20);
  }
}

async function assertWrapperForwardsSignal(signal) {
  const dir = mkdtempSync(join(tmpdir(), "agentis-wrapper-"));
  const ready = join(dir, "ready");
  const env = { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: "" };
  const childSrc = `
const fs = require("node:fs");
fs.writeFileSync(${JSON.stringify(ready)}, String(process.pid));
setInterval(() => {}, 1000);
`;
  const wrapper = spawn(process.execPath, [wrapperPath, process.execPath, "-e", childSrc], {
    env,
    stdio: ["ignore", "ignore", "pipe"],
  });
  const err = [];
  wrapper.stderr.on("data", (chunk) => {
    err.push(chunk);
  });
  let childPid;
  try {
    await waitForFile(ready);
    childPid = Number(readFileSync(ready, "utf8"));
    wrapper.kill(signal);
    const exit = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("wrapper did not exit")), 3000);
      wrapper.once("exit", (code, received) => {
        clearTimeout(timer);
        resolve({ code, signal: received });
      });
      wrapper.once("error", reject);
    });
    assert.equal(exit.signal, signal, Buffer.concat(err).toString());
    assert.throws(() => process.kill(childPid, 0), { code: "ESRCH" });
  } finally {
    if (wrapper.exitCode === null && wrapper.signalCode === null) {
      wrapper.kill("SIGKILL");
    }
    if (childPid !== undefined) {
      try {
        process.kill(childPid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") {
          throw error;
        }
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test("SIGTERM on the wrapper stops the child", async () => {
  await assertWrapperForwardsSignal("SIGTERM");
});

test("SIGINT on the wrapper stops the child", async () => {
  await assertWrapperForwardsSignal("SIGINT");
});
