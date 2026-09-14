import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import type {
  Citation,
  PublicArtifact,
  PublicRun,
  PublicTask,
  SourceKind,
  WorkspaceSnapshot,
} from "../../src/schema.js";
import { ArtifactDialog } from "./artifact-dialog.js";
import { WorkspaceStore } from "./workspace-store.js";

const titleCase = (value: string) => value.replaceAll("_", " ");
const time = (value: number) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(value);

const runFor = (snapshot: WorkspaceSnapshot, task: PublicTask) =>
  snapshot.runs.find((run) => run.id === task.currentRunId) ?? null;

const configFor = (snapshot: WorkspaceSnapshot, run: PublicRun | null) =>
  run
    ? (snapshot.botConfigRevisions.find((config) => config.id === run.botConfigRevisionId) ?? null)
    : null;

const latestArtifactFor = (snapshot: WorkspaceSnapshot, task: PublicTask) =>
  task.latestArtifactId
    ? (snapshot.artifacts.find((artifact) => artifact.id === task.latestArtifactId) ?? null)
    : null;

const citationFrom = (label: string, excerpt: string, url: string): Citation | null => {
  if (!label.trim() || !excerpt.trim()) return null;
  return {
    label: label.trim(),
    excerpt: excerpt.trim(),
    ...(url.trim() ? { url: url.trim() } : {}),
  };
};

const Setup = ({ store, snapshot }: { store: WorkspaceStore; snapshot: WorkspaceSnapshot }) => {
  const [sources, setSources] = useState<SourceKind[]>(["pasted"]);
  const provider = snapshot.session.provider;
  const toggle = (source: SourceKind) =>
    setSources((current) =>
      current.includes(source) ? current.filter((item) => item !== source) : [...current, source],
    );

  return (
    <section aria-labelledby="setup-title" className="panel setup-panel">
      <p className="eyebrow">Owner setup</p>
      <h1 id="setup-title">Meet Mara, your coordinator</h1>
      <p className="lede">
        Mara coordinates one request in a shared room and can offer one bounded specialist handoff
        to Ivo after producing a result.
      </p>
      <dl className="fact-grid">
        <div>
          <dt>Provider</dt>
          <dd>{provider.kind}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{provider.model}</dd>
        </div>
        <div>
          <dt>Authentication</dt>
          <dd>{provider.authMode}</dd>
        </div>
        <div>
          <dt>Runs in</dt>
          <dd>{provider.executionLocation}</dd>
        </div>
      </dl>
      {!provider.eligible ? (
        <p className="error-copy" role="alert">
          {provider.ineligibleReason ?? "The configured provider connection is not ready."}
        </p>
      ) : null}
      <fieldset>
        <legend>Read-only source authority</legend>
        <label className="check-row">
          <input
            checked={sources.includes("pasted")}
            onChange={() => toggle("pasted")}
            type="checkbox"
          />
          Pasted business input
        </label>
        <label className="check-row">
          <input
            checked={sources.includes("github_briefing")}
            onChange={() => toggle("github_briefing")}
            type="checkbox"
          />
          Supplied GitHub briefing packet
        </label>
        <p className="field-help">
          Briefing packets are materialized read-only input. Agentis does not connect to or write to
          GitHub.
        </p>
      </fieldset>
      <button
        disabled={!provider.eligible || sources.length === 0 || store.getState().busy}
        onClick={() => void store.acknowledgeSetup(provider.kind, sources)}
      >
        Acknowledge and enter workspace
      </button>
    </section>
  );
};

const RequestForm = ({
  store,
  snapshot,
  onCreated,
}: {
  store: WorkspaceStore;
  snapshot: WorkspaceSnapshot;
  onCreated: (taskId: string) => void;
}) => {
  const acknowledged = snapshot.session.sources.map((item) => item.source);
  const [outcome, setOutcome] = useState("");
  const [constraints, setConstraints] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>(acknowledged[0] ?? "pasted");
  const [label, setLabel] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [repository, setRepository] = useState("");
  const [revision, setRevision] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [citationLabel, setCitationLabel] = useState("");
  const [citationExcerpt, setCitationExcerpt] = useState("");
  const [citationUrl, setCitationUrl] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const citation = citationFrom(citationLabel, citationExcerpt, citationUrl);
    const citations = citation ? [citation] : [];
    const normalizedOutcome = outcome.trim();
    const normalizedText = sourceText.trim();
    const normalizedLabel = label.trim();
    if (!normalizedOutcome || !normalizedText || !normalizedLabel) return;
    const source =
      sourceKind === "github_briefing"
        ? {
            kind: "github_briefing" as const,
            label: normalizedLabel,
            repository: repository.trim(),
            revision: revision.trim(),
            ...(sourceUrl.trim() ? { url: sourceUrl.trim() } : {}),
            text: normalizedText,
            citations,
          }
        : {
            kind: "pasted" as const,
            label: normalizedLabel,
            text: normalizedText,
            citations,
          };
    void store
      .sendCommand("Submit request", {
        kind: "submit_task",
        coordinator: "mara",
        brief: normalizedOutcome,
        outcome: normalizedOutcome,
        constraints: constraints
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        source,
      })
      .then((receipt) => {
        if (!receipt?.accepted) return;
        if (receipt.taskId) onCreated(receipt.taskId);
        setOutcome("");
        setConstraints("");
        setSourceText("");
        setCitationLabel("");
        setCitationExcerpt("");
        setCitationUrl("");
      });
  };

  const githubInvalid =
    sourceKind === "github_briefing" && (!repository.trim() || !revision.trim());

  return (
    <section aria-labelledby="request-title" className="panel request-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">New work</p>
          <h2 id="request-title">Ask Mara</h2>
        </div>
        <span className="role-pill">Coordinator</span>
      </div>
      <form onSubmit={submit}>
        <label>
          Outcome
          <textarea
            onChange={(event) => setOutcome(event.target.value)}
            placeholder="What business outcome should Mara deliver?"
            required
            rows={3}
            value={outcome}
          />
        </label>
        <label>
          Constraints <span className="optional">optional, one per line</span>
          <textarea
            onChange={(event) => setConstraints(event.target.value)}
            rows={2}
            value={constraints}
          />
        </label>
        <label>
          Input type
          <select
            onChange={(event) => setSourceKind(event.target.value as SourceKind)}
            value={sourceKind}
          >
            {acknowledged.includes("pasted") ? <option value="pasted">Pasted input</option> : null}
            {acknowledged.includes("github_briefing") ? (
              <option value="github_briefing">GitHub briefing packet</option>
            ) : null}
          </select>
        </label>
        {sourceKind === "github_briefing" ? (
          <div className="two-column-fields">
            <label>
              Repository
              <input
                onChange={(event) => setRepository(event.target.value)}
                placeholder="owner/repository"
                required
                value={repository}
              />
            </label>
            <label>
              Revision
              <input
                onChange={(event) => setRevision(event.target.value)}
                placeholder="commit SHA or tag"
                required
                value={revision}
              />
            </label>
          </div>
        ) : null}
        <label>
          Source label
          <input
            onChange={(event) => setLabel(event.target.value)}
            placeholder={sourceKind === "pasted" ? "Quarterly planning notes" : "Release briefing"}
            required
            value={label}
          />
        </label>
        {sourceKind === "github_briefing" ? (
          <label>
            Source URL <span className="optional">optional</span>
            <input onChange={(event) => setSourceUrl(event.target.value)} type="url" value={sourceUrl} />
          </label>
        ) : null}
        <label>
          Read-only input
          <textarea
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste the materialized source packet here."
            required
            rows={6}
            value={sourceText}
          />
        </label>
        <details className="citation-fields">
          <summary>Add a citation</summary>
          <div className="citation-inputs">
            <label>
              Citation label
              <input onChange={(event) => setCitationLabel(event.target.value)} value={citationLabel} />
            </label>
            <label>
              Exact excerpt
              <textarea
                onChange={(event) => setCitationExcerpt(event.target.value)}
                rows={2}
                value={citationExcerpt}
              />
            </label>
            <label>
              Citation URL <span className="optional">optional</span>
              <input onChange={(event) => setCitationUrl(event.target.value)} type="url" value={citationUrl} />
            </label>
          </div>
        </details>
        <button disabled={store.getState().busy || githubInvalid} type="submit">
          Send to Mara
        </button>
      </form>
    </section>
  );
};

const CurrentWork = ({ snapshot, task }: { snapshot: WorkspaceSnapshot; task: PublicTask }) => {
  const run = runFor(snapshot, task);
  const config = configFor(snapshot, run);
  const artifact = latestArtifactFor(snapshot, task);
  const pending = run
    ? snapshot.pending.find((action) => action.runId === run.id && action.state === "pending")
    : null;
  const handoff = snapshot.handoffs.find((item) => item.taskId === task.id);
  const pendingDecision =
    run?.status === "waiting_input"
      ? (run.pendingPrompt?.questions.map((question) => question.prompt).join("; ") ??
        "Owner input required")
      : run?.status === "waiting_approval"
        ? (pending?.detail ?? "Owner approval required")
        : handoff?.state === "proposed"
          ? "Ivo acceptance pending"
          : handoff?.state === "accepted" && run?.status !== "succeeded"
            ? "Ivo specialist draft pending"
            : "None";
  return (
    <section aria-labelledby="current-work-title" className="current-work">
      <div>
        <p className="eyebrow">Current work</p>
        <h2 id="current-work-title">{task.outcome}</h2>
      </div>
      <dl className="work-facts">
        <div>
          <dt>Owner</dt>
          <dd>
            {task.currentOwner === "mara" ? "Mara" : "Ivo"} · {task.ownerRole}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{titleCase(run?.status ?? task.status)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{config?.executionLocation ?? "Waiting for configuration"}</dd>
        </div>
        <div>
          <dt>Waiting</dt>
          <dd>{run?.waitingReason === "none" ? "No" : titleCase(run?.waitingReason ?? "none")}</dd>
        </div>
        <div>
          <dt>Pending decision</dt>
          <dd>{pendingDecision}</dd>
        </div>
        <div>
          <dt>Latest result</dt>
          <dd>{artifact ? `${artifact.author} · ${artifact.mediaType}` : "None yet"}</dd>
        </div>
      </dl>
    </section>
  );
};

const WaitingActions = ({
  store,
  snapshot,
  task,
}: {
  store: WorkspaceStore;
  snapshot: WorkspaceSnapshot;
  task: PublicTask;
}) => {
  const run = runFor(snapshot, task);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const pendingApproval = run
    ? snapshot.pending.find(
        (action) => action.runId === run.id && action.state === "pending" && action.approvalId,
      )
    : null;
  if (!run || (run.status !== "waiting_input" && run.status !== "waiting_approval")) return null;

  return (
    <section aria-labelledby="waiting-title" className="panel waiting-panel">
      <p className="eyebrow">Mara is waiting</p>
      <h3 id="waiting-title">
        {run.status === "waiting_input" ? "Mara needs your input" : "Approval required"}
      </h3>
      {run.status === "waiting_input" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const normalized = Object.fromEntries(
              Object.entries(answers).map(([key, value]) => [key, value.trim()]),
            );
            if (
              !run.pendingPrompt?.questions.every((question) => normalized[question.key]?.length)
            ) {
              return;
            }
            void store.sendCommand("Answer Mara", {
              kind: "answer_input",
              runId: run.id,
              answers: normalized,
            });
          }}
        >
          {run.pendingPrompt?.questions.map((question) => (
            <label key={question.key}>
              {question.prompt}
              {question.options.length > 0 ? (
                <select
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [question.key]: event.target.value }))
                  }
                  required
                  value={answers[question.key] ?? ""}
                >
                  <option value="">Select an answer</option>
                  {question.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : (
                <textarea
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [question.key]: event.target.value }))
                  }
                  required
                  value={answers[question.key] ?? ""}
                />
              )}
            </label>
          ))}
          <button disabled={store.getState().busy} type="submit">
            Send answer
          </button>
        </form>
      ) : (
        <div className="button-row">
          <button
            disabled={!pendingApproval?.approvalId || store.getState().busy}
            onClick={() => {
              if (!pendingApproval?.approvalId) return;
              void store.sendCommand("Allow action", {
                kind: "resolve_approval",
                approvalId: pendingApproval.approvalId,
                decision: "allowed",
              });
            }}
          >
            Allow once
          </button>
          <button
            className="secondary-button"
            disabled={!pendingApproval?.approvalId || store.getState().busy}
            onClick={() => {
              if (!pendingApproval?.approvalId) return;
              void store.sendCommand("Deny action", {
                kind: "resolve_approval",
                approvalId: pendingApproval.approvalId,
                decision: "denied",
              });
            }}
          >
            Deny
          </button>
        </div>
      )}
    </section>
  );
};

const HandoffAction = ({
  store,
  snapshot,
  task,
}: {
  store: WorkspaceStore;
  snapshot: WorkspaceSnapshot;
  task: PublicTask;
}) => {
  const [context, setContext] = useState("Review Mara’s result and return one concise specialist draft.");
  const handoff = snapshot.handoffs.find((item) => item.taskId === task.id);
  const maraRun = snapshot.runs.find((run) => {
    const config = configFor(snapshot, run);
    return run.taskId === task.id && config?.bot === "mara" && config.provider === "codex";
  });
  if (handoff) {
    return (
      <section aria-label="Specialist handoff" className="handoff-note">
        <strong>Mara → Ivo</strong>
        <span>{titleCase(handoff.state)} · one draft · no onward delegation</span>
      </section>
    );
  }
  if (!maraRun || maraRun.status !== "succeeded" || task.currentOwner !== "mara") return null;
  return (
    <details className="handoff-action">
      <summary>Ask Ivo for one specialist draft</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!context.trim()) return;
          void store.sendCommand("Handoff to Ivo", {
            kind: "propose_handoff",
            sourceRunId: maraRun.id,
            recipient: "ivo",
            context: context.trim(),
          });
        }}
      >
        <p>
          Ivo must explicitly accept. The handoff stays in this task and thread, permits one draft,
          and cannot delegate onward.
        </p>
        <label>
          Specialist request
          <textarea onChange={(event) => setContext(event.target.value)} rows={3} value={context} />
        </label>
        <button disabled={store.getState().busy} type="submit">
          Offer bounded handoff
        </button>
      </form>
    </details>
  );
};

const ArtifactCard = ({
  artifact,
  onOpen,
}: {
  readonly artifact: PublicArtifact;
  readonly onOpen: (opener: HTMLButtonElement) => void;
}) => (
  <article className="artifact-card">
    <div>
      <p className="eyebrow">Result from {artifact.author === "mara" ? "Mara" : "Ivo"}</p>
      <h3>{artifact.mediaType}</h3>
      <p>
        {artifact.byteSize.toLocaleString()} bytes · {artifact.citations.length} citation
        {artifact.citations.length === 1 ? "" : "s"}
      </p>
    </div>
    <button onClick={(event) => onOpen(event.currentTarget)}>Open result</button>
  </article>
);

const Conversation = ({ snapshot, task }: { snapshot: WorkspaceSnapshot; task: PublicTask }) => {
  const messages = snapshot.messages
    .filter((message) => message.threadId === task.threadId)
    .sort((left, right) => left.createdAt - right.createdAt);
  return (
    <section aria-labelledby="conversation-title" className="conversation">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Shared room</p>
          <h2 id="conversation-title">Conversation</h2>
        </div>
        <span>{messages.length} retained</span>
      </div>
      <ol className="message-list">
        {messages.map((message) => {
          const content = (
            <>
              <div className="message-meta">
                <strong>{message.authorName === "owner" ? "You" : message.authorName}</strong>
                <span>{message.authorRole}</span>
                <time dateTime={new Date(message.createdAt).toISOString()}>{time(message.createdAt)}</time>
              </div>
              <p>{message.body}</p>
            </>
          );
          return (
            <li className={`message message-${message.authorName}`} key={message.id}>
              {message.kind === "progress" && message.importance === "routine" ? (
                <details>
                  <summary>{message.authorName} posted routine progress</summary>
                  {content}
                </details>
              ) : (
                <article>{content}</article>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export const App = ({ store }: { readonly store: WorkspaceStore }) => {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("task"),
  );
  const artifactOpener = useRef<HTMLElement | null>(null);
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    const url = new URL(window.location.href);
    url.searchParams.set("task", taskId);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  const closeArtifact = useCallback(() => store.closeArtifact(), [store]);

  useEffect(() => {
    void store.start();
    return () => store.dispose();
  }, [store]);

  const tasks = state.snapshot?.tasks ?? [];
  const selectedTask = useMemo(
    () =>
      tasks.find((task) => task.id === selectedTaskId) ??
      [...tasks].sort((left, right) => right.updatedAt - left.updatedAt)[0] ??
      null,
    [selectedTaskId, tasks],
  );

  if (state.phase === "starting") {
    return (
      <main className="centered-shell">
        <p className="eyebrow">Agentis</p>
        <h1>Opening your workspace…</h1>
        <p role="status">Restoring the owner session and retained work.</p>
      </main>
    );
  }

  if (state.phase === "signed_out" || !state.snapshot) {
    return (
      <main className="centered-shell">
        <p className="eyebrow">Owner session required</p>
        <h1>Open a fresh workspace link</h1>
        <p className="error-copy" role="alert">
          {state.error}
        </p>
        <code>agentis web --endpoint http://127.0.0.1:PORT</code>
      </main>
    );
  }

  if (state.phase === "setup") return <main className="centered-shell"><Setup snapshot={state.snapshot} store={store} /></main>;

  const snapshot = state.snapshot;
  const artifacts = selectedTask
    ? snapshot.artifacts.filter((artifact) => artifact.taskId === selectedTask.id)
    : [];

  return (
    <>
      <header className="site-header">
        <div>
          <p className="wordmark">Agentis</p>
          <p className="header-subtitle">Mara’s shared workspace</p>
        </div>
        <div aria-live="polite" className={`connection connection-${state.stream}`}>
          <span aria-hidden="true" />
          {state.stream === "connected" ? "Live" : titleCase(state.stream)}
        </div>
      </header>
      <main className="workspace-shell">
        {state.error ? (
          <section aria-live="assertive" className="error-banner">
            <p>{state.error}</p>
            <div className="button-row">
              {state.retryLabel ? (
                <button disabled={state.busy} onClick={() => void store.retryCommand()}>
                  Retry {state.retryLabel.toLowerCase()}
                </button>
              ) : null}
              <button className="quiet-button" onClick={() => store.clearError()}>
                Dismiss
              </button>
            </div>
          </section>
        ) : null}

        <RequestForm onCreated={selectTask} snapshot={snapshot} store={store} />

        {tasks.length > 1 ? (
          <nav aria-label="Retained tasks" className="task-tabs">
            {[...tasks]
              .sort((left, right) => right.updatedAt - left.updatedAt)
              .map((task) => (
                <button
                  aria-current={task.id === selectedTask?.id ? "page" : undefined}
                  className="task-tab"
                  key={task.id}
                  onClick={() => selectTask(task.id)}
                >
                  {task.outcome}
                </button>
              ))}
          </nav>
        ) : null}

        {selectedTask ? (
          <div className="room-grid">
            <CurrentWork snapshot={snapshot} task={selectedTask} />
            <WaitingActions
              key={selectedTask.currentRunId}
              snapshot={snapshot}
              store={store}
              task={selectedTask}
            />
            <HandoffAction snapshot={snapshot} store={store} task={selectedTask} />
            {artifacts.length > 0 ? (
              <section aria-label="Task results" className="artifact-list">
                {artifacts.map((artifact) => (
                  <ArtifactCard
                    artifact={artifact}
                    key={artifact.id}
                    onOpen={(opener) => {
                      artifactOpener.current = opener;
                      void store.openArtifact(artifact);
                    }}
                  />
                ))}
              </section>
            ) : null}
            <Conversation snapshot={snapshot} task={selectedTask} />
          </div>
        ) : (
          <section className="empty-room">
            <p className="eyebrow">Shared room</p>
            <h2>Your first request will appear here</h2>
            <p>Mara’s questions, decisions, handoffs, progress, and retained results stay together.</p>
          </section>
        )}
      </main>
      {state.artifactPreview ? (
        <ArtifactDialog
          evidence={snapshot.evidence.filter(
            (item) =>
              snapshot.tasks
                .find((task) => task.id === state.artifactPreview?.artifact.taskId)
                ?.evidence.includes(item.id) ?? false,
          )}
          onClose={closeArtifact}
          opener={artifactOpener.current}
          preview={state.artifactPreview}
        />
      ) : null}
    </>
  );
};
