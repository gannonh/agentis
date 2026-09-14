import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import {
  mkdtempSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { describe, expect, it, vi } from "vitest";
import { RAW_ROUTE_KEYS } from "../src/api.js";
import { loadOrCreateOwner } from "../src/auth.js";
import { runCli } from "../src/cli.js";
import { RAW_HANDLER_ROUTE_KEYS, startServer } from "../src/http.js";
import { newIdempotencyKey } from "../src/ids.js";
import { WorkspaceSnapshot } from "../src/schema.js";

const port = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("no port"));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });

const boot = async (
  provider: "fake" | "codex" | "claude" = "fake",
  executionBoundary:
    | "unverified-host-scratch"
    | "docker-desktop-run-container"
    | "docker-fixture-container" = "unverified-host-scratch",
) => {
  const dataRoot = mkdtempSync(join(tmpdir(), "agentis-browser-http-"));
  const endpoint = new URL(`http://127.0.0.1:${await port()}`);
  const server = await Effect.runPromise(
    startServer({
      endpoint,
      dataRoot,
      workspace: join(dataRoot, "scratch"),
      provider,
      executionBoundary,
    }),
  );
  const owner = await Effect.runPromise(loadOrCreateOwner(dataRoot));
  return { dataRoot, endpoint, owner, server };
};

const browserSession = async (endpoint: URL, token: string) => {
  const issued = await fetch(new URL("/v1/browser/bootstrap", endpoint), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  expect(issued.status).toBe(200);
  const issue = (await issued.json()) as { url: string; expiresAt: number };
  const code = new URLSearchParams(new URL(issue.url).hash.slice(1)).get("bootstrap");
  if (!code) throw new Error("bootstrap URL omitted its fragment code");
  const exchanged = await fetch(new URL("/v1/browser/session", endpoint), {
    method: "POST",
    headers: { "content-type": "application/json", origin: endpoint.origin },
    body: JSON.stringify({ code }),
  });
  const exchange = (await exchanged.json()) as { csrfToken: string; expiresAt: number };
  const setCookies = exchanged.headers.getSetCookie();
  return {
    code,
    exchange,
    setCookies,
    cookie: setCookies.map((value) => value.split(";", 1)[0]).join("; "),
  };
};

const browserPost = (
  endpoint: URL,
  session: Awaited<ReturnType<typeof browserSession>>,
  path: string,
  payload: unknown,
) =>
  fetch(new URL(path, endpoint), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
      origin: endpoint.origin,
      "x-agentis-csrf": session.exchange.csrfToken,
    },
    body: JSON.stringify(payload),
  });

const browserStatus = async (
  endpoint: URL,
  session: Awaited<ReturnType<typeof browserSession>>,
) => {
  const response = await fetch(new URL("/v1/status", endpoint), {
    headers: { cookie: session.cookie },
  });
  return Schema.decodeUnknownSync(WorkspaceSnapshot)(await response.json());
};

const statusWithHost = (endpoint: URL, host: string) =>
  new Promise<number>((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: "/v1/health",
        headers: { host },
      },
      (response) => {
        response.resume();
        response.once("end", () => resolve(response.statusCode ?? 0));
      },
    );
    request.once("error", reject);
    request.end();
  });

describe("browser HTTP boundary", () => {
  it("uses one-use fragment bootstrap, persisted setup, CSRF, and idempotent commands", async () => {
    const { endpoint, owner, server } = await boot();
    try {
      const session = await browserSession(endpoint, owner.token);
      expect(session.setCookies).toHaveLength(2);
      expect(
        session.setCookies.some(
          (value) =>
            value.startsWith("agentis_session=") &&
            /HttpOnly/i.test(value) &&
            /SameSite=Strict/i.test(value),
        ),
      ).toBe(true);
      expect(
        session.setCookies.some(
          (value) => value.startsWith("agentis_csrf=") && /SameSite=Strict/i.test(value),
        ),
      ).toBe(true);

      const replay = await fetch(new URL("/v1/browser/session", endpoint), {
        method: "POST",
        headers: { "content-type": "application/json", origin: endpoint.origin },
        body: JSON.stringify({ code: session.code }),
      });
      expect(replay.status).toBe(409);

      const beforeSetup = await browserStatus(endpoint, session);
      expect(beforeSetup.session.provider).toMatchObject({
        kind: "fake",
        eligible: true,
        acknowledgedAt: null,
      });
      const missingCsrf = await fetch(new URL("/v1/browser/setup", endpoint), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: session.cookie,
          origin: endpoint.origin,
        },
        body: JSON.stringify({ provider: "fake", sources: ["pasted"] }),
      });
      expect(missingCsrf.status).toBe(403);
      const setup = await browserPost(endpoint, session, "/v1/browser/setup", {
        provider: "fake",
        sources: ["pasted", "github_briefing"],
      });
      expect(setup.status).toBe(200);

      const idempotencyKey = newIdempotencyKey();
      const command = {
        idempotencyKey,
        command: {
          kind: "submit_task",
          coordinator: "mara",
          brief: "Prepare the business recommendation",
          outcome: "A cited business recommendation",
          constraints: ["No external writes"],
          source: {
            kind: "pasted",
            label: "Owner notes",
            text: "Retain this supplied context across refresh.",
            citations: [{ label: "Owner note", excerpt: "supplied context" }],
          },
        },
      };
      const submitted = await browserPost(endpoint, session, "/v1/commands", command);
      expect(submitted.status).toBe(200);
      const receipt = (await submitted.json()) as { accepted: boolean; replayed: boolean };
      expect(receipt).toMatchObject({ accepted: true, replayed: false });
      const retried = await browserPost(endpoint, session, "/v1/commands", command);
      expect(retried.status).toBe(200);
      expect(await retried.json()).toMatchObject({ accepted: true, replayed: true, effects: [] });

      const firstRefresh = await browserStatus(endpoint, session);
      const secondRefresh = await browserStatus(endpoint, session);
      expect(firstRefresh).toEqual(secondRefresh);
      expect(firstRefresh.tasks).toHaveLength(1);
      expect(firstRefresh.threads).toHaveLength(1);
      expect(firstRefresh.artifacts).toHaveLength(1);
      expect(firstRefresh.messages.filter((message) => message.kind === "request")).toHaveLength(1);
      const encoded = JSON.stringify(firstRefresh);
      expect(encoded).not.toContain(owner.sessionId);
      expect(encoded).not.toContain("ownerSession");
      expect(encoded).not.toContain("workspaceId");
      expect(encoded).not.toContain("providerState");
      expect(encoded).not.toContain("dedupeKey");
      expect(encoded).not.toContain("/scratch/runs/");

      const artifact = firstRefresh.artifacts[0];
      if (!artifact) throw new Error("missing artifact");
      const metadata = await fetch(new URL(artifact.metadataUrl, endpoint), {
        headers: { cookie: session.cookie },
      });
      expect(metadata.status).toBe(200);
      expect(await metadata.json()).toEqual(artifact);
      const content = await fetch(new URL(artifact.contentUrl, endpoint), {
        headers: { cookie: session.cookie },
      });
      expect(content.status).toBe(200);
      expect(content.headers.get("content-disposition")).toMatch(/^inline/);
      expect(await content.text()).toContain("A cited business recommendation");
      expect(artifact.citations).toEqual([
        { label: "Owner note", excerpt: "supplied context" },
      ]);

      const github = await browserPost(endpoint, session, "/v1/commands", {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "submit_task",
          coordinator: "mara",
          brief: "Assess the supplied release packet",
          outcome: "A revision-specific release assessment",
          source: {
            kind: "github_briefing",
            label: "Release packet",
            repository: "agentis/example",
            revision: "abc123",
            url: "https://github.com/agentis/example/tree/abc123",
            text: "The supplied packet is read-only and cites revision abc123.",
            citations: [{ label: "Packet", excerpt: "revision abc123" }],
          },
        },
      });
      expect(github.status).toBe(200);
      const bothSources = await browserStatus(endpoint, session);
      expect(bothSources.evidence.map((item) => item.source).sort()).toEqual([
        "github_briefing",
        "pasted",
      ]);
      expect(bothSources.evidence.find((item) => item.source === "github_briefing")).toMatchObject({
        repository: "agentis/example",
        revision: "abc123",
      });
      const githubArtifact = bothSources.artifacts.at(-1);
      if (!githubArtifact) throw new Error("missing GitHub briefing artifact");
      const githubContent = await fetch(new URL(githubArtifact.contentUrl, endpoint), {
        headers: { cookie: session.cookie },
      });
      expect(await githubContent.text()).toContain("revision abc123");
    } finally {
      await server.close();
    }
  });

  it("prints a one-use fragment URL from the CLI without opening a browser", async () => {
    const { dataRoot, endpoint, server } = await boot();
    const output: string[] = [];
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation((chunk: string | Uint8Array) => {
        output.push(String(chunk));
        return true;
      });
    try {
      await expect(
        runCli(["web", "--endpoint", endpoint.origin, "--data-root", dataRoot]),
      ).resolves.toBe(0);
      const url = new URL(output.join("").trim());
      expect(url.origin).toBe(endpoint.origin);
      expect(url.searchParams.has("bootstrap")).toBe(false);
      expect(new URLSearchParams(url.hash.slice(1)).get("bootstrap")).toBeTruthy();
    } finally {
      write.mockRestore();
      await server.close();
    }
  });

  it("exposes and enforces configured provider connection readiness", async () => {
    const originalStub = process.env.AGENTIS_CODEX_STUB;
    delete process.env.AGENTIS_CODEX_STUB;
    const { endpoint, owner, server } = await boot("codex");
    try {
      const session = await browserSession(endpoint, owner.token);
      const status = await browserStatus(endpoint, session);
      expect(status.session.provider).toMatchObject({
        kind: "codex",
        eligible: false,
        acknowledgedAt: null,
      });
      expect(status.session.provider.ineligibleReason).toMatch(/requires.*provider container/i);
      const setup = await browserPost(endpoint, session, "/v1/browser/setup", {
        provider: "codex",
        sources: ["pasted"],
      });
      expect(setup.status).toBe(403);
      const db = new DatabaseSync(server.store.path);
      db.prepare(
        "UPDATE browser_sessions SET provider_acknowledged_at=1,source_acknowledgements_json=?",
      ).run(JSON.stringify([{ source: "pasted", acknowledgedAt: 1 }]));
      db.close();
      const staleAcknowledgement = await browserPost(endpoint, session, "/v1/commands", {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "submit_task",
          brief: "Must remain gated",
          source: { kind: "pasted", label: "Notes", text: "Source", citations: [] },
        },
      });
      expect(staleAcknowledgement.status).toBe(403);
      expect(await staleAcknowledgement.json()).toMatchObject({
        code: "forbidden",
        message: expect.stringMatching(/requires.*provider container/i),
      });
    } finally {
      if (originalStub === undefined) delete process.env.AGENTIS_CODEX_STUB;
      else process.env.AGENTIS_CODEX_STUB = originalStub;
      await server.close();
    }
  });

  it("enforces exact Host and Origin and publishes the Effect route contract", async () => {
    const { endpoint, owner, server } = await boot();
    try {
      expect(await statusWithHost(endpoint, `localhost:${endpoint.port}`)).toBe(400);
      const issued = await fetch(new URL("/v1/browser/bootstrap", endpoint), {
        method: "POST",
        headers: { authorization: `Bearer ${owner.token}` },
      });
      const issue = (await issued.json()) as { url: string };
      const code = new URLSearchParams(new URL(issue.url).hash.slice(1)).get("bootstrap");
      const wrongOrigin = await fetch(new URL("/v1/browser/session", endpoint), {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:1" },
        body: JSON.stringify({ code }),
      });
      expect(wrongOrigin.status).toBe(403);
      const document = (await (
        await fetch(new URL("/v1/openapi.json", endpoint))
      ).json()) as { paths: Record<string, unknown> };
      expect(Object.keys(document.paths)).toEqual(
        expect.arrayContaining([
          "/v1/health",
          "/v1/browser/session",
          "/v1/browser/setup",
          "/v1/status",
          "/v1/commands",
          "/v1/events",
          "/v1/artifacts/{id}",
          "/v1/artifacts/{id}/content",
        ]),
      );
      expect(RAW_HANDLER_ROUTE_KEYS).toEqual(RAW_ROUTE_KEYS);
      expect(JSON.stringify(document)).toContain("payload_too_large");
      expect(JSON.stringify(document)).toContain("internal_error");

      const oversized = await fetch(new URL("/v1/commands", endpoint), {
        method: "POST",
        headers: {
          authorization: `Bearer ${owner.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ oversized: "x".repeat(2 * 1024 * 1024) }),
      });
      expect(oversized.status).toBe(413);
      expect(await oversized.json()).toEqual({
        code: "payload_too_large",
        message: "JSON request bodies are limited to 2 MiB.",
      });
      const missingAsset = await fetch(new URL("/assets/missing.js", endpoint));
      expect(missingAsset.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  it("authenticates and streams large verified artifacts while rejecting changed paths", async () => {
    const { dataRoot, endpoint, owner, server } = await boot();
    try {
      const session = await browserSession(endpoint, owner.token);
      await browserPost(endpoint, session, "/v1/browser/setup", {
        provider: "fake",
        sources: ["pasted"],
      });
      await browserPost(endpoint, session, "/v1/commands", {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "submit_task",
          brief: "Integrity proof",
          source: { kind: "pasted", label: "Notes", text: "Proof", citations: [] },
        },
      });
      const internal = await Effect.runPromise(server.store.snapshot());
      const artifact = internal.artifacts[0];
      if (!artifact) throw new Error("missing test artifact");
      const original = readFileSync(artifact.path);

      const unauthenticated = await fetch(new URL(artifact.contentUrl, endpoint));
      expect(unauthenticated.status).toBe(401);
      writeFileSync(artifact.path, "changed");
      expect(
        (await fetch(new URL(artifact.contentUrl, endpoint), {
          headers: { cookie: session.cookie },
        })).status,
      ).toBe(409);

      const outsideRoot = mkdtempSync(join(tmpdir(), "agentis-artifact-outside-"));
      const outside = join(outsideRoot, "matching.md");
      writeFileSync(outside, original);
      unlinkSync(artifact.path);
      symlinkSync(outside, artifact.path);
      expect(
        (await fetch(new URL(artifact.contentUrl, endpoint), {
          headers: { cookie: session.cookie },
        })).status,
      ).toBe(409);

      const db = new DatabaseSync(server.store.path);
      db.prepare("UPDATE artifacts SET path=? WHERE id=?").run(outside, artifact.id);
      db.close();
      expect(
        (await fetch(new URL(artifact.contentUrl, endpoint), {
          headers: { cookie: session.cookie },
        })).status,
      ).toBe(409);

      const large = Buffer.alloc(16 * 1024 * 1024 + 1, 0x61);
      const largePath = join(dataRoot, "scratch", "large-result.bin");
      const largeDigest = createHash("sha256").update(large).digest("hex");
      writeFileSync(largePath, large);
      const insert = new DatabaseSync(server.store.path);
      insert
        .prepare(
          `INSERT INTO artifacts
             (id,task_id,run_id,author,source,media_type,sha256,byte_size,path,citations_json,created_at)
           VALUES ('artifact_large',?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          artifact.taskId,
          artifact.runId,
          "mara",
          "fake",
          "application/octet-stream",
          largeDigest,
          large.byteLength,
          largePath,
          "[]",
          Date.now(),
        );
      insert.close();
      const streamed = await fetch(new URL("/v1/artifacts/artifact_large/content", endpoint), {
        headers: { cookie: session.cookie },
      });
      expect(streamed.status).toBe(200);
      expect(streamed.headers.get("content-disposition")).toMatch(/^attachment/);
      const digest = createHash("sha256");
      let bytes = 0;
      const reader = streamed.body?.getReader();
      if (!reader) throw new Error("missing artifact stream");
      for (;;) {
        const next = await reader.read();
        if (next.done) break;
        bytes += next.value.byteLength;
        digest.update(next.value);
      }
      expect(bytes).toBe(large.byteLength);
      expect(digest.digest("hex")).toBe(largeDigest);
    } finally {
      await server.close();
    }
  });

  it("requires a cursor, resumes without duplicates, and expires only the replay window", async () => {
    const { endpoint, owner, server } = await boot();
    try {
      const session = await browserSession(endpoint, owner.token);
      await browserPost(endpoint, session, "/v1/browser/setup", {
        provider: "fake",
        sources: ["pasted"],
      });
      const missing = await fetch(new URL("/v1/events", endpoint), {
        headers: { cookie: session.cookie },
      });
      expect(missing.status).toBe(400);
      const before = await browserStatus(endpoint, session);
      const stream = await fetch(new URL(`/v1/events?cursor=${before.cursor}`, endpoint), {
        headers: { cookie: session.cookie },
      });
      const reader = stream.body?.getReader();
      if (!reader) throw new Error("missing SSE body");
      await browserPost(endpoint, session, "/v1/commands", {
        idempotencyKey: newIdempotencyKey(),
        command: {
          kind: "submit_task",
          brief: "Reconnect proof",
          source: {
            kind: "pasted",
            label: "Reconnect input",
            text: "one",
            citations: [],
          },
        },
      });
      const decoder = new TextDecoder();
      let text = "";
      const deadline = Date.now() + 2_000;
      while (!text.includes("task_submitted") && Date.now() < deadline) {
        const next = await reader.read();
        if (next.done) break;
        text += decoder.decode(next.value);
      }
      await reader.cancel();
      const ids = [...text.matchAll(/^id: ([0-9]+)$/gm)].map((match) => match[1]);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
      expect(text).toContain('"kind":"workspace_changed"');
      expect(text).toContain('"reason":"task_submitted"');

      const db = new DatabaseSync(server.store.path);
      const insert = db.prepare(
        "INSERT INTO events (id, type, body, created_at) VALUES (?, 'peer_progress', '{}', ?)",
      );
      for (let index = 0; index < 140; index += 1) insert.run(`old_${index}`, index);
      const retained = (
        db.prepare("SELECT COUNT(*) AS count FROM events").get() as { count: number }
      ).count;
      db.close();
      const expired = await fetch(new URL("/v1/events?cursor=0", endpoint), {
        headers: { cookie: session.cookie },
      });
      expect(expired.status).toBe(410);
      expect(await expired.json()).toMatchObject({ code: "cursor_expired" });
      const after = new DatabaseSync(server.store.path);
      expect(
        (after.prepare("SELECT COUNT(*) AS count FROM events").get() as { count: number }).count,
      ).toBe(retained);
      after.close();
    } finally {
      await server.close();
    }
  });
});
