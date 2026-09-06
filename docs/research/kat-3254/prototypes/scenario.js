export const request = 'Mara, review northstar/launchpad and write a cited release brief. Propose one follow-up in Linear, but ask before creating it.';
export const reply = 'Only release blockers. Keep the follow-up in the Launch readiness project.';
export const action = {
  id: 'action-1', revision: 'v1', task: 'task-1', run: 'attempt-1',
  account: 'Alex / Northstar demo', destination: 'Linear / Northstar / Launch readiness',
  operation: 'Create one issue', title: 'Restore the release smoke check',
  body: 'PR #42 is approved but has no passing release smoke check [S1]. Restore the check and attach a passing run before launch. Issue #17 has no retry evidence [S2]. Verify it in the same check.',
  scope: 'One issue in Launch readiness. No repository writes.',
  duration: 'This exact action once for attempt-1. No standing permission. The recorded approval is consumed by its one action.',
};
export const stages = {
  welcome: { owner: 'Unassigned', status: 'Ready for your first request', next: 'Send your request' },
  connect: { owner: 'Unassigned', status: 'Waiting for connection', next: 'Choose the demonstration environment' },
  authority: { owner: 'Unassigned', status: 'Waiting for source permission', next: 'Allow the selected source read' },
  assigned: { owner: 'Mara', status: 'Assignment accepted', next: 'Mara is preparing a handoff' },
  proposed: { owner: 'Mara', status: 'Handoff pending acceptance', next: 'Ivo must accept before ownership changes' },
  failed: { owner: 'Mara', status: 'Handoff failed', next: 'Mara retains ownership; Ivo is unavailable' },
  clarification: { owner: 'Ivo', status: 'Waiting for your answer', next: 'Clarify the release scope' },
  drafting: { owner: 'Ivo', status: 'Preparing release brief', next: 'Ivo is preparing the artifact' },
  review: { owner: 'Ivo', status: 'Brief ready for inspection', next: 'Inspect the brief and proposed action' },
  approved: { owner: 'Ivo', status: 'Approval recorded', next: 'Waiting for an action receipt' },
  unknown: { owner: 'Ivo', status: 'Interrupted · action outcome unknown', next: 'Inspect the unresolved action. Do not repeat it.' },
  complete: { owner: 'Ivo', status: 'Completed · simulated receipt saved', next: 'Inspect the finished brief and receipt' },
  denied: { owner: 'Ivo', status: 'Action denied · brief retained', next: 'The brief is available. No issue was created.' },
};
export const initial = () => ({ version: 2, stage: 'connect', linear: false, inspected: false, taskCount: 0, dispatchCount: 0, effectCount: 0, messages: [], suppressed: 0 });

const message = (state, id, from, text, peer = false) => ({ ...state, messages: [...state.messages, { id, from, text, peer }] });
export function transition(state, event) {
  const moves = {
    'welcome:assign': ['assigned', 'assignment', 'Alex', request],
    'connect:connect': ['authority', 'environment', 'Mara', 'Demonstration environment selected. Provider is Sample engine, a fictional provider. Execution location is this browser simulation. No provider session exists.'],
    'authority:grant': ['welcome', 'source-authority', 'Mara', 'Source permission recorded for your first task. Once you send your request, I can read the fictional northstar/launchpad snapshot for that task only. I will ask before any Linear write.'],
    'assigned:propose': ['proposed', 'proposal', 'Mara → Ivo', 'Please prepare a cited release brief from sources S1 and S2. Read only; one proposed follow-up, no writes. I retain ownership until you accept.', true],
    'proposed:accept': ['clarification', 'acceptance', 'Ivo → Mara', 'I accept task-1 and own the release brief. Should I include all work or only release blockers?', true],
    'proposed:fail': ['failed', 'handoff-failed', 'Mara', 'Ivo did not accept. I still own this task. No specialist work started.'],
    'failed:offer': ['proposed', 'proposal-retry', 'Mara → Ivo', 'Ivo is available again. Offering the same bounded task; I retain ownership until acceptance.', true],
    'clarification:reply': ['drafting', 'clarification', 'Alex', reply],
    'drafting:draft': ['review', 'artifact', 'Ivo', 'The release brief is ready with two source citations. The smoke check blocks launch. I propose one follow-up for your review.', true],
    'review:approve': ['approved', 'approval', 'Alex', 'Approved action-1 v1 exactly as shown, once, in Launch readiness.'],
    'review:deny': ['denied', 'denial', 'Alex', 'Denied action-1. Keep the release brief; create nothing.'],
    'approved:complete': ['complete', 'receipt', 'Mara', 'Receipt SIM-LIN-104 recorded for action-1 v1. One simulated issue was created. Ivo’s brief and source evidence are retained.'],
    'approved:interrupt': ['unknown', 'unknown', 'Mara', 'The connection was interrupted after simulated acceptance and before the receipt. The issue may exist. Ivo remains owner. The brief is safe to inspect. Do not retry this action.'],
    'unknown:reconcile': ['complete', 'reconciled', 'Mara', 'Read-only simulated reconciliation found SIM-LIN-104 for action-1 v1. No new action was sent.'],
  };
  const move = moves[`${state.stage}:${event}`];
  if (!move) return state;
  if (event === 'approve' && (!state.linear || !state.inspected)) return state;
  let next = message({ ...state, stage: move[0] }, ...move.slice(1));
  if (event === 'assign') next.taskCount = 1;
  if (event === 'accept') next.dispatchCount = 1;
  if (event === 'complete' || event === 'interrupt') next.effectCount = 1;
  return next;
}
