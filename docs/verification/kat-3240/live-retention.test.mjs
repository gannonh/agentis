import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  assessArtifact,
  compareSnapshotIdentity,
  parseTransitions,
} from "./live-retention.mjs";

const snapshot = (suffix = "") => ({
  tasks: [{ id: `task${suffix}` }],
  threads: [{ id: `thread${suffix}` }],
  runs: [{ id: `run${suffix}` }],
  botConfigRevisions: [{ id: `config${suffix}` }],
  evidence: [{ id: `evidence${suffix}` }],
  pending: [{ id: `pending${suffix}` }],
  artifacts: [{ id: `artifact${suffix}` }],
  messages: [{ id: `message${suffix}` }],
  handoffs: [],
});

test("compares every retained public identity without depending on row ordering", () => {
  const before = snapshot();
  const after = Object.fromEntries(
    Object.entries(before).map(([name, rows]) => [name, [...rows].reverse()]),
  );

  assert.deepEqual(compareSnapshotIdentity(before, after), {
    stable: true,
    collections: {
      tasks: { before: ["task"], after: ["task"], stable: true },
      threads: { before: ["thread"], after: ["thread"], stable: true },
      runs: { before: ["run"], after: ["run"], stable: true },
      botConfigRevisions: { before: ["config"], after: ["config"], stable: true },
      evidence: { before: ["evidence"], after: ["evidence"], stable: true },
      pending: { before: ["pending"], after: ["pending"], stable: true },
      artifacts: { before: ["artifact"], after: ["artifact"], stable: true },
      messages: { before: ["message"], after: ["message"], stable: true },
      handoffs: { before: [], after: [], stable: true },
    },
  });

  assert.equal(compareSnapshotIdentity(before, snapshot("-changed")).stable, false);
});

test("assesses authenticated public artifact metadata and bytes", () => {
  const bytes = Buffer.from("KAT3240_PROVIDER_RETAINED\n");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const row = {
    id: "artifact",
    metadataUrl: "/v1/artifacts/artifact",
    contentUrl: "/v1/artifacts/artifact/content",
    byteSize: bytes.byteLength,
    sha256,
  };

  assert.deepEqual(
    assessArtifact({
      endpoint: "http://127.0.0.1:43129",
      row,
      metadataStatus: 200,
      metadata: row,
      contentStatus: 200,
      bytes,
      expectedBody: "KAT3240_PROVIDER_RETAINED",
    }),
    {
      metadataUrl: "http://127.0.0.1:43129/v1/artifacts/artifact",
      contentUrl: "http://127.0.0.1:43129/v1/artifacts/artifact/content",
      metadataStatus: 200,
      contentStatus: 200,
      publicByteSize: bytes.byteLength,
      bytesRead: bytes.byteLength,
      publicSha256: sha256,
      computedSha256: sha256,
      metadataMatches: true,
      contentMatches: true,
      publicPathAbsent: true,
      observedBody: "KAT3240_PROVIDER_RETAINED\n",
      verdict: "PASS",
    },
  );

  assert.equal(
    assessArtifact({
      endpoint: "http://127.0.0.1:43129",
      row,
      metadataStatus: 200,
      metadata: row,
      contentStatus: 200,
      bytes: Buffer.from("changed"),
      expectedBody: "KAT3240_PROVIDER_RETAINED",
    }).verdict,
    "FAIL",
  );
});

test("parses typed SSE transitions and reports repeated cursors", () => {
  const first = {
    cursor: "8",
    id: "event-8",
    event: { kind: "workspace_changed", reason: "task_submitted" },
    createdAt: 1,
  };
  const second = {
    cursor: "9",
    id: "event-9",
    event: { kind: "workspace_changed", reason: "run_succeeded" },
    createdAt: 2,
  };
  const text = `: connected\n\nid: 8\nevent: transition\ndata: ${JSON.stringify(first)}\n\nid: 9\nevent: transition\ndata: ${JSON.stringify(second)}\n\n`;

  assert.deepEqual(parseTransitions(text), {
    transitions: [first, second],
    cursors: ["8", "9"],
    reasons: ["task_submitted", "run_succeeded"],
    duplicateFree: true,
  });
  assert.equal(parseTransitions(`${text}data: ${JSON.stringify(second)}\n\n`).duplicateFree, false);
});
