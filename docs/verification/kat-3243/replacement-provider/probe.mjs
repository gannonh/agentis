import { query } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
const key = readFileSync('/provider-auth/api-key', 'utf8').trim();
if (!key) throw new Error('Scoped ANTHROPIC_API_KEY required');
const childPids = () => readdirSync('/proc').filter(name => /^\d+$/.test(name)).filter(name => {
  try { return Number(readFileSync(`/proc/${name}/status`, 'utf8').match(/^PPid:\s+(\d+)/m)?.[1]) === process.pid; } catch { return false; }
}).map(Number);
const results = [];
for (const kind of ['question-answer', 'question-cancel', 'empty-tools-draft']) {
  const row = { kind, status: 'FAIL', init: null, callbacks: [], results: [] };
  results.push(row);
  const controller = new AbortController();
  const timer = setTimeout(() => { row.deadlineTriggered = true; controller.abort(); }, 90000);
  let held = false;
  let answered = false;
  let canceled = false;
  let premature = false;
  const stream = query({
    prompt: kind === 'empty-tools-draft'
      ? 'Return exactly KAT3243_DRAFT. Do not use tools.'
      : 'Call AskUserQuestion now to ask which color, with options BLUE and RED. Do not ask in ordinary text. Wait for the answer, then return exactly the selected label.',
    options: {
      model: 'claude-sonnet-5', effort: 'medium', cwd: '/workspace',
      settingSources: [], tools: kind === 'empty-tools-draft' ? [] : ['AskUserQuestion'],
      disallowedTools: ['Agent', 'Task'], permissionMode: 'default', permissionPrompts: 'host',
      mcpServers: {}, agents: {}, maxTurns: 4, maxBudgetUsd: 1,
      abortController: controller,
      env: { PATH: '/usr/local/bin:/usr/bin:/bin', HOME: '/tmp/claude-home',
        ANTHROPIC_API_KEY: key, HTTPS_PROXY: 'http://provider-proxy:3128',
        HTTP_PROXY: 'http://provider-proxy:3128', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' },
      canUseTool: async (name, input, context) => {
        row.callbacks.push({ name, toolUseID: context.toolUseID, at: Date.now() });
        if (name !== 'AskUserQuestion' || !Array.isArray(input.questions) || input.questions.length !== 1)
          return { behavior: 'deny', message: 'Unexpected tool or question shape' };
        const question = input.questions[0];
        if (!question.options?.some(option => option.label === 'BLUE'))
          return { behavior: 'deny', message: 'Expected BLUE option' };
        row.nativePids = childPids();
        held = true;
        row.pendingAt = Date.now();
        await delay(1500);
        row.heldMs = Date.now() - row.pendingAt;
        held = false;
        if (kind === 'question-cancel') {
          canceled = true;
          controller.abort();
          return { behavior: 'deny', message: 'Synthetic owner canceled', interrupt: true };
        }
        answered = true;
        return { behavior: 'allow', updatedInput: { questions: input.questions, answers: { [question.question]: 'BLUE' } } };
      },
    },
  });
  try {
    for await (const message of stream) {
      if (message.type === 'system' && message.subtype === 'init') {
        row.init = { model: message.model, tools: message.tools, apiKeySource: message.apiKeySource, sessionId: message.session_id };
      }
      if (message.type === 'result') {
        if (held) premature = true;
        row.results.push({ subtype: message.subtype, result: message.result, cost: message.total_cost_usd });
      }
      if (message.type === 'user' && message.message?.content?.some?.(part => part.type === 'tool_result') && held)
        premature = true;
    }
  } catch (error) {
    row.errorType = error.name;
    if (!canceled) row.error = 'Query failed; inspect sanitized provider receipt';
  } finally {
    clearTimeout(timer);
    stream.close();
    await delay(300);
    row.nativeChildrenTerminated = (row.nativePids?.length ?? 0) > 0 && row.nativePids.every(pid => !existsSync(`/proc/${pid}`));
  }
  const init = row.init;
  const isolated = init?.model === 'claude-sonnet-5' && init.apiKeySource === 'ANTHROPIC_API_KEY' &&
    Array.isArray(init.tools) && init.tools.every(name => name === 'AskUserQuestion');
  const success = row.results.some(result => result.subtype === 'success');
  const output = row.results.find(result => result.subtype === 'success')?.result?.trim();
  row.status = isolated && !premature && !row.deadlineTriggered && !row.error && (kind === 'empty-tools-draft'
    ? init.tools.length === 0 && output === 'KAT3243_DRAFT'
    : row.callbacks.length === 1 && row.heldMs >= 1400 && (kind === 'question-cancel'
      ? canceled && !success && row.nativeChildrenTerminated : answered && output === 'BLUE')) ? 'PASS' : 'FAIL';
  console.log(JSON.stringify(row));
}
writeFileSync('/workspace/receipt.json', JSON.stringify({ sdk: '0.3.263', model: 'claude-sonnet-5', results }, null, 2));
process.exitCode = results.every(row => row.status === 'PASS') ? 0 : 1;
