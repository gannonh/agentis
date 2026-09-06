import { request, reply, action, stages, initial, transition } from './scenario.js';

const variant = ['A', 'B', 'C'].find(value => value === new URLSearchParams(location.search).get('variant')) || 'A';
const key = `kat3254-research-${variant}`;
const saved = localStorage.getItem(key);
let state;
try { state = saved ? JSON.parse(saved) : initial(); } catch { state = null; }
const valid = state?.version === 2 && Object.hasOwn(stages, state.stage) && Array.isArray(state.messages);
let view = variant === 'C' ? 'tasks' : 'conversation';
let peerOpen = false;
let sourceOpen = '';
let returnFocus = null;
const workspace = document.querySelector('#workspace');
const dialog = document.querySelector('#detail');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const button = (id, label, kind = '') => `<button type="button" data-action="${id}" class="${kind}">${label}</button>`;
const hasArtifact = () => ['review', 'approved', 'unknown', 'complete', 'denied'].includes(state.stage);
const save = () => localStorage.setItem(key, JSON.stringify(state));
const announce = text => { document.querySelector('#announcement').textContent = text; };
const info = () => stages[state.stage];

function status() {
  return `<section class="work-status" aria-label="Current work">
    <div><span class="eyebrow">CURRENT OWNER</span><strong data-probe="owner">${info().owner}</strong></div>
    <div><span class="eyebrow">STATUS</span><strong data-probe="status">${info().status}</strong></div>
    <div><span class="eyebrow">NEXT</span><span data-probe="next">${info().next}</span></div>
  </section>${['failed', 'unknown'].includes(state.stage) ? `<div class="error" role="alert" data-probe="error">${state.stage === 'failed' ? 'Handoff failed. Mara retains ownership. Ivo has not started.' : 'Action outcome unknown. The brief is ready, but completion is unconfirmed. Do not retry.'} ${state.stage === 'unknown' ? button('open-approval', 'Inspect unresolved action') : ''}</div>` : ''}`;
}

function people() {
  return `<aside class="people" aria-label="Persistent teammates"><span class="eyebrow">YOUR TEAM</span>
    <div class="person"><span class="avatar mara">M</span><div><strong>Mara</strong><span>Coordinator · simulated</span></div></div>
    <div class="person"><span class="avatar ivo">I</span><div><strong>Ivo</strong><span>Engineering specialist · simulated</span></div></div>
    <div class="person human"><span class="avatar">A</span><div><strong>Alex</strong><span>Human · workspace owner</span></div></div>
    ${button('open-environment', 'Provider & execution details', 'quiet')}
    <p class="capabilities">Unavailable<br>Computer control · scheduling · remote execution</p>
  </aside>`;
}

function conversation() {
  const messages = variant === 'B' ? state.messages.filter(item => !item.peer) : state.messages;
  const summary = variant === 'B' && state.dispatchCount ? `<div class="coordination-summary"><strong>Mara · coordination summary · simulated</strong><p>Ivo accepted and owns the brief. ${state.stage === 'clarification' ? 'Ivo asks: Should I include all work or only release blockers?' : 'Specialist activity and source evidence stay attached to this task.'}</p></div>` : '';
  return `<section class="conversation" aria-label="${variant === 'A' ? 'Shared team conversation' : variant === 'B' ? 'Conversation with Mara' : 'Linked task conversation'}">
    <div class="section-heading"><div><span class="eyebrow">${variant === 'A' ? 'TEAM ROOM' : variant === 'B' ? 'DIRECT MESSAGE' : 'TASK-1 / CONVERSATION'}</span><h1>${variant === 'A' ? 'Release desk' : variant === 'B' ? 'Mara' : 'Release readiness'}</h1></div><span class="badge">${variant === 'B' ? 'Coordinator' : 'Mara + Ivo + you'}</span></div>
    <div class="messages" aria-label="Conversation history">
      <article class="message"><span class="avatar mara">M</span><div><strong>Mara <small>Coordinator · simulated</small></strong><p>Tell me the outcome you need. I’ll keep the work, decisions, and result here.</p></div></article>
      ${messages.map(item => `<article class="message ${item.peer ? 'peer-message' : ''}"><span class="avatar ${item.from.startsWith('Ivo') ? 'ivo' : 'mara'}">${item.from[0]}</span><div><strong>${escape(item.from)} <small>${item.from === 'Alex' ? 'Human' : 'Simulated'}</small></strong><p>${escape(item.text)}</p></div></article>`).join('')}
      ${summary}
      ${variant === 'A' && state.dispatchCount > 0 ? button('toggle-peers', peerOpen ? 'Collapse routine peer updates' : 'Show routine peer updates', 'quiet') + (peerOpen ? '<p class="routine">Ivo · simulated · Sources S1 and S2 indexed. Mara · simulated · Constraints retained. These updates do not change ownership.</p>' : '') : ''}
    </div>
    ${state.stage === 'welcome' || state.stage === 'clarification' ? `<form id="composer"><label for="message-input">${state.stage === 'welcome' ? 'Give Mara an outcome' : 'Reply to Ivo’s clarification'}</label><textarea id="message-input" rows="3">${state.stage === 'welcome' ? request : reply}</textarea><div class="composer-footer"><small>Fixed research scenario. Use the supplied message.</small><button type="submit">${state.stage === 'welcome' ? 'Send request' : 'Send reply'}</button></div><p id="input-error" role="alert"></p></form>` : `<div class="composer-paused"><span>${info().next}</span><small>Only the fixed scenario is interactive.</small></div>`}
  </section>`;
}

function setup() {
  if (state.stage === 'connect') return `<section class="setup"><span class="eyebrow">FIRST-RUN SETUP · 1 OF 2</span><h2>Choose where this request runs</h2><p>Provider <strong>Sample engine</strong> · fictional, no live model</p><p>Execution <strong>This browser</strong> · simulation only</p><p>No credentials are requested. A real setup must disclose which prompts, files, and tool outputs leave the host, plus eligibility and billing. Those are unverified here.</p>${button('connect', 'Use demonstration environment')}</section>`;
  if (state.stage === 'authority') return `<section class="setup"><span class="eyebrow">FIRST-RUN SETUP · 2 OF 2</span><h2>Allow the source for this task</h2><p>Account <strong>Alex / Northstar demo</strong></p><p>Read <strong>northstar/launchpad</strong> issues and PRs, frozen sources S1 and S2. Duration <strong>this task only</strong>. No repository writes.</p><p>Simulated connection. No GitHub request or account access occurs.</p>${button('grant', 'Allow this source read')}</section>`;
  return '';
}

function work() {
  if (!state.taskCount) return '';
  return `<section class="work-panel" aria-label="Task results and decisions"><span class="eyebrow">TASK-1 / RELEASE READINESS</span><h2>Work & decisions</h2>
    <p>${info().next}</p>
    ${state.stage === 'clarification' && variant === 'C' ? button('conversation', 'Open linked conversation') : ''}
    <div class="result-card"><span class="eyebrow">LATEST RESULT</span><strong data-probe="result">${hasArtifact() ? 'Release brief · v1' : 'No result yet'}</strong><p>${hasArtifact() ? '2 cited sources · Ivo · attempt-1' : 'The brief will stay attached to this work.'}</p>${hasArtifact() ? button('open-artifact', 'Inspect release brief') : ''}</div>
    <div class="result-card"><span class="eyebrow">PENDING ACTION</span><strong data-probe="action">${state.stage === 'unknown' ? 'Create issue · outcome unknown' : state.stage === 'complete' ? 'Create issue · receipt available' : state.stage === 'denied' ? 'Create issue · denied' : state.stage === 'approved' ? 'Create issue · approved, awaiting receipt' : hasArtifact() ? 'Create issue · approval required' : 'No proposed action'}</strong>${hasArtifact() ? button('open-approval', state.stage === 'unknown' ? 'Inspect unresolved action' : 'Review exact action') : ''}</div>
    ${state.stage === 'complete' ? `<div class="receipt" data-probe="receipt"><strong>SIM-LIN-104</strong><p>Simulated completion receipt<br>action-1 v1 · attempt-1<br>One issue · Launch readiness</p>${button('open-receipt', 'Inspect receipt')}</div>` : ''}
    ${['proposed', 'failed', 'clarification'].includes(state.stage) ? `<div class="handoff"><span class="eyebrow">HANDOFF</span><strong>Mara → Ivo</strong><p>${state.stage === 'proposed' ? 'Proposed. Mara retains ownership until Ivo accepts.' : state.stage === 'failed' ? 'Failed. Mara retains ownership; specialist work has not started.' : 'Accepted by Ivo. Ivo owns the brief; Mara coordinates.'}</p></div>` : ''}
  </section>`;
}

function specialist() {
  return `<section class="specialist" aria-label="Visible specialist activity"><div class="section-heading"><h2>Ivo’s activity</h2><span class="badge">Simulated</span></div><p><strong>${state.dispatchCount ? 'Accepted · Ivo owns the brief' : state.stage === 'proposed' ? 'Awaiting acceptance · Mara owns the task' : state.stage === 'failed' ? 'Unavailable · Mara retains ownership' : 'No specialist work started'}</strong></p>${button('toggle-peers', peerOpen ? 'Collapse specialist messages' : 'Open specialist messages', 'quiet')}${peerOpen ? state.messages.filter(item => item.peer).map(item => `<article class="activity-entry"><strong>${escape(item.from)}</strong><p>${escape(item.text)}</p></article>`).join('') : '<p class="muted">Acceptance and blocking states remain visible when routine messages are collapsed.</p>'}</section>`;
}

function render(focus = false) {
  if (!valid) {
    workspace.innerHTML = '<h1>Saved research data cannot be opened</h1><p>It is preserved. Use a new browser profile for a fresh demonstration.</p>';
    return;
  }
  document.querySelector(`[data-variant="${variant}"]`).setAttribute('aria-current', 'page');
  const title = { A: 'A · Shared team room', B: 'B · Manager direct message', C: 'C · Task first' }[variant];
  const main = variant === 'C' ? `<nav class="task-nav" aria-label="Task navigation">${button('tasks', 'Work list', view === 'tasks' ? 'selected' : '')}${!state.taskCount ? button('conversation', 'New conversation') : button('overview', 'Release readiness', view === 'overview' ? 'selected' : '')}${state.taskCount ? button('conversation', 'Linked conversation', view === 'conversation' ? 'selected' : '') : ''}</nav>${view === 'tasks' ? `<section class="task-list"><h1>Your work</h1>${state.taskCount ? `<button data-action="overview" class="task-row"><strong>Release readiness</strong><span>${info().status}</span><span>Owner · ${info().owner}</span></button>${work()}` : `<p>Start with a conversation. No task form or workflow setup.</p>${button('conversation', 'Start a request')}</section>`}` : view === 'conversation' ? `<div class="content-grid">${conversation()}${work()}</div>` : `<div class="task-overview"><h1>Release readiness</h1><p>${request}</p>${button('conversation', 'Open linked conversation')}${work()}</div>`}` : `<div class="content-grid">${conversation()}<aside class="right-rail">${variant === 'B' ? specialist() : ''}${work()}</aside></div>`;
  workspace.innerHTML = `<div class="variant-heading"><span>${title}</span><span class="muted">One fixed scenario · saved separately per alternative</span></div>${status()}${setup()}<div class="workspace-grid">${people()}<div class="main-content">${main}</div></div>`;
  renderLab();
  const history = document.querySelector('.messages');
  if (history) history.scrollTop = history.scrollHeight;
  if (focus) {
    const target = document.querySelector('.setup h2, #message-input, .work-status');
    if (target && target.tagName !== 'TEXTAREA') target.setAttribute('tabindex', '-1');
    target?.focus({ preventScroll: true });
  }
}

function renderLab() {
  const controls = {
    assigned: [['propose', 'Simulate Mara offering handoff']],
    proposed: [['accept', 'Simulate Ivo accepting'], ['fail', 'Simulate handoff failure']],
    failed: [['offer', 'Simulate a new handoff offer']],
    drafting: [['draft', 'Simulate Ivo delivering brief']],
    approved: [['complete', 'Simulate completion receipt'], ['interrupt', 'Simulate interruption before receipt']],
    unknown: [['reconcile', 'Simulate read-only receipt lookup']],
  };
  document.querySelector('#lab').innerHTML = `<details open class="simulation-controls"><summary>Research controls · these stand in for agents and faults</summary><div>${(controls[state.stage] || []).map(([id, label]) => button(id, label, 'lab-button')).join('')}${button('replay', 'Repeat last notification', 'lab-button')}${button('reset', 'Restart this simulated scenario', 'lab-button')}</div><p data-probe="counts">Tasks ${state.taskCount} · specialist starts ${state.dispatchCount} · simulated external effects ${state.effectCount} · duplicate notices suppressed ${state.suppressed}</p><p>Research-only browser memory. No provider, connector, task execution, computer control, or scheduling. Refresh restores the display without executing work.</p></details>`;
}

function openDetail(kind, opener) {
  if (!dialog.open) returnFocus = opener;
  sourceOpen = kind;
  let title, content;
  if (kind === 'artifact') {
    state.inspected = true;
    save();
    title = 'Release brief · v1';
    content = `<p class="badge">Original fictional artifact · simulated output</p><h3>Hold launch for the release smoke check</h3><p>PR #42 has review approval but no passing smoke check [S1]. Issue #17 reports a retry failure without verification evidence [S2]. Restore the smoke check and verify retry behavior before launch.</p><h3>Proposed follow-up</h3><p>${action.title}. Keep all source access read-only.</p><h3>Sources in the frozen snapshot</h3><details><summary>[S1] northstar/launchpad · PR #42</summary><p>“Release smoke check removed during CI cleanup. Review approved. Latest check absent.” Fictional record, captured 2026-09-06.</p></details><details><summary>[S2] northstar/launchpad · Issue #17</summary><p>“Retry after a timeout can stall. No verification run attached.” Fictional record, captured 2026-09-06.</p></details><p class="provenance">Artifact brief-v1 · task-1 · attempt-1 · Ivo<br>Source snapshot demo-2026-09-06 · No live GitHub content</p>`;
  } else if (kind === 'environment') {
    title = 'Provider & execution';
    content = '<dl><dt>Human authority</dt><dd>Alex, workspace owner</dd><dt>Named teammate and role</dt><dd>Mara, coordinator. Ivo, engineering specialist.</dd><dt>Provider</dt><dd>Sample engine, fictional. No live inference, authentication, or billing. Usage unknown.</dd><dt>Execution location</dt><dd>This browser simulation. No local daemon or remote host is running.</dd><dt>Relevant account scope</dt><dd>Fictional northstar/launchpad, read only for this task. Linear destination must be confirmed separately.</dd><dt>Unavailable capabilities</dt><dd>Computer control, scheduling, remote execution, provider switching, and live connections.</dd></dl><p>A real local execution host can still send prompts, files, and tool outputs to a provider. This prototype proves no isolation boundary.</p>';
  } else if (kind === 'receipt') {
    title = 'Completion receipt';
    content = `<p class="receipt">SIM-LIN-104 · SIMULATED</p><dl><dt>Action</dt><dd>action-1 v1 · ${action.operation}</dd><dt>Destination</dt><dd>${action.destination}</dd><dt>Title</dt><dd>${action.title}</dd><dt>Approved by</dt><dd>Alex · human owner · attempt-1</dd><dt>Effect count</dt><dd>1 simulated issue</dd><dt>Result</dt><dd>brief-v1 · task-1 · Ivo</dd></dl><p>No real issue exists. A simulated receipt proves only this presentation.</p>`;
  } else {
    title = state.stage === 'unknown' ? 'Unresolved exact action' : 'Review exact action';
    content = `<p class="badge">${state.stage === 'unknown' ? 'INTERRUPTED · OUTCOME UNKNOWN' : 'SIMULATED ACTION'} · action-1 v1</p><dl><dt>Account</dt><dd>${action.account}</dd><dt>Destination</dt><dd>${action.destination}</dd><dt>Operation</dt><dd>${action.operation}</dd><dt>Exact title</dt><dd>${action.title}</dd><dt>Exact body</dt><dd class="payload">${action.body}</dd><dt>Allowed scope</dt><dd>${action.scope}</dd><dt>Permission duration</dt><dd>${action.duration}</dd><dt>Bound to</dt><dd>task-1 · attempt-1 · action-1 v1 · Alex, human owner</dd></dl>${state.stage === 'review' ? `${!state.inspected ? '<p>Inspect the release brief before deciding.</p>' : ''}${!state.linear ? `<section class="setup"><h3>Connect the destination · first-run setup</h3><p>Confirm Alex / Northstar demo and Launch readiness. This simulates connecting the account and permits requesting an approval; it grants no write.</p>${button('connect-linear', 'Connect this demonstration destination')}</section>` : '<p>Destination connected for this simulation. A separate exact decision is required below.</p>'}<div class="dialog-actions"><button data-action="approve" ${!state.linear || !state.inspected ? 'disabled' : ''}>Approve this exact action once</button>${button('deny', 'Deny action', 'secondary')}</div>` : `<p class="${state.stage === 'unknown' ? 'error' : 'receipt'}">${state.stage === 'unknown' ? 'Approval consumed; receipt missing. No retry is available. A read-only lookup must establish the outcome. The artifact remains available.' : state.stage === 'complete' ? 'Resolved once. Receipt SIM-LIN-104. Reopening or refresh cannot create another issue.' : state.stage === 'denied' ? 'Denied by Alex. No simulated issue was created.' : 'Alex’s decision was recorded. Waiting for a receipt.'}</p>`}`;
  }
  dialog.innerHTML = `<div class="dialog-header"><h2 id="detail-title">${title}</h2>${button('close', 'Close', 'secondary')}</div><div class="dialog-body">${content}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('button').focus();
}

dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll('button:not(:disabled), summary')];
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

dialog.addEventListener('close', () => {
  const target = returnFocus?.isConnected ? returnFocus : document.querySelector(`[data-action="${returnFocus?.dataset.action}"]`);
  target?.focus();
  sourceOpen = '';
});

document.addEventListener('click', event => {
  const target = event.target.closest('button[data-action]');
  if (!target || !valid) return;
  const command = target.dataset.action;
  if (command.startsWith('open-')) return openDetail(command.slice(5), target);
  if (command === 'close') return dialog.close();
  if (['tasks', 'overview', 'conversation'].includes(command)) {
    view = command;
    render();
    const destination = document.querySelector('#message-input') || document.querySelector('.main-content h1');
    if (destination.tagName !== 'TEXTAREA') destination.setAttribute('tabindex', '-1');
    destination.focus();
    return;
  }
  if (command === 'toggle-peers') { peerOpen = !peerOpen; render(); document.querySelector('[data-action="toggle-peers"]')?.focus(); return; }
  if (command === 'reset') { state = initial(); view = variant === 'C' ? 'tasks' : 'conversation'; peerOpen = false; }
  else if (command === 'replay') { state = { ...transition(state, state.lastEvent), suppressed: state.suppressed + 1 }; }
  else if (command === 'connect-linear') {
    state = { ...state, linear: true };
    save();
    openDetail(sourceOpen, target);
    return;
  }
  else { const next = transition(state, command); state = next === state ? state : { ...next, lastEvent: command }; }
  save();
  announce(info().status);
  render(true);
  if (dialog.open) {
    if (command === 'approve' || command === 'deny') dialog.close();
    else openDetail(sourceOpen, target);
  }
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'composer') return;
  event.preventDefault();
  const expected = state.stage === 'welcome' ? request : reply;
  if (document.querySelector('#message-input').value.trim() !== expected) {
    document.querySelector('#input-error').textContent = 'This disposable prototype accepts only the supplied scenario message. Restore it to continue.';
    return;
  }
  state = transition(state, state.stage === 'welcome' ? 'assign' : 'reply');
  if (variant === 'C') view = 'overview';
  save();
  render(true);
  announce(info().status);
});
render();
