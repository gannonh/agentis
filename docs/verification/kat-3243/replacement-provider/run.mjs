import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync, mkdirSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { docker, squidConfig, prepareProviderNetwork, removeProviderNetwork } from '../../../../packages/cli/dist/provider.js';
import { spawnInRunContainer } from '../../../../packages/cli/dist/container.js';
const directory = dirname(fileURLToPath(import.meta.url));
const image = 'agentis-claude-feasibility:0.3.263';
if (process.argv.includes('--build')) {
  const context = mkdtempSync(join(tmpdir(), 'agentis-claude-build-'));
  copyFileSync(join(directory, 'probe.mjs'), join(context, 'probe.mjs'));
  writeFileSync(join(context, 'squid.conf'), squidConfig.replace('auth.openai.com chatgpt.com', 'api.anthropic.com'));
  writeFileSync(join(context, 'Dockerfile'), `FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e
RUN apt-get update && apt-get install -y --no-install-recommends squid=5.7-2+deb12u6 ca-certificates git && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/probe
RUN npm init -y && npm install --save-exact @anthropic-ai/claude-agent-sdk@0.3.263
COPY probe.mjs /opt/probe/probe.mjs
COPY squid.conf /etc/squid/squid.conf
RUN mkdir /provider-auth && chown 10001:10001 /provider-auth
USER 10001:10001
`);
  docker(['build', '--platform', 'linux/arm64', '-t', image, context]);
  console.log(docker(['run', '--rm', '--network', 'none', '--read-only', image, 'npm', 'ls', '--depth=0']));
  process.exit(0);
}
const key = process.env.ANTHROPIC_API_KEY?.trim();
if (!key) {
  const receipt = { status: 'BLOCKED', reason: 'Missing scoped funded ANTHROPIC_API_KEY', inferenceStarted: false, recordedAt: new Date().toISOString() };
  writeFileSync(join(directory, 'preflight.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt));
  process.exit(2);
}
const runId = `claude-feasibility-${randomUUID()}`;
const workspace = join(directory, 'runs', runId);
mkdirSync(workspace, { recursive: true, mode: 0o777 });
chmodSync(workspace, 0o777);
const volume = `agentis-auth-${runId}`;
docker(['volume', 'create', volume]);
let handle;
let timeout;
try {
  const imported = spawnSync('docker', ['run', '--rm', '-i', '--network', 'none', '--read-only', '--user=10001:10001', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--mount', `type=volume,src=${volume},dst=/provider-auth`, image, 'sh', '-ec', 'umask 077; cat > /provider-auth/api-key'], { input: key, encoding: 'utf8' });
  if (imported.status !== 0) throw new Error('Scoped credential import failed');
  const network = prepareProviderNetwork(runId, image);
  handle = spawnInRunContainer({ runId, workspace, image, network, providerAuthVolume: volume, command: ['node', '/opt/probe/probe.mjs'] });

  let output = '';
  handle.child.stdout.on('data', chunk => { output += chunk; });
  handle.child.stderr.resume();
  const code = await new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(new Error('Feasibility timeout')), 300000);
    handle.child.once('exit', resolve);
    handle.child.once('error', reject);
  });
  clearTimeout(timeout);
  writeFileSync(join(workspace, 'stdout.jsonl'), output);
  console.log(JSON.stringify({ runId, code, workspace, imageId: docker(['image', 'inspect', '--format', '{{.Id}}', image]), receipt: JSON.parse(readFileSync(join(workspace, 'receipt.json'), 'utf8')) }));
  process.exitCode = code === 0 ? 0 : 1;
} finally {
  clearTimeout(timeout);
  const errors = [];
  for (const cleanup of [() => handle?.stop(), () => removeProviderNetwork(runId), () => docker(['volume', 'rm', volume])]) {
    try { cleanup(); } catch (error) { errors.push(error.message); }
  }
  if (errors.length) throw new Error(`Cleanup failed: ${errors.join('; ')}`);
}
