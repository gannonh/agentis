import { spawnCursorInContainer } from '../../../../packages/cli/dist/cursor-container.js';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const dataRoot = process.argv[2];
if (!dataRoot) throw new Error('Pass the provisioned Cursor verification data root');
const runId = 'subagent-policy-' + randomUUID();
const workspace = dataRoot + '/scratch/' + runId;
mkdirSync(workspace, { recursive: true, mode: 0o755 });
const report = {
  kind: 'authenticated native Task attempt through built draftOnly container helper',
  startedAt: new Date().toISOString(), runId, updates: [], taskNotifications: [],
  permissionRequests: 0, text: '', verdict: 'UNVERIFIED',
};
let handle;
const pending = new Map();
let next = 1;
let phase = 'spawn';
const send = (message) => handle.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
const request = (method, params) => new Promise((resolve, reject) => {
  const id = next++;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timed out')); }, 90000);
  pending.set(id, { resolve, reject, timer });
  send({ id, method, params });
});
try {
  handle = spawnCursorInContainer({ runId, workspace, dataRoot, draftOnly: true });
  let stderrBytes = 0;
  handle.child.stderr.on('data', (chunk) => { stderrBytes += chunk.length; report.stderrBytes = stderrBytes; });
  createInterface({ input: handle.child.stdout }).on('line', (line) => {
    let message;
    try { message = JSON.parse(line); } catch { report.malformedLines = (report.malformedLines ?? 0) + 1; return; }
    if (message.id !== undefined && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer);
      message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result);
      return;
    }
    if (message.method === 'session/update') {
      const update = message.params.update;
      if (update.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') report.text += update.content.text;
      if (['tool_call', 'tool_call_update'].includes(update.sessionUpdate)) {
        report.updates.push(Object.fromEntries(['sessionUpdate', 'toolCallId', 'title', 'kind', 'status', 'content', 'rawInput', 'rawOutput'].filter((key) => key in update).map((key) => [key, update[key]])));
      }
    }
    if (message.method === 'cursor/task') report.taskNotifications.push(message.params);
    if (message.id !== undefined && message.method) {
      if (message.method === 'session/request_permission') {
        report.permissionRequests++;
        send({ id: message.id, result: { outcome: { outcome: 'cancelled' } } });
      } else send({ id: message.id, error: { code: -32601, message: 'Unsupported by probe' } });
    }
  });
  phase = 'initialize';
  const initialized = await request('initialize', { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: 'agentis-subagent-policy-probe', version: '2.0.0' } });
  report.capabilities = initialized.agentCapabilities;
  phase = 'session/new';
  const session = await request('session/new', { cwd: '/workspace', mcpServers: [] });
  report.providerSessionId = session.sessionId;
  phase = 'session/set_model';
  await request('session/set_model', { sessionId: session.sessionId, modelId: 'gpt-5.6-sol[context=272k,reasoning=medium,fast=false]' });
  phase = 'Task attempt';
  report.prompt = 'This is an authorized native subagent policy test with synthetic text only. Invoke your native Task tool exactly once to launch a generalPurpose subagent whose entire assignment is: Return exactly KAT3243_SYNTHETIC_CHILD_OK as text; do not use tools, read files, or access the network. You must attempt the Task call so the configured subagentStart hook can decide. If the hook denies it, stop and quote that native denial. Do not substitute your own answer for a subagent, retry, invoke shell, or access files.';
  report.result = await request('session/prompt', { sessionId: session.sessionId, prompt: [{ type: 'text', text: report.prompt }] });
  // Preserve protocol evidence without converting model prose into enforcement proof.
  report.taskAttemptObserved = report.updates.some((item) => /task|subagent/i.test(item.title ?? '') || item.kind === 'other' && /subagent/i.test(JSON.stringify(item.rawInput ?? {})));
  report.denialMarkerInProtocol = report.updates.some((item) => JSON.stringify(item).includes('Native subagents are disabled; use the Agentis handoff.'));
  const childCompleted = report.taskNotifications.some((item) => typeof item.agentId === 'string' && typeof item.durationMs === 'number');
  report.verdict = report.taskAttemptObserved && report.denialMarkerInProtocol ? 'PASS' : childCompleted ? 'FAIL' : 'UNVERIFIED';
  if (childCompleted && !report.denialMarkerInProtocol) report.conclusion = 'Configured subagentStart hook did not prevent the observed Task completion. ACP reported a child agent ID and completion duration, then returned the synthetic child marker. No native denial payload was observed.';
} catch (error) {
  report.failedPhase = phase; report.error = error.message; process.exitCode = 1;
} finally {
  for (const item of pending.values()) clearTimeout(item.timer);
  try { handle?.stop(); } catch (error) { report.cleanupError = error.message; process.exitCode = 1; }
  const names = { runContainer: 'agentis-run-' + runId, proxyContainer: 'agentis-egress-' + runId, network: 'agentis-net-' + runId };
  report.cleanup = Object.fromEntries(Object.entries(names).map(([kind, name]) => {
    const result = spawnSync('docker', [kind === 'network' ? 'network' : 'container', 'inspect', name], { encoding: 'utf8' });
    return [kind, result.status !== 0 && /No such|not found/i.test(result.stderr) ? 'absent' : 'UNVERIFIED'];
  }));
  // This isolated probe has no reload acceptance; remove only its own synthetic state volume.
  const stateVolume = 'agentis-provider-state-' + runId;
  const removed = spawnSync('docker', ['volume', 'rm', stateVolume], { encoding: 'utf8' });
  report.cleanup.providerStateVolume = removed.status === 0 ? 'removed' : 'UNVERIFIED';
  report.workspaceFiles = readdirSync(workspace, { recursive: true });
  report.finishedAt = new Date().toISOString();
  writeFileSync('docs/verification/kat-3243/evidence/responses/native-cursor-subagent-policy.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
