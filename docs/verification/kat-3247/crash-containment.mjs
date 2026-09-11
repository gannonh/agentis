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
  await record("crash-and-unknown-provider-containment", async (result) => {
    const brief='Run exactly node -e "console.log(3243)" once. Request approval. Do not access files or use other tools. Then return the output as text.';
    const mara=await accept({kind:"submit_task",bot:"mara",brief});
    await wait(s=>s.runs.find(r=>r.id===mara.runId)?.status==="waiting_approval");
    const ivo=await accept({kind:"submit_task",bot:"ivo",brief});
    const before=await wait(s=>s.runs.find(r=>r.id===ivo.runId)?.status==="waiting_approval");
    result.before=before.runs.filter(r=>[mara.runId,ivo.runId].includes(r.id));
    const unknown=spawnSync(process.execPath,[resolve("packages/cli/dist/bin.js"),"serve","--endpoint",endpoint,"--provider","unknown-kat3247","--data-root",join(dataRoot,"unknown-provider")],{encoding:"utf8",timeout:10000});
    result.unknownProvider={exitCode:unknown.status,stdout:unknown.stdout,stderr:unknown.stderr,error:unknown.error?.message??null};
    require(unknown.status!==0 && !unknown.error && unknown.stderr.includes("unknown-kat3247") && !unknown.stderr.includes("no port is guessed"),"Unknown provider was not rejected promptly");
    require((await fetch(`${endpoint}/v1/health`)).ok,"Unknown provider took down daemon");
    const container=`agentis-run-${ivo.runId}`;
    const inspected=spawnSync("docker",["inspect",container,"--format","{{json .Config.Labels}}"],{encoding:"utf8"});
    require(inspected.status===0 && inspected.stdout.includes(ivo.runId),"Container identity mismatch");
    result.crashTarget={container,labels:JSON.parse(inspected.stdout)};
    const killed=spawnSync("docker",["kill","--signal","KILL",container],{encoding:"utf8"});
    result.kill={exitCode:killed.status,stdout:killed.stdout,stderr:killed.stderr};
    require(killed.status===0,"Could not crash owned provider");
    const after=await wait(s=>terminal(s.runs.find(r=>r.id===ivo.runId)));
    result.crashedRun=after.runs.find(r=>r.id===ivo.runId);
    result.peerAfterCrash=after.runs.find(r=>r.id===mara.runId);
    require(result.crashedRun.status==="failed","Crashed provider not failed");
    require(result.peerAfterCrash.status==="waiting_approval","Peer lost its pending approval");
    const approval=after.pending.find(p=>p.runId===mara.runId && p.state==="pending" && p.approvalId);
    await accept({kind:"resolve_approval",approvalId:approval.approvalId,decision:"allowed"});
    const done=await wait(s=>terminal(s.runs.find(r=>r.id===mara.runId)));
    result.peerFinal=done.runs.find(r=>r.id===mara.runId);
    result.artifact=done.artifacts.find(a=>a.runId===mara.runId);
    require(result.peerFinal.status==="succeeded" && result.artifact,"Peer did not complete after crash");
    result.body=readFileSync(result.artifact.path,"utf8");
    require(result.body.includes("3243"),"Peer output missing");
    require((await fetch(`${endpoint}/v1/health`)).ok,"Daemon unhealthy after crash");
  });
} finally {
  for (const runId of createdRuns) await command({kind:"cancel_run",runId}).catch(()=>{});
  daemon.kill("SIGTERM");
  await exited;
  writeFileSync("docs/verification/kat-3247/evidence/crash-containment.json",JSON.stringify({recordedAt:new Date().toISOString(),sourceCommit:spawnSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).stdout.trim(),productSourceDirty:spawnSync("git",["diff","--quiet","HEAD","--","packages/cli"]).status!==0,argv:process.argv.slice(2),results},null,2)+"\n");
}
