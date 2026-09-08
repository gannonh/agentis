import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const dataRoot = process.argv[2];
if (!dataRoot) throw new Error('Pass the verification data root');
const prior = JSON.parse(readFileSync('docs/verification/kat-3243/evidence/responses/native-cursor-subagent-policy.json', 'utf8'));
// Load vendor modules in memory without invoking the CLI entry point or inference.
const script = `
const fs=require('node:fs');const Module=require('node:module');
const p='/opt/cursor/index.js';let source=fs.readFileSync(p,'utf8');
const entry='var __webpack_exports__=__webpack_require__("./src/main.tsx")';
if(!source.includes(entry))throw Error('vendor startup changed');
source=source.replace(entry,'module.exports=__webpack_require__');
const moduleInstance=new Module(p,module);moduleInstance.filename=p;moduleInstance.paths=Module._nodeModulePaths('/opt/cursor');moduleInstance._compile(source,p);
(async()=>{const vendorRequire=moduleInstance.exports;
for(const file of fs.readdirSync('/opt/cursor').filter(name=>/^\\d+\\.index\\.js$/.test(name)))Object.assign(vendorRequire.m,require('/opt/cursor/'+file).modules);
const hooks=vendorRequire('../hooks-exec/dist/index.js');
const config=await new hooks.gY(new hooks.IF,{projectConfigPath:'/workspace/.cursor/hooks.json'}).load();
console.log(JSON.stringify({config,configuredSteps:[...new hooks.HW(config).getConfiguredSteps()]}));
})().catch(error=>{console.error(error.message);process.exitCode=1});
`;
const result = spawnSync('docker', ['run', '--rm', '-i', '--network', 'none', '--read-only', '--user=10001:10001', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--mount', `type=bind,src=${dataRoot}/scratch/${prior.runId},dst=/workspace,readonly`, '--workdir', '/workspace', '--entrypoint', 'node', 'agentis-cursor:2026.09.02-c22c1a3'], { input: script, encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || result.stdout);
const report = { kind: 'native pinned Linux hook config loader; no authentication or inference', runId: prior.runId, result: JSON.parse(result.stdout), checkedAt: new Date().toISOString() };
writeFileSync('docs/verification/kat-3243/evidence/responses/native-cursor-hook-config.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
