// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSnapshot, type Command, type PublicArtifact } from "../src/schema.js";
import { App } from "../web/src/app.js";
import { type WorkspaceState, type WorkspaceStore } from "../web/src/workspace-store.js";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const readySnapshot = (options: { waiting?: boolean; multiple?: boolean } = {}) =>
  Schema.decodeUnknownSync(WorkspaceSnapshot)({
    schemaId: "agentis.v2.gate1",
    cursor: "8",
    stopAll: false,
    session: {
      expiresAt: 9_999_999,
      provider: {
        kind: "codex",
        model: "gpt-5.6-sol",
        authMode: "device-code",
        executionLocation: "local provider container",
        eligible: true,
        ineligibleReason: null,
        acknowledgedAt: 1,
      },
      sources: [
        { source: "pasted", acknowledgedAt: 1 },
        { source: "github_briefing", acknowledgedAt: 1 },
      ],
    },
    tasks: [
      {
        id: "task_new",
        threadId: "thread_new",
        outcome: "New outcome",
        requestedBy: "owner",
        currentOwner: "mara",
        ownerRole: "coordinator",
        workspaceRef: "task:task_new",
        constraints: ["Read only"],
        evidence: ["evidence_new"],
        currentRunId: "run_new",
        latestArtifactId: options.waiting ? null : "artifact_new",
        status: options.waiting ? "running" : "completed",
        actionCount: 1,
        createdAt: 2,
        updatedAt: 20,
      },
      ...(options.multiple
        ? [
            {
              id: "task_old",
              threadId: "thread_old",
              outcome: "Old outcome",
              requestedBy: "owner" as const,
              currentOwner: "mara" as const,
              ownerRole: "coordinator" as const,
              workspaceRef: "task:task_old",
              constraints: [],
              evidence: ["evidence_old"],
              currentRunId: "run_old",
              latestArtifactId: null,
              status: "completed" as const,
              actionCount: 0,
              createdAt: 1,
              updatedAt: 10,
            },
          ]
        : []),
    ],
    threads: [
      { id: "thread_new", taskId: "task_new", createdAt: 2 },
      ...(options.multiple ? [{ id: "thread_old", taskId: "task_old", createdAt: 1 }] : []),
    ],
    handoffs: [],
    runs: [
      {
        id: "run_new",
        taskId: "task_new",
        threadId: "thread_new",
        botConfigRevisionId: "config_new",
        status: options.waiting ? "waiting_input" : "succeeded",
        waitingReason: options.waiting ? "input" : "none",
        providerLoadStatus: "idle",
        pendingPrompt: options.waiting
          ? {
              kind: "questions",
              questions: [{ key: "color", prompt: "Pick a color", options: ["Blue", "Red"] }],
            }
          : null,
        failure: null,
        actionCount: 1,
        queuedAt: 2,
        startedAt: 3,
        deadlineAt: 100,
        completedAt: options.waiting ? null : 4,
      },
      ...(options.multiple
        ? [
            {
              id: "run_old",
              taskId: "task_old",
              threadId: "thread_old",
              botConfigRevisionId: "config_old",
              status: "succeeded" as const,
              waitingReason: "none" as const,
              providerLoadStatus: "idle" as const,
              pendingPrompt: null,
              failure: null,
              actionCount: 0,
              queuedAt: 1,
              startedAt: 1,
              deadlineAt: 100,
              completedAt: 2,
            },
          ]
        : []),
    ],
    botConfigRevisions: [
      {
        id: "config_new",
        bot: "mara",
        role: "coordinator",
        provider: "codex",
        model: "gpt-5.6-sol",
        effort: "medium",
        skills: ["coordinate"],
        grants: ["read:provided-source"],
        publicConfig: { sourceMode: "materialized-read-only" },
        executionBoundary: "docker-desktop-run-container",
        executionLocation: "local provider container",
        authMode: "device-code",
        createdAt: 2,
      },
      ...(options.multiple
        ? [
            {
              id: "config_old",
              bot: "mara" as const,
              role: "coordinator" as const,
              provider: "codex" as const,
              model: "gpt-5.6-sol",
              effort: "medium",
              skills: ["coordinate"],
              grants: ["read:provided-source"],
              publicConfig: { sourceMode: "materialized-read-only" },
              executionBoundary: "docker-desktop-run-container" as const,
              executionLocation: "local provider container",
              authMode: "device-code",
              createdAt: 1,
            },
          ]
        : []),
    ],
    evidence: [
      {
        id: "evidence_new",
        source: "github_briefing",
        label: "Release briefing <script>alert(1)</script>",
        repository: "agentis/example",
        revision: "abc123",
        url: "data:text/html,bad",
        contentDigest: "source-digest",
        byteSize: 12,
        citations: [],
        createdAt: 2,
      },
      ...(options.multiple
        ? [
            {
              id: "evidence_old",
              source: "pasted" as const,
              label: "Old notes",
              contentDigest: "old-digest",
              byteSize: 3,
              citations: [],
              createdAt: 1,
            },
          ]
        : []),
    ],
    pending: [],
    artifacts: options.waiting
      ? []
      : [
          {
            id: "artifact_new",
            taskId: "task_new",
            runId: "run_new",
            author: "mara",
            source: "codex",
            mediaType: "text/markdown",
            sha256: "artifact-digest",
            byteSize: 24,
            citations: [
              {
                label: "Unsafe citation",
                excerpt: "<img src=x onerror=alert(1)>",
                url: "javascript:alert(1)",
              },
            ],
            createdAt: 4,
            metadataUrl: "/v1/artifacts/artifact_new",
            contentUrl: "/v1/artifacts/artifact_new/content",
          },
        ],
    messages: [
      {
        id: "message_request",
        threadId: "thread_new",
        taskId: "task_new",
        runId: "run_new",
        authorKind: "human",
        authorName: "owner",
        authorRole: "operator",
        kind: "request",
        importance: "decision",
        body: "<img src=x onerror=alert(1)>",
        createdAt: 2,
      },
      {
        id: "message_progress",
        threadId: "thread_new",
        taskId: "task_new",
        runId: "run_new",
        authorKind: "bot",
        authorName: "mara",
        authorRole: "coordinator",
        kind: "progress",
        importance: "routine",
        body: "Working through the evidence.",
        createdAt: 3,
      },
      {
        id: "message_result",
        threadId: "thread_new",
        taskId: "task_new",
        runId: "run_new",
        authorKind: "bot",
        authorName: "mara",
        authorRole: "coordinator",
        kind: options.waiting ? "question" : "result",
        importance: options.waiting ? "blocking" : "result",
        body: options.waiting ? "Pick a color" : "Result ready.",
        createdAt: 4,
      },
      ...(options.multiple
        ? [
            {
              id: "message_old",
              threadId: "thread_old",
              taskId: "task_old",
              runId: "run_old",
              authorKind: "bot" as const,
              authorName: "mara" as const,
              authorRole: "coordinator" as const,
              kind: "result" as const,
              importance: "result" as const,
              body: "Old retained result.",
              createdAt: 2,
            },
          ]
        : []),
    ],
  });

class ViewStore {
  readonly sent: Array<{ label: string; command: Command }> = [];
  readonly #listeners = new Set<() => void>();
  state: WorkspaceState;

  constructor(snapshot = readySnapshot()) {
    this.state = {
      phase: "ready",
      session: snapshot.session,
      snapshot,
      stream: "connected",
      busy: false,
      error: null,
      retryLabel: null,
      artifactPreview: null,
    };
  }

  getState = () => this.state;
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };
  start = vi.fn(async () => undefined);
  dispose = vi.fn();
  acknowledgeSetup = vi.fn(async () => undefined);
  retryCommand = vi.fn(async () => undefined);
  clearError = vi.fn();
  sendCommand = vi.fn(async (label: string, command: Command) => {
    this.sent.push({ label, command });
    return undefined;
  });
  openArtifact = vi.fn(async (artifact: PublicArtifact) => {
    this.state = {
      ...this.state,
      artifactPreview: { artifact, status: "ready", text: "# Safe retained result" },
    };
    for (const listener of this.#listeners) listener();
  });
  closeArtifact = vi.fn(() => {
    this.state = { ...this.state, artifactPreview: null };
    for (const listener of this.#listeners) listener();
  });
}

const button = (name: string) => {
  const found = [...document.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === name,
  );
  if (!(found instanceof HTMLButtonElement)) throw new Error(`missing button ${name}`);
  return found;
};

const render = async (store: ViewStore) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<App store={store as unknown as WorkspaceStore} />));
  return { container, root };
};

let mounted: Root | null = null;

afterEach(async () => {
  if (mounted) await act(async () => mounted?.unmount());
  mounted = null;
  document.body.replaceChildren();
  window.history.replaceState(null, "", "/");
});

describe("browser shared room", () => {
  it("renders retained text safely and restores exact focus after the artifact dialog closes", async () => {
    const store = new ViewStore();
    const rendered = await render(store);
    mounted = rendered.root;
    expect(rendered.container.textContent).toContain("<img src=x onerror=alert(1)>");
    expect(rendered.container.querySelector("img")).toBeNull();
    expect(rendered.container.querySelector(".message-mara details")).not.toBeNull();
    expect(rendered.container.querySelector(".message-mara article")).not.toBeNull();
    expect(rendered.container.textContent).toContain("Ask Ivo for one specialist draft");

    const opener = button("Open result");
    opener.focus();
    await act(async () => opener.click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement).toBe(button("Close"));
    expect(document.body.textContent).toContain("artifact-digest");
    expect(document.body.textContent).toContain("agentis/example");
    expect(
      [...document.querySelectorAll("a")].some((anchor) =>
        /^(javascript|data):/i.test(anchor.getAttribute("href") ?? ""),
      ),
    ).toBe(false);

    await act(async () =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("answers provider questions with their exact typed keys and options", async () => {
    const store = new ViewStore(readySnapshot({ waiting: true }));
    const rendered = await render(store);
    mounted = rendered.root;
    const answer = [...rendered.container.querySelectorAll("select")].find(
      (candidate) => candidate.parentElement?.textContent?.includes("Pick a color"),
    );
    if (!(answer instanceof HTMLSelectElement)) throw new Error("missing structured question");
    await act(async () => {
      answer.value = "Blue";
      answer.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => button("Send answer").click());
    expect(store.sent).toEqual([
      {
        label: "Answer Mara",
        command: { kind: "answer_input", runId: "run_new", answers: { color: "Blue" } },
      },
    ]);
  });

  it("keeps a selected retained task in URL state across a full remount", async () => {
    window.history.replaceState(null, "", "/?task=task_old");
    const first = await render(new ViewStore(readySnapshot({ multiple: true })));
    mounted = first.root;
    expect(first.container.querySelector("#current-work-title")?.textContent).toBe("Old outcome");
    await act(async () => button("New outcome").click());
    expect(new URLSearchParams(window.location.search).get("task")).toBe("task_new");
    await act(async () => first.root.unmount());
    mounted = null;
    first.container.remove();

    const second = await render(new ViewStore(readySnapshot({ multiple: true })));
    mounted = second.root;
    expect(second.container.querySelector("#current-work-title")?.textContent).toBe("New outcome");
  });

  it("defines a one-column 390px layout without viewport-width content", () => {
    const css = readFileSync(resolve(process.cwd(), "web/src/styles.css"), "utf8");
    const mobile = css.slice(css.indexOf("@media (max-width: 390px)"));
    expect(mobile).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(mobile).toContain("width: min(100% - 1rem, 100%)");
    expect(css).not.toMatch(/width:\s*100vw/);
  });
});
