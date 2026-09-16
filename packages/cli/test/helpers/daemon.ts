import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { loadOrCreateOwner, type OwnerSession } from "../../src/auth.js";
import { startServer, type RunningServer } from "../../src/http.js";
import { WorkspaceSnapshot } from "../../src/schema.js";
import type { Snapshot, Store } from "../../src/store.js";

export type Daemon = {
  endpoint: URL;
  owner: OwnerSession;
  server: RunningServer;
  store: Store;
  dataRoot: string;
};

export const codexStub = fileURLToPath(new URL("../codex-stub.mjs", import.meta.url));

const port = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("no port"));
        return;
      }
      const value = address.port;
      server.close((error) => (error ? reject(error) : resolve(value)));
    });
  });

export const boot = async (): Promise<Daemon> => {
  process.env.AGENTIS_CODEX_STUB = codexStub;
  process.env.AGENTIS_CODEX_RPC_TIMEOUT_MS = "5000";
  const dataRoot = mkdtempSync(join(tmpdir(), "agentis-codex-"));
  const endpoint = new URL(`http://127.0.0.1:${await port()}`);
  const server = await Effect.runPromise(
    startServer({
      endpoint,
      dataRoot,
      workspace: join(dataRoot, "scratch"),
      provider: "codex",
      executionBoundary: "unverified-host-scratch",
    }),
  );
  const owner = await Effect.runPromise(loadOrCreateOwner(dataRoot));
  return { endpoint, owner, server, store: server.store, dataRoot };
};

export const command = async (endpoint: URL, token: string, body: unknown) => {
  const response = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
};

export const statusOf = async (
  store: Store,
  endpoint: URL,
  token: string,
  includeEvents = false,
) => {
  const response = await fetch(new URL("/v1/status", endpoint), {
    headers: { authorization: `Bearer ${token}` },
  });
  Schema.decodeUnknownSync(WorkspaceSnapshot)(await response.json());
  return Effect.runPromise(store.snapshot(includeEvents));
};

export const publicStatusOf = async (endpoint: URL, token: string) => {
  const response = await fetch(new URL("/v1/status", endpoint), {
    headers: { authorization: `Bearer ${token}` },
  });
  return Schema.decodeUnknownSync(WorkspaceSnapshot)(await response.json());
};

export const waitFor = async (
  store: Store,
  endpoint: URL,
  token: string,
  match: (snap: Snapshot) => boolean,
  includeEvents = false,
) => {
  const deadline = Date.now() + 4000;
  let snap = await statusOf(store, endpoint, token, includeEvents);
  while (!match(snap)) {
    if (Date.now() > deadline) {
      throw new Error(`codex stub timed out: ${JSON.stringify(snap.runs)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
    snap = await statusOf(store, endpoint, token, includeEvents);
  }
  return snap;
};
