import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";

const dataRoot = process.argv[2];
const bot = process.argv[3] ?? "mara";
if (!["mara", "ivo"].includes(bot)) throw new Error("Expected mara or ivo");
if (!dataRoot) throw new Error("Pass a provisioned and authenticated Agentis data root");
const allocator = createServer();
await new Promise(resolve => allocator.listen(0, "127.0.0.1", resolve));
const endpoint = `http://127.0.0.1:${allocator.address().port}`;
await new Promise(resolve => allocator.close(resolve));
const bin = resolve("packages/cli/dist/bin.js");
const daemon = spawn(process.execPath, [bin, "serve", "--endpoint", endpoint,
  "--data-root", dataRoot, "--provider", "codex"], { stdio: ["ignore", "ignore", "pipe"] });
let errorOutput = "";
daemon.stderr.on("data", chunk => { errorOutput += chunk; });
const exited = new Promise(resolve => daemon.on("exit", resolve));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let token;
let receipt;
const command = async command => {
  const response = await fetch(`${endpoint}/v1/commands`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ idempotencyKey: randomUUID(), command }),
  });
  if (!response.ok) throw new Error(`Command HTTP ${response.status}`);
  return response.json();
};
try {
  const startupDeadline = Date.now() + 10000;
  for (;;) {
    try { if ((await fetch(`${endpoint}/v1/health`)).ok) break; } catch {}
    if (Date.now() > startupDeadline || daemon.exitCode !== null) throw new Error("Daemon startup failed");
    await delay(100);
  }
  token = JSON.parse(readFileSync(join(dataRoot, "owner.token"), "utf8")).token;
  receipt = await command({ kind: "submit_task", bot, brief: "Reply exactly KAT3243_CONTAINER_OK. Do not call tools or access files." });
  if (!receipt.accepted) throw new Error(`Submit rejected: ${receipt.error}`);
  const deadline = Date.now() + 180000;
  for (;;) {
    const response = await fetch(`${endpoint}/v1/status`, { headers: { authorization: `Bearer ${token}` } });
    const snapshot = await response.json();
    const run = snapshot.runs.find(run => run.id === receipt.runId);
    if (run && ["succeeded", "failed", "canceled", "interrupted"].includes(run.status)) {
      const artifact = snapshot.artifacts.find(item => item.runId === run.id);
      const body = artifact ? readFileSync(artifact.path, "utf8") : null;
      const report = { timestamp: new Date().toISOString(), receipt, run, artifact, body };
      writeFileSync(`docs/verification/kat-3243/evidence/responses/container-smoke-${bot}.json`, JSON.stringify(report, null, 2) + "\n");
      console.log(JSON.stringify({timestamp:report.timestamp, runId:run.id, status:run.status, bot:run.frozen.bot, artifactHash:artifact?.sha256, body}));
      if (run.status !== "succeeded" || !body?.includes("KAT3243_CONTAINER_OK")) throw new Error("Live container smoke failed");
      if (process.argv.includes("--load")) {
        const beforeHistory = run.providerState.history;
        const loaded = await command({kind: "load_session", runId: run.id});
        if (!loaded.accepted) throw new Error("Session load rejected");
        const loadDeadline = Date.now() + 60000;
        for (;;) {
          const status = await (await fetch(`${endpoint}/v1/status`, {headers: {authorization: `Bearer ${token}`}})).json();
          const after = status.runs.find(item => item.id === run.id);
          if (["succeeded", "failed"].includes(after.providerState.loadStatus)) {
            const loadReport = {timestamp: new Date().toISOString(), runId: run.id, providerSessionId: after.providerSessionId, loadStatus: after.providerState.loadStatus, failure: after.providerState.failure, unchangedHistory: JSON.stringify(beforeHistory) === JSON.stringify(after.providerState.history), artifactCount: status.artifacts.filter(item => item.runId === run.id).length};
            writeFileSync(`docs/verification/kat-3243/evidence/responses/container-load-${bot}.json`, JSON.stringify(loadReport, null, 2) + "\n");
            console.log(JSON.stringify(loadReport));
            if (loadReport.loadStatus !== "succeeded" || !loadReport.unchangedHistory || loadReport.artifactCount !== 1) throw new Error("Session load failed or duplicated output");
            break;
          }
          if (Date.now() > loadDeadline) throw new Error("Session load timed out");
          await delay(200);
        }
      }
      break;
    }
    if (Date.now() > deadline) throw new Error("Live container smoke timed out");
    await delay(500);
  }
} finally {
  if (receipt?.runId && token) {
    await command({ kind: "cancel_run", runId: receipt.runId }).catch(() => {});
  }
  daemon.kill("SIGTERM");
  await exited;
  // Provider logs remain private in the data root. Never print raw authentication diagnostics.
  if (errorOutput && !receipt) console.error("Daemon wrote diagnostics; inspect the private data root.");
}
