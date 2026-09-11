import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { applyRepoEnv } from "./lib/load-repo-env.mjs";

applyRepoEnv();

const [dataRoot] = process.argv.slice(2);
if (!dataRoot) throw new Error("Pass the dedicated provider data root");
if (
  process.env.AGENTIS_CODEX_STUB ||
  process.env.AGENTIS_CLAUDE_STUB ||
  process.env.AGENTIS_TEST_DOCKER_LOG
)
  throw new Error("Live conformance refuses fixture configuration");
const allocator = createServer();
await new Promise((done) => allocator.listen(0, "127.0.0.1", done));
const endpoint = `http://127.0.0.1:${allocator.address().port}`;
await new Promise((done) => allocator.close(done));
const daemon = spawn(
  process.execPath,
  [
    resolve("packages/cli/dist/bin.js"),
    "serve",
    "--endpoint",
    endpoint,
    "--data-root",
    dataRoot,
    "--provider",
    "codex",
  ],
  { stdio: "ignore" },
);
const exited = new Promise((done) => daemon.on("exit", done));
const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const results = [];
const createdRuns = [];
let token;
const headers = () => ({ authorization: `Bearer ${token}`, "content-type": "application/json" });
const status = async () => {
  const response = await fetch(`${endpoint}/v1/status`, { headers: headers() });
  if (!response.ok) throw new Error(`Status HTTP ${response.status}`);
  return response.json();
};
const command = async (value, key = randomUUID()) => {
  const response = await fetch(`${endpoint}/v1/commands`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ idempotencyKey: key, command: value }),
  });
  return { httpStatus: response.status, ...(await response.json()) };
};
const accept = async (value, key) => {
  const receipt = await command(value, key);
  if (!receipt.accepted)
    throw new Error(`Command rejected: ${receipt.error ?? receipt.httpStatus}`);
  if (receipt.effects.includes("launch")) createdRuns.push(receipt.runId);
  return receipt;
};
const terminal = (run) => ["succeeded", "failed", "canceled", "interrupted"].includes(run?.status);
const wait = async (predicate, limit = 120000) => {
  const deadline = Date.now() + limit;
  for (;;) {
    const snapshot = await status();
    if (predicate(snapshot)) return snapshot;
    if (Date.now() > deadline) throw new Error("Timed out waiting for expected state");
    await delay(200);
  }
};
const require = (condition, message) => {
  if (!condition) throw new Error(message);
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const record = async (name, work) => {
  const result = { case: name, startedAt: new Date().toISOString(), status: "UNVERIFIED" };
  results.push(result);
  try {
    await work(result);
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.reason = error.message;
    process.exitCode = 1;
  }
  console.log(JSON.stringify(result));
};
try {
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      if ((await fetch(`${endpoint}/v1/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline || daemon.exitCode !== null) throw new Error("Daemon startup failed");
    await delay(100);
  }
  token = JSON.parse(readFileSync(join(dataRoot, "owner.token"), "utf8")).token;
  require(!(await status()).stopAll, "Data root stop-all already latched");
  if (!process.argv.includes("--concurrency-only"))
    await record("accepted-handoff", async (result) => {
      const source = await accept({
        kind: "submit_task",
        bot: "mara",
        brief: "Reply exactly SOURCE_CONTEXT_KAT3243. Do not use tools or access files.",
      });
      result.source = source;
      const sourceState = await wait((snapshot) =>
        terminal(snapshot.runs.find((run) => run.id === source.runId)),
      );
      const sourceRun = sourceState.runs.find((run) => run.id === source.runId);
      const sourceArtifact = sourceState.artifacts.find(
        (artifact) => artifact.runId === source.runId,
      );
      require(sourceRun.status === "succeeded" && sourceArtifact, "Mara source did not succeed");
      require(readFileSync(sourceArtifact.path, "utf8").trim() ===
        "SOURCE_CONTEXT_KAT3243", "Source marker mismatch");
      const proposal = {
        kind: "propose_handoff",
        sourceRunId: source.runId,
        recipient: "ivo",
        context:
          "Produce exactly SPECIALIST_DRAFT_KAT3243 as the complete draft text. This is a text-only draft with no tools, resource changes, or onward delegation.",
      };
      const key = randomUUID();
      const receipt = await accept(proposal, key);
      result.recipient = receipt;
      const done = await wait((snapshot) =>
        terminal(snapshot.runs.find((run) => run.id === receipt.runId)),
      );
      const run = done.runs.find((run) => run.id === receipt.runId);
      const task = done.tasks.find((task) => task.id === source.taskId);
      const handoff = done.handoffs.find((handoff) => handoff.id === receipt.handoffId);
      const artifact = done.artifacts.find((artifact) => artifact.runId === receipt.runId);
      Object.assign(result, {
        sourceFrozen: sourceRun.frozen,
        recipientFrozen: run.frozen,
        sourceProviderSessionId: sourceRun.providerSessionId,
        recipientProviderSessionId: run.providerSessionId,
        handoff,
        task,
        runStatus: run.status,
        failure: run.providerState.failure,
        artifact: artifact ?? null,
        history: run.providerState.history,
      });
      require(run.status === "succeeded" &&
        handoff.state === "accepted" &&
        task.botName === "ivo", "Recipient did not accept and complete");
      require(artifact &&
        artifact.taskId === source.taskId &&
        artifact.author === "ivo", "Artifact identity or attribution mismatch");
      const body = readFileSync(artifact.path, "utf8");
      result.body = body;
      require(body.trim() === "SPECIALIST_DRAFT_KAT3243", "Specialist marker mismatch");
      require(createHash("sha256").update(body).digest("hex") ===
        artifact.sha256, "Artifact digest mismatch");
      const events = done.events.map((event) => ({ type: event.type, ...JSON.parse(event.body) }));
      result.attributedEvents = events.filter(
        (event) =>
          event.handoffId === receipt.handoffId ||
          (event.type === "peer_progress" && event.runId === receipt.runId),
      );
      require(events.filter(
        (event) => event.type === "handoff_accepted" && event.handoffId === receipt.handoffId,
      ).length === 1, "Ownership transfer was not unique");
      require(events.some(
        (event) =>
          event.type === "handoff_artifact" &&
          event.artifactId === artifact.id &&
          event.threadId === source.threadId &&
          event.author === "ivo",
      ), "Artifact not returned to originating conversation");
      require(events.some(
        (event) =>
          event.type === "peer_progress" &&
          event.runId === receipt.runId &&
          event.threadId === source.threadId &&
          event.author === "ivo",
      ), "Peer progress attribution missing");
      result.sameKeyReplay = await command(proposal, key);
      result.newKeyDuplicate = await command(proposal);
      require(result.sameKeyReplay.replayed &&
        !result.newKeyDuplicate.accepted, "Duplicate proposal dispatched");
      await accept({ kind: "load_session", runId: receipt.runId });
      const loaded = await wait((snapshot) =>
        ["succeeded", "failed"].includes(
          snapshot.runs.find((item) => item.id === receipt.runId)?.providerState.loadStatus,
        ),
      );
      const restored = loaded.runs.find((item) => item.id === receipt.runId);
      result.loadStatus = restored.providerState.loadStatus;
      result.loadIdentityAndHistoryUnchanged =
        restored.providerSessionId === run.providerSessionId &&
        same(restored.providerState.history, run.providerState.history) &&
        same(loaded.artifacts, done.artifacts) &&
        same(loaded.messages, done.messages);
      require(result.loadStatus === "succeeded" &&
        result.loadIdentityAndHistoryUnchanged, "Recipient session load failed or changed output/history");
      result.nativeTaskEnforcement =
        "Native delegation tools are structurally excluded from both handoff turns; native init inventory is validated by the bridge";
    });
  for (const runId of createdRuns) {
    const run = (await status()).runs.find((run) => run.id === runId);
    if (!terminal(run)) await command({ kind: "cancel_run", runId });
  }
  await record("concurrency-and-stop-all", async (result) => {
    const brief =
      'Run exactly node -e "console.log(3243)" once. Request approval. Do not access files or use other tools. Then return the output as text.';
    const mara = await accept({ kind: "submit_task", bot: "mara", brief });
    await wait(
      (snapshot) =>
        snapshot.runs.find((run) => run.id === mara.runId)?.status === "waiting_approval" ||
        terminal(snapshot.runs.find((run) => run.id === mara.runId)),
    );
    require((await status()).runs.find((run) => run.id === mara.runId)?.status ===
      "waiting_approval", "Mara did not hold approval");
    result.perBotRejection = await command({ kind: "submit_task", bot: "mara", brief: "extra" });
    require(!result.perBotRejection.accepted &&
      result.perBotRejection.error?.includes("per-bot"), "Per-bot limit bypassed");
    const ivo = await accept({ kind: "submit_task", bot: "ivo", brief });
    const waiting = await wait(
      (snapshot) =>
        snapshot.runs.find((run) => run.id === ivo.runId)?.status === "waiting_approval" ||
        terminal(snapshot.runs.find((run) => run.id === ivo.runId)),
    );
    const peers = waiting.runs.filter((run) => [mara.runId, ivo.runId].includes(run.id));
    result.runs = peers;
    require(peers.length === 2 &&
      peers.every(
        (run) => run.status === "waiting_approval",
      ), "Both peers were not concurrently active");
    require(peers[0].providerSessionId !==
      peers[1].providerSessionId, "Provider sessions conflated");
    require(peers.some((run) => run.frozen.bot === "mara" && run.frozen.provider === "codex") &&
      peers.some(
        (run) => run.frozen.bot === "ivo" && run.frozen.provider === "claude",
      ), "Frozen bot configuration conflated");
    result.globalRejection = await command({ kind: "submit_task", bot: "ivo", brief: "extra" });
    require(!result.globalRejection.accepted &&
      result.globalRejection.error?.includes("global"), "Global limit bypassed");
    result.stopReceipt = await accept({ kind: "stop_all" });
    await delay(750);
    const stopped = await status();
    result.finalRuns = stopped.runs.filter((run) => peers.some((peer) => peer.id === run.id));
    require(stopped.stopAll &&
      result.finalRuns.every((run) => run.status === "canceled"), "Stop-all did not cancel peers");
    require(!stopped.artifacts.some((artifact) =>
      peers.some((peer) => peer.id === artifact.runId),
    ), "Canceled peer produced an artifact");
    const approvals = waiting.pending.filter(
      (action) => peers.some((peer) => peer.id === action.runId) && action.approvalId,
    );
    result.lateApprovals = [];
    for (const approval of approvals)
      result.lateApprovals.push(
        await command({
          kind: "resolve_approval",
          approvalId: approval.approvalId,
          decision: "allowed",
        }),
      );
    require(result.lateApprovals.every(
      (receipt) => !receipt.accepted,
    ), "Late approval revived stopped work");
    const containers = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
    result.cleaned =
      containers.status === 0 && peers.every((peer) => !containers.stdout.includes(peer.id));
    require(result.cleaned, "Peer containers remain active");
  });
} finally {
  daemon.kill("SIGTERM");
  await exited;
  writeFileSync(
    "docs/verification/kat-3243/evidence/responses/live-handoff-conformance.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        sourceCommit: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
        productSourceDirty:
          spawnSync("git", ["diff", "--quiet", "HEAD", "--", "packages/cli"]).status !== 0,
        fixtureMode: false,
        dataRoot,
        results,
      },
      null,
      2,
    ) + "\n",
  );
}
