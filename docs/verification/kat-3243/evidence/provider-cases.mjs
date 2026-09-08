import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const [dataRoot, bot, ...cases] = process.argv.slice(2);
if (!dataRoot || !['mara', 'ivo'].includes(bot) || !cases.length) throw new Error('Pass data root, mara|ivo, and cases');
const allocator = createServer();
await new Promise(done => allocator.listen(0, '127.0.0.1', done));
const endpoint = `http://127.0.0.1:${allocator.address().port}`;
await new Promise(done => allocator.close(done));
const daemon = spawn(process.execPath, [resolve('packages/cli/dist/bin.js'), 'serve', '--endpoint', endpoint, '--data-root', dataRoot, '--provider', 'codex'], {stdio:'ignore'});
const exited = new Promise(done => daemon.on('exit', done));
const delay = ms => new Promise(done => setTimeout(done, ms));
let token;
const headers = () => ({authorization:`Bearer ${token}`, 'content-type':'application/json'});
const status = async () => {
 const response = await fetch(`${endpoint}/v1/status`, {headers:headers()});
 if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
 return response.json();
};
const command = async value => {
 const response = await fetch(`${endpoint}/v1/commands`, {method:'POST',headers:headers(),body:JSON.stringify({idempotencyKey:randomUUID(),command:value})});
 if (!response.ok) throw new Error(`Command HTTP ${response.status}`);
 const receipt = await response.json();
 if (!receipt.accepted) throw new Error(`Command rejected: ${receipt.errorCode ?? 'rejected'}`);
 return receipt;
};
const terminal = run => ['succeeded','failed','canceled','interrupted'].includes(run?.status);
const wait = async (id, predicate, limit=120000) => {
 const deadline=Date.now()+limit;
 for (;;) {
  const snapshot=await status();
  const run=snapshot.runs.find(item=>item.id===id);
  if(predicate(run,snapshot))return {run,snapshot};
  if(Date.now()>deadline)throw new Error('Case timed out');
  await delay(200);
 }
};
const prompts = {
 allow:'Run exactly node -e "console.log(3243)" once. Request approval. Do not access files or use other tools. Then return the output as text.',
 deny:'Run exactly node -e "console.log(3243)" once. Request approval. If denied, stop without retrying. Do not access files or use other tools.',
 plan:'Use create_plan to propose a one-step plan to draft a greeting. Wait for explicit approval. Do not execute the plan or access files.',
 input:'Use ask_question to ask me to choose Red or Blue. Wait for my structured answer. Do not access files or use other tools. Return the selected color only.',
 cancel:'Draft a detailed comparison of thirty imaginary greeting styles. Do not access files or use tools.',
};
const results=[];
try {
 const deadline=Date.now()+10000;
 for(;;){try{if((await fetch(`${endpoint}/v1/health`)).ok)break;}catch{}if(Date.now()>deadline||daemon.exitCode!==null)throw new Error('Startup failed');await delay(100);}
 token=JSON.parse(readFileSync(join(dataRoot,'owner.token'),'utf8')).token;
 for(const name of cases){
  if(!prompts[name])throw new Error('Unknown case');
  const row={case:name,startedAt:new Date().toISOString(),status:'UNVERIFIED'};
  results.push(row);
  let receipt;
  try{
   receipt=await command({kind:'submit_task',bot,brief:prompts[name],...(name==='plan'||name==='input'?{mode:'plan'}:{})});
   row.runId=receipt.runId;row.taskId=receipt.taskId;row.threadId=receipt.threadId;
   if(name==='cancel'){
    await wait(receipt.runId,run=>run?.status==='running'||terminal(run));
    await command({kind:'cancel_run',runId:receipt.runId});
   }else{
    const waiting=await wait(receipt.runId,run=>['waiting_approval','waiting_input'].includes(run?.status)||terminal(run));
    if(terminal(waiting.run))throw new Error('Provider completed without required blocking request');
    row.pendingPrompt=waiting.run.providerState.pendingPrompt;
    if(name==='input')throw new Error('Structured input observed; answer requires provider payload mapping');
    const approval=waiting.snapshot.pending.find(item=>item.runId===receipt.runId&&item.approvalId);
    if(!approval)throw new Error('Expected approval missing');
    row.approvalId=approval.approvalId;
    await command({kind:'resolve_approval',approvalId:approval.approvalId,decision:name==='allow'?'allowed':'denied'});
   }
   const done=await wait(receipt.runId,terminal);
   row.runStatus=done.run.status;row.providerSessionId=done.run.providerSessionId;
   row.failure=done.run.providerState.failure;
   const artifact=done.snapshot.artifacts.find(item=>item.runId===receipt.runId);
   row.artifact=artifact??null;
   if(artifact)row.body=readFileSync(artifact.path,'utf8');
   const expected=name==='allow'?'succeeded':name==='cancel'?'canceled':'failed';
   if(done.run.status!==expected)throw new Error('Unexpected terminal state');
   await delay(500);
   const containers=spawnSync('docker',['ps','--format','{{.Names}}'],{encoding:'utf8'});
   row.cleaned=containers.status===0&&!containers.stdout.includes(receipt.runId);
   if(!row.cleaned)throw new Error('Run containers remain active');
   row.status='PASS';
  }catch(error){row.status='FAIL';row.reason=error.message;process.exitCode=1;}
  finally{if(receipt)await command({kind:'cancel_run',runId:receipt.runId}).catch(()=>{});}
  console.log(JSON.stringify(row));
 }
}finally{
 daemon.kill('SIGTERM');await exited;
 writeFileSync(`docs/verification/kat-3243/evidence/responses/provider-cases-${bot}.json`,JSON.stringify({recordedAt:new Date().toISOString(),bot,results},null,2)+'\n');
}
