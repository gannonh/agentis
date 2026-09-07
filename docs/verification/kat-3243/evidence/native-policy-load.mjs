import { spawnCursorInContainer } from '../../../../packages/cli/dist/cursor-container.js';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
const dataRoot=process.argv[2];
if (!dataRoot) throw new Error('Pass the provisioned Cursor verification data root');
const prior=JSON.parse(readFileSync('docs/verification/kat-3243/evidence/responses/native-cursor-policy.json','utf8'));
const runId=prior.runId;
const workspace=dataRoot+'/scratch/'+runId;
mkdirSync(workspace,{recursive:true,mode:0o755});
const handle=spawnCursorInContainer({runId,workspace,dataRoot,draftOnly:true,loadSession:true});
const pending=new Map();let next=1;let phase='initialize';let text='';
const report={kind:'authenticated native policy probe through product container helper; not full handoff acceptance',startedAt:new Date().toISOString(),runId,cases:[],updates:[],permissionRequests:0};
let stderrBytes=0;handle.child.stderr.on('data',b=>stderrBytes+=b.length);
const send=m=>handle.child.stdin.write(JSON.stringify({jsonrpc:'2.0',...m})+'\n');
createInterface({input:handle.child.stdout}).on('line',line=>{
 let m;try{m=JSON.parse(line)}catch{return;}
 if(m.id!==undefined&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);return;}
 if(m.method==='session/update'){
  const u=m.params.update;
  if(u.sessionUpdate==='agent_message_chunk'&&u.content?.type==='text')text+=u.content.text;
  if(['tool_call','tool_call_update'].includes(u.sessionUpdate))report.updates.push({phase,update:u});
 }
 if(m.id!==undefined&&m.method){
  if(m.method==='session/request_permission'){report.permissionRequests++;send({id:m.id,result:{outcome:{outcome:'cancelled'}}});}
  else send({id:m.id,error:{code:-32601,message:'Unsupported by probe'}});
 }
});
const request=(method,params)=>new Promise((resolve,reject)=>{const id=next++;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('request timed out'))},60000);pending.set(id,{resolve,reject,timer});send({id,method,params});});
try{
 const initialized=await request('initialize',{protocolVersion:1,clientCapabilities:{},clientInfo:{name:'agentis-policy-probe',version:'2.0.0'}});report.capabilities=initialized.agentCapabilities;
 phase='session/load';await request('session/load',{sessionId:prior.providerSessionId,cwd:'/workspace',mcpServers:[]});report.providerSessionId=prior.providerSessionId;report.loadStatus='succeeded';report.replayedMarker=text.includes('KAT3243_POLICY_OK');
}catch(error){report.failedPhase=phase;report.error=error.message;process.exitCode=1;}
finally{for(const p of pending.values())clearTimeout(p.timer);handle.stop();report.stderrBytes=stderrBytes;report.forbiddenFileExists=existsSync(workspace+'/forbidden.txt');writeFileSync('docs/verification/kat-3243/evidence/responses/native-cursor-policy-load.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({loadStatus:report.loadStatus,replayedMarker:report.replayedMarker,failedPhase:report.failedPhase,error:report.error,permissionRequests:report.permissionRequests,forbiddenFileExists:report.forbiddenFileExists}));}
