import assert from "node:assert/strict";
import {spawn, execFile} from "node:child_process";
import {writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {promisify} from "node:util";
const exec = promisify(execFile);
const [evidenceFile] = process.argv.slice(2);
if(!evidenceFile) throw new Error("Pass a new evidence file");
const delay = ms => new Promise(done => setTimeout(done,ms));
const results=[];
const bin=resolve("packages/cli/dist/bin.js");
for(const mode of ["launcher-killed","container-stopped"]){
 const child=spawn(process.execPath,[bin,"verify","launch"],{stdio:["ignore","pipe","pipe"]});
 const exited=new Promise(done=>child.once("exit",(code,signal)=>done({code,signal})));
 let report;
 try{
  report=await new Promise((done,fail)=>{
   let stdout="",stderr="";
   const timer=setTimeout(()=>fail(new Error("Startup timeout: "+stderr)),30000);
   child.once("error",error=>{clearTimeout(timer);fail(error)});
   child.stderr.on("data",chunk=>stderr+=chunk);
   child.stdout.on("data",chunk=>{
    stdout+=chunk;
    try{const value=JSON.parse(stdout);if(value.containerId){clearTimeout(timer);done(value)}}catch{}
   });
   child.once("exit",()=>{clearTimeout(timer);fail(new Error("Exited before ready: "+stderr))});
  });
  assert.equal((await fetch(new URL("/v1/health",report.endpoint))).status,200);
  if(mode==="launcher-killed")child.kill("SIGKILL");
  else await exec("docker",["stop","--time","5",report.containerId]);
  const outcome=await Promise.race([exited,delay(15000).then(()=>{throw new Error("Launcher stayed alive")})]);
  const deadline=Date.now()+10000;
  for(;;){
   try{await exec("docker",["inspect",report.containerId]);}
   catch(error){assert.match(error.stderr,/No such (object|container)/i);break;}
   assert.ok(Date.now()<deadline,"Fixture container survived launcher loss");
   await delay(100);
  }
  await assert.rejects(fetch(new URL("/v1/health",report.endpoint),{signal:AbortSignal.timeout(2000)}));
  results.push({case:mode,status:"PASS",report,exit:outcome,containerAbsent:true,endpointClosed:true});
 }catch(error){results.push({case:mode,status:"FAIL",report,reason:error.message});process.exitCode=1;}
 finally{
  if(child.exitCode===null&&child.signalCode===null){child.kill("SIGTERM");await Promise.race([exited,delay(15000)]);}
  if(report){
   try{
    const {stdout}=await exec("docker",["inspect",report.containerId]);
    const [value]=JSON.parse(stdout);
    if(value.Id===report.containerId&&value.Config.Labels["io.agentis.managed"]==="verify-fixture") await exec("docker",["rm","-f",report.containerId]);
   }catch{}
  }
 }
}
try{
 await exec(process.execPath,[bin,"verify","launch"],{env:{...process.env,PATH:"/nonexistent"},timeout:10000});
 throw new Error("Missing Docker unexpectedly launched a fixture");
}catch(error){
 const pass=/ENOENT/.test(error.stderr??"");
 results.push({case:"missing-docker-fails-closed",status:pass?"PASS":"FAIL",exitCode:error.code,reason:pass?"Docker executable missing; no host fallback":error.message});
 if(!pass)process.exitCode=1;
}
const {stdout:sha}=await exec("git",["rev-parse","HEAD"]);
writeFileSync(evidenceFile,JSON.stringify({recordedAt:new Date().toISOString(),sourceCommit:sha.trim(),results},null,2)+"\n");
console.log(JSON.stringify(results.map(({case:name,status,reason})=>({case:name,status,reason}))));
