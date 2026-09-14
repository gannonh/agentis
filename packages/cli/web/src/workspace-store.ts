import { Schema } from "effect";
import {
  CommandRequest,
  IdempotencyKey,
  Transition,
  type Command,
  type OwnerSession,
  type ProviderKind,
  type PublicArtifact,
  type SourceKind,
  type WorkspaceSnapshot,
} from "../../src/schema.js";
import { ApiClientError, apiClient } from "./api-client.js";

export const MAX_TEXT_PREVIEW_BYTES = 512 * 1024;

export type ArtifactPreview = {
  readonly artifact: PublicArtifact;
  readonly status: "loading" | "ready" | "error" | "download_only";
  readonly text?: string;
  readonly error?: string;
};

export type WorkspaceState = {
  readonly phase: "starting" | "setup" | "ready" | "signed_out";
  readonly session: OwnerSession | null;
  readonly snapshot: WorkspaceSnapshot | null;
  readonly stream: "idle" | "connecting" | "connected" | "reconnecting";
  readonly busy: boolean;
  readonly error: string | null;
  readonly retryLabel: string | null;
  readonly artifactPreview: ArtifactPreview | null;
};

export type WorkspaceApi = typeof apiClient;

export type BrowserBindings = {
  readonly location: Pick<Location, "hash" | "pathname" | "search" | "origin">;
  readonly replaceUrl: (url: string) => void;
  readonly cookie: () => string;
  readonly createEventSource: (url: string) => EventSource;
  readonly randomUuid: () => string;
};

const browserBindings = (): BrowserBindings => ({
  location: window.location,
  replaceUrl: (url) => window.history.replaceState(null, "", url),
  cookie: () => document.cookie,
  createEventSource: (url) => new EventSource(url, { withCredentials: true }),
  randomUuid: () => crypto.randomUUID(),
});

const messageOf = (error: unknown) =>
  error instanceof Error && error.message.length > 0
    ? error.message
    : "The workspace could not complete that request.";

const authenticationFailed = (error: unknown) => {
  if (!(error instanceof ApiClientError) || !error.detail || typeof error.detail !== "object") {
    return false;
  }
  return (
    "code" in error.detail &&
    (error.detail.code === "unauthorized" || error.detail.code === "forbidden")
  );
};

const cookieValue = (header: string, name: string) => {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
};

export const consumeBootstrapFragment = (
  location: BrowserBindings["location"],
  replaceUrl: BrowserBindings["replaceUrl"],
) => {
  const parameters = new URLSearchParams(location.hash.replace(/^#/, ""));
  const code = parameters.get("bootstrap");
  if (code === null) return null;
  parameters.delete("bootstrap");
  const remaining = parameters.toString();
  replaceUrl(`${location.pathname}${location.search}${remaining.length > 0 ? `#${remaining}` : ""}`);
  return code;
};

const sessionReady = (session: OwnerSession) =>
  session.provider.eligible &&
  session.provider.acknowledgedAt !== null &&
  session.sources.length > 0;

export class WorkspaceStore {
  readonly #listeners = new Set<() => void>();
  readonly #artifactBytes = new Map<string, ArrayBuffer>();
  readonly #api: WorkspaceApi;
  readonly #browser: BrowserBindings;
  #state: WorkspaceState = {
    phase: "starting",
    session: null,
    snapshot: null,
    stream: "idle",
    busy: false,
    error: null,
    retryLabel: null,
    artifactPreview: null,
  };
  #csrfToken: string | null = null;
  #eventSource: EventSource | null = null;
  #eventGeneration = 0;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #reconnectDelayMs = 500;
  #refreshFlight: Promise<void> | null = null;
  #pendingCursor = 0;
  #retryRequest: { readonly label: string; readonly request: typeof CommandRequest.Type } | null =
    null;
  #disposed = false;

  constructor(api: WorkspaceApi = apiClient, browser: BrowserBindings = browserBindings()) {
    this.#api = api;
    this.#browser = browser;
  }

  getState = () => this.#state;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  #update(change: Partial<WorkspaceState>) {
    if (this.#disposed) return;
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) listener();
  }

  async start() {
    this.#update({ phase: "starting", error: null });
    try {
      const bootstrap = consumeBootstrapFragment(
        this.#browser.location,
        this.#browser.replaceUrl,
      );
      if (bootstrap !== null) {
        const exchanged = await this.#api.exchangeBootstrap(bootstrap);
        this.#csrfToken = exchanged.csrfToken;
      } else {
        this.#csrfToken = cookieValue(this.#browser.cookie(), "agentis_csrf");
      }
      const session = await this.#api.session();
      this.#update({ session });
      await this.refresh(true);
    } catch (error) {
      this.#closeEvents();
      this.#update({
        phase: "signed_out",
        stream: "idle",
        error: `${messageOf(error)} Run agentis web again to open a new owner session.`,
      });
    }
  }

  async acknowledgeSetup(provider: ProviderKind, sources: readonly SourceKind[]) {
    if (!this.#csrfToken) {
      this.#update({ error: "This owner session is missing its CSRF token. Open a new agentis web URL." });
      return;
    }
    this.#update({ busy: true, error: null });
    try {
      const session = await this.#api.acknowledgeSetup(this.#csrfToken, provider, sources);
      this.#update({ session });
      await this.refresh(true);
    } catch (error) {
      if (authenticationFailed(error)) this.#signedOut(messageOf(error));
      else this.#update({ error: messageOf(error) });
    } finally {
      this.#update({ busy: false });
    }
  }

  async refresh(reconnect = false) {
    if (this.#refreshFlight) return this.#refreshFlight;
    this.#refreshFlight = (async () => {
      try {
        let snapshot: WorkspaceSnapshot;
        do {
          snapshot = await this.#api.status();
          this.#pendingCursor = Math.max(this.#pendingCursor, Number(snapshot.cursor));
          this.#update({
            phase: sessionReady(snapshot.session) ? "ready" : "setup",
            session: snapshot.session,
            snapshot,
            error: null,
          });
        } while (Number(snapshot.cursor) < this.#pendingCursor);
        if (reconnect || this.#eventSource === null) this.#connectEvents(snapshot.cursor);
      } catch (error) {
        if (authenticationFailed(error)) {
          this.#signedOut(messageOf(error));
        } else {
          this.#update({ error: messageOf(error), stream: "reconnecting" });
        }
        throw error;
      } finally {
        this.#refreshFlight = null;
      }
    })();
    return this.#refreshFlight;
  }

  async sendCommand(label: string, command: Command) {
    const request = Schema.decodeUnknownSync(CommandRequest)({
      idempotencyKey: Schema.decodeUnknownSync(IdempotencyKey)(
        `web_${this.#browser.randomUuid()}`,
      ),
      command,
    });
    this.#retryRequest = { label, request };
    return this.#dispatchCommand();
  }

  async retryCommand() {
    if (this.#retryRequest === null) return;
    return this.#dispatchCommand();
  }

  async #dispatchCommand() {
    const pending = this.#retryRequest;
    if (!pending || !this.#csrfToken || this.#state.busy) return;
    this.#update({ busy: true, error: null, retryLabel: null });
    try {
      const receipt = await this.#api.command(this.#csrfToken, pending.request);
      if (!receipt.accepted) {
        this.#retryRequest = null;
        this.#update({ error: receipt.error ?? `${pending.label} was not accepted.` });
        return receipt;
      }
      this.#retryRequest = null;
      await this.refresh();
      return receipt;
    } catch (error) {
      if (authenticationFailed(error)) {
        this.#retryRequest = null;
        this.#signedOut(messageOf(error));
      } else {
        this.#update({ error: messageOf(error), retryLabel: pending.label });
      }
      return undefined;
    } finally {
      this.#update({ busy: false });
    }
  }

  async openArtifact(artifact: PublicArtifact) {
    const previewable = ["text/plain", "text/markdown", "application/json"].includes(
      artifact.mediaType,
    );
    if (!previewable || artifact.byteSize > MAX_TEXT_PREVIEW_BYTES) {
      this.#update({ artifactPreview: { artifact, status: "download_only" } });
      return;
    }
    this.#update({ artifactPreview: { artifact, status: "loading" } });
    try {
      let bytes = this.#artifactBytes.get(artifact.id);
      if (!bytes) {
        bytes = await this.#api.artifactBytes(artifact.contentUrl);
        this.#artifactBytes.set(artifact.id, bytes);
      }
      this.#update({
        artifactPreview: {
          artifact,
          status: "ready",
          text: new TextDecoder().decode(bytes),
        },
      });
    } catch (error) {
      this.#update({
        artifactPreview: { artifact, status: "error", error: messageOf(error) },
      });
    }
  }

  closeArtifact() {
    this.#update({ artifactPreview: null });
  }

  clearError() {
    this.#update({ error: null, retryLabel: null });
  }

  #connectEvents(cursor: WorkspaceSnapshot["cursor"]) {
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    this.#closeEvents();
    const generation = this.#eventGeneration;
    this.#update({ stream: "connecting" });
    const events = this.#browser.createEventSource(
      `/v1/events?cursor=${encodeURIComponent(cursor)}`,
    );
    this.#eventSource = events;
    events.onopen = () => {
      if (generation === this.#eventGeneration) {
        this.#reconnectDelayMs = 500;
        this.#update({ stream: "connected" });
      }
    };
    events.addEventListener("transition", (event) => {
      if (generation !== this.#eventGeneration || !(event instanceof MessageEvent)) return;
      try {
        const transition = Schema.decodeUnknownSync(Transition)(JSON.parse(String(event.data)));
        const cursorValue = Number(transition.cursor);
        if (cursorValue <= this.#pendingCursor) return;
        this.#pendingCursor = cursorValue;
        void this.refresh().catch(() => undefined);
      } catch (error) {
        this.#update({ error: `The event stream sent invalid data: ${messageOf(error)}` });
      }
    });
    events.addEventListener("resync_required", () => this.#scheduleResync(generation));
    events.onerror = () => this.#scheduleResync(generation);
  }

  #scheduleResync(generation: number) {
    if (
      generation !== this.#eventGeneration ||
      this.#disposed ||
      this.#reconnectTimer !== null
    ) {
      return;
    }
    this.#closeEvents();
    this.#update({ stream: "reconnecting" });
    const delay = this.#reconnectDelayMs;
    this.#reconnectDelayMs = Math.min(this.#reconnectDelayMs * 2, 30_000);
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      void this.refresh(true).catch((error: unknown) => {
        if (!authenticationFailed(error)) this.#scheduleResync(this.#eventGeneration);
      });
    }, delay);
  }

  #closeEvents() {
    this.#eventGeneration += 1;
    this.#eventSource?.close();
    this.#eventSource = null;
  }

  #signedOut(message: string) {
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    this.#closeEvents();
    this.#update({
      phase: "signed_out",
      stream: "idle",
      error: `${message} Run agentis web again to open a new owner session.`,
    });
  }

  dispose() {
    this.#disposed = true;
    if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;
    this.#closeEvents();
    this.#listeners.clear();
  }
}
