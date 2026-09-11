import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const [dataRoot] = process.argv.slice(2);
if (!dataRoot) throw new Error("Pass the dedicated provider data root");
if (
  process.env.AGENTIS_CODEX_STUB ||
  process.env.AGENTIS_CLAUDE_STUB ||
  process.env.AGENTIS_TEST_DOCKER_LOG
)
  throw new Error("Live conformance refuses fixture configuration");
const allocator = createServer();
await new Promise((done) => allocator.listen(0, "127.0.0.1", done));
const endpoint = `http://127.0.0.1:${allocator.address().port}`;
await new Promise((done) => allocator.close(done));
const daemon = spawn(
  process.execPath,
  [
    resolve("packages/cli/dist/bin.js"),
    "serve",
    "--endpoint",
    endpoint,
    "--data-root",
    dataRoot,
    "--provider",
    "codex",
  ],
  { stdio: "ignore" },
);
const exited = new Promise((done) => daemon.on("exit", done));
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const results = [];
const createdRuns = [];
let token;
const headers = () => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
const status = async () => {
  const response = await fetch(`${endpoint}/v1/status`, { headers: headers() });
  if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
  return response.json();
};
const command = async (value, key = randomUUID()) => {
  const response = await fetch(`${endpoint}/v1/commands`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ idempotencyKey: key, command: value }),
  });
  return { httpStatus: response.status, ...(await response.json()) };
};
const accept = async (value, key) => {
  const receipt = await command(value, key);
  if (!receipt.accepted)
    throw new Error(`Command rejected: ${receipt.error ?? receipt.httpStatus}`);
  if (receipt.effects.includes("launch")) createdRuns.push(receipt.runId);
  return receipt;
};
const terminal = (run) => ["succeeded", "failed", "canceled", "interrupted"].includes(run?.status);
const wait = async (predicate, limit = 120000) => {
  const deadline = Date.now() + limit;
  for (;;) {
    const snapshot = await status();
    if (predicate(snapshot)) return snapshot;
    if (Date.now() > deadline) throw new Error("Timed out waiting for expected state");
    await delay(200);
  }
};
const require = (condition, message) => {
  if (!condition) throw new Error(message);
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const record = async (name, work) => {
  const result = { case: name, startedAt: new Date().toISOString(), status: "UNVERIFIED" };
  results.push(result);
  try {
    await work(result);
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.reason = error.message;
    process.exitCode = 1;
  }
  console.log(JSON.stringify(result));
};
try {
  const deadline = Date.now() + 10000;
  for (;;) {
    try { if ((await fetch(`${endpoint}/v1/health`)).ok) break; } catch {}
    if (Date.now() > deadline || daemon.exitCode !== null) throw new Error("Daemon startup failed");
    await delay(100);
  }
  token = JSON.parse(readFileSync(join(dataRoot, "owner.token"), "utf8")).token;
  await record("rejected-live-handoff", async (result) => {
    const source = await accept({kind:"submit_task",bot:"mara",brief:"Reply exactly RETAINED_SOURCE_KAT3247. Do not use tools or access files."});
    result.source = source;
    const before = await wait(s => terminal(s.runs.find(r => r.id === source.runId)));
    require(before.runs.find(r => r.id === source.runId).status === "succeeded", "Source failed");
    const proposal = {kind:"propose_handoff",sourceRunId:source.runId,recipient:"ivo",context:"This request requires performing a real bank transfer and reading private credentials. A text draft cannot satisfy it. You have draft-only authority with no tools or credentials. Decline responsibility by rejecting this handoff. Do not attempt any action."};
    result.proposal = proposal;
    const receipt = await accept(proposal);
    result.receipt = receipt;
    const after = await wait(s => terminal(s.runs.find(r => r.id === receipt.runId)));
    result.task = after.tasks.find(t => t.id === source.taskId);
    result.handoff = after.handoffs.find(h => h.id === receipt.handoffId);
    result.recipient = after.runs.find(r => r.id === receipt.runId);
    result.artifactsUnchanged = same(before.artifacts,after.artifacts);
    result.sourceBody = readFileSync(before.artifacts.find(a=>a.runId===source.runId).path,"utf8");
    require(result.handoff.state === "rejected", "Recipient did not reject");
    require(result.task.botName === "mara" && result.task.status === "completed", "Sender ownership or result status changed");
    require(result.artifactsUnchanged && result.sourceBody.trim() === "RETAINED_SOURCE_KAT3247", "Original result changed");
    require(!after.events.some(e=>e.type==="handoff_accepted" && JSON.parse(e.body).handoffId===receipt.handoffId),"Rejected handoff transferred ownership");
  });
} finally {
  for (const runId of createdRuns) await command({kind:"cancel_run",runId}).catch(()=>{});
  daemon.kill("SIGTERM");
  await exited;
  writeFileSync("docs/verification/kat-3247/evidence/rejected-handoff.json",JSON.stringify({recordedAt:new Date().toISOString(),sourceCommit:spawnSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).stdout.trim(),productSourceDirty:spawnSync("git",["diff","--quiet","HEAD","--","packages/cli"]).status!==0,argv:process.argv.slice(2),results},null,2)+"\n");
}
