import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";

const [dataRoot, evidenceFile] = process.argv.slice(2);
if (!dataRoot || !evidenceFile) throw new Error("Pass a fresh dedicated root and new evidence file");
const allocator = createServer();
await new Promise(r => allocator.listen(0, "127.0.0.1", r));
const endpoint = `http://127.0.0.1:${allocator.address().port}`;
await new Promise(r => allocator.close(r));
const argv = [resolve("packages/cli/dist/bin.js"), "serve", "--endpoint", endpoint, "--data-root", dataRoot, "--provider", "fake", "--execution-boundary", "unverified-host-scratch"];
let daemon;
let exited;
let token;
const evidence = { recordedAt: new Date().toISOString(), sourceCommit: spawnSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).stdout.trim(), provider:"fake", boundary:"unverified-host-scratch", dataRoot, argv, status:"UNVERIFIED" };
const headers = () => ({authorization:`Bearer ${token}`, "content-type":"application/json"});
const status = async () => (await fetch(endpoint + "/v1/status", {headers:headers()})).json();
const require = (condition, message) => { if (!condition) throw new Error(message); };
const command = async command => {
  const response = await fetch(endpoint + "/v1/commands", {method:"POST",headers:headers(),body:JSON.stringify({idempotencyKey:randomUUID(),command})});
  const receipt = await response.json();
  require(response.ok && receipt.accepted, "Command rejected");
  return receipt;
};
const start = async () => {
  daemon = spawn(process.execPath, argv, {stdio:"ignore"});
  exited = new Promise(r => daemon.on("exit", r));
  for (let attempt=0; attempt<100; attempt++) {
    try { if ((await fetch(endpoint+"/v1/health")).ok) {token=JSON.parse(readFileSync(join(dataRoot,"owner.token"),"utf8")).token;return;} } catch {}
    require(daemon.exitCode===null,"Daemon exited during startup");
    await new Promise(r=>setTimeout(r,100));
  }
  throw new Error("Daemon startup timeout");
};
const events = async (cursor, lastSeq) => {
  const response = await fetch(`${endpoint}/v1/events?cursor=${cursor}`, {headers:headers(),signal:AbortSignal.timeout(5000)});
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let text="";
  try {
    for (;;) {
      const {done,value}=await reader.read();
      if(done)break;
      text+=decoder.decode(value,{stream:true});
      const ids=[...text.matchAll(/^id: (\d+)$/gm)].map(m=>Number(m[1]));
      if(ids.includes(lastSeq)) return {text,ids};
    }
    throw new Error("SSE ended before expected sequence");
  } finally {await reader.cancel();}
};
try {
  await start();
  const completed=await command({kind:"submit_task",brief:"kat3247 retained transcript",fixture:"smoke"});
  const before=await status();
  const last=before.events.at(-1).seq;
  evidence.initialStream=await events(0,last);
  const waiting=await command({kind:"submit_task",brief:"kat3247 interrupted input",fixture:"input"});
  const afterSubmit=await status();
  evidence.reconnectedStream=await events(last,afterSubmit.events.at(-1).seq);
  const expected=afterSubmit.events.filter(e=>e.seq>last).map(e=>e.seq);
  require(JSON.stringify(evidence.reconnectedStream.ids)===JSON.stringify(expected),"Reconnect duplicated or omitted events");
  require(afterSubmit.runs.find(r=>r.id===waiting.runId).status==="waiting_input","Fixture did not wait");
  evidence.beforeCrash={completed,waiting,messages:afterSubmit.messages,artifacts:afterSubmit.artifacts,runs:afterSubmit.runs};
  daemon.kill("SIGKILL");
  await exited;
  await start();
  const restored=await status();
  evidence.afterRestart={messages:restored.messages,artifacts:restored.artifacts,runs:restored.runs,events:restored.events};
  require(restored.runs.find(r=>r.id===waiting.runId).status==="interrupted","Interrupted fixture resumed or lost state");
  require(restored.runs.length===afterSubmit.runs.length,"Restart created another attempt");
  require(JSON.stringify(restored.messages)===JSON.stringify(afterSubmit.messages),"Transcript changed on restart");
  require(JSON.stringify(restored.artifacts)===JSON.stringify(afterSubmit.artifacts),"Artifacts changed on restart");
  evidence.status="PASS";
} catch(error) {evidence.status="FAIL";evidence.reason=error.message;process.exitCode=1;}
finally {
  if(daemon?.exitCode===null){daemon.kill("SIGTERM");await exited;}
  writeFileSync(evidenceFile,JSON.stringify(evidence,null,2)+"\n");
  console.log(JSON.stringify({status:evidence.status,reason:evidence.reason??null}));
}
