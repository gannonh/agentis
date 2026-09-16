import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

const retainedCollections = [
  "tasks",
  "threads",
  "runs",
  "botConfigRevisions",
  "evidence",
  "pending",
  "artifacts",
  "messages",
  "handoffs",
];

const ids = (rows) => rows.map((row) => row.id).sort();

export const compareSnapshotIdentity = (before, after) => {
  const collections = Object.fromEntries(
    retainedCollections.map((name) => {
      const beforeIds = ids(before[name]);
      const afterIds = ids(after[name]);
      return [
        name,
        {
          before: beforeIds,
          after: afterIds,
          stable: JSON.stringify(beforeIds) === JSON.stringify(afterIds),
        },
      ];
    }),
  );
  return {
    stable: Object.values(collections).every((collection) => collection.stable),
    collections,
  };
};

export const assessArtifact = ({
  endpoint,
  row,
  metadataStatus,
  metadata,
  contentStatus,
  bytes,
  expectedBody,
}) => {
  const selectedEndpoint = new URL(endpoint);
  const metadataUrl = new URL(row.metadataUrl, selectedEndpoint);
  const contentUrl = new URL(row.contentUrl, selectedEndpoint);
  if (metadataUrl.origin !== selectedEndpoint.origin || contentUrl.origin !== selectedEndpoint.origin) {
    throw new Error("artifact URL escaped the selected endpoint");
  }
  const computedSha256 = createHash("sha256").update(bytes).digest("hex");
  const publicPathAbsent = !Object.hasOwn(row, "path");
  const metadataMatches = metadataStatus === 200 && isDeepStrictEqual(metadata, row);
  const contentMatches =
    contentStatus === 200 &&
    bytes.byteLength === row.byteSize &&
    computedSha256 === row.sha256 &&
    bytes.toString().trim() === expectedBody;
  return {
    metadataUrl: metadataUrl.toString(),
    contentUrl: contentUrl.toString(),
    metadataStatus,
    contentStatus,
    publicByteSize: row.byteSize,
    bytesRead: bytes.byteLength,
    publicSha256: row.sha256,
    computedSha256,
    metadataMatches,
    contentMatches,
    publicPathAbsent,
    observedBody: bytes.toString(),
    verdict:
      metadataMatches && contentMatches && publicPathAbsent ? "PASS" : "FAIL",
  };
};

export const parseTransitions = (text) => {
  const transitions = [...text.matchAll(/^data: (.+)$/gm)]
    .map((match) => JSON.parse(match[1]))
    .filter(
      (value) =>
        typeof value?.cursor === "string" &&
        value?.event?.kind === "workspace_changed" &&
        typeof value.event.reason === "string",
    );
  const cursors = transitions.map((transition) => transition.cursor);
  return {
    transitions,
    cursors,
    reasons: transitions.map((transition) => transition.event.reason),
    duplicateFree: new Set(cursors).size === cursors.length,
  };
};

const cli = resolve("packages/cli/dist/bin.js");
const terminal = new Set(["succeeded", "failed", "canceled", "interrupted"]);
const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));
const requireEvidence = (condition, message) => {
  if (!condition) throw new Error(message);
};

const definitions = {
  mara: {
    provider: "codex",
    marker: "KAT3240_CODEX_RETAINED",
    command: {
      kind: "submit_task",
      bot: "mara",
      coordinator: "mara",
      brief: "Return exactly KAT3240_CODEX_RETAINED and no other text.",
      outcome: "Return exactly KAT3240_CODEX_RETAINED and no other text.",
      constraints: [
        "Use only the supplied materialized read-only source.",
        "Do not call tools, access other files, or mutate any resource.",
      ],
      source: {
        kind: "pasted",
        label: "KAT-3240 marketing launch notes",
        text: "The launch audience is operations leaders. The retained proof marker is KAT3240_CODEX_RETAINED.",
        citations: [
          {
            label: "Owner launch note",
            excerpt: "The launch audience is operations leaders.",
          },
        ],
      },
    },
  },
  ivo: {
    provider: "claude",
    marker: "KAT3240_CLAUDE_RETAINED",
    command: {
      kind: "submit_task",
      bot: "ivo",
      brief: "Return exactly KAT3240_CLAUDE_RETAINED and no other text.",
      outcome: "Return exactly KAT3240_CLAUDE_RETAINED and no other text.",
      constraints: [
        "Use only the supplied materialized read-only GitHub briefing packet.",
        "Do not call tools, access other files, or mutate any resource.",
      ],
      source: {
        kind: "github_briefing",
        label: "KAT-3240 read-only release packet",
        repository: "gannonh/agentis",
        revision: "KAT-3240-live-retention",
        url: "https://github.com/gannonh/agentis/pull/468",
        text: "The release packet is read-only. The retained proof marker is KAT3240_CLAUDE_RETAINED.",
        citations: [
          {
            label: "Read-only release packet",
            excerpt: "The release packet is read-only.",
            url: "https://github.com/gannonh/agentis/pull/468",
          },
        ],
      },
    },
  },
};

const allocateEndpoint = async () => {
  const allocator = createServer();
  await new Promise((done, reject) => {
    allocator.once("error", reject);
    allocator.listen(0, "127.0.0.1", done);
  });
  const address = allocator.address();
  requireEvidence(address && typeof address !== "string", "failed to allocate loopback port");
  const endpoint = `http://127.0.0.1:${address.port}`;
  await new Promise((done, reject) =>
    allocator.close((error) => (error ? reject(error) : done())),
  );
  return endpoint;
};

const startDaemon = async (dataRoot) => {
  const endpoint = await allocateEndpoint();
  const child = spawn(
    process.execPath,
    [
      cli,
      "serve",
      "--endpoint",
      endpoint,
      "--data-root",
      dataRoot,
      "--provider",
      "codex",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout = `${stdout}${chunk}`.slice(-65_536);
  });
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-65_536);
  });
  const exited = new Promise((done) =>
    child.once("exit", (code, signal) => done({ code, signal })),
  );
  const deadline = Date.now() + 20_000;
  let health;
  for (;;) {
    try {
      const response = await fetch(new URL("/v1/health", endpoint));
      if (response.ok) {
        health = await response.json();
        break;
      }
    } catch {}
    if (child.exitCode !== null || Date.now() >= deadline) {
      const reason =
        stderr.trim().split("\n")[0] || stdout.trim().split("\n")[0] || "timeout";
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
      await Promise.race([exited, delay(2_000)]);
      throw new Error(`daemon startup failed: ${reason}`);
    }
    await delay(100);
  }
  const stop = async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    const outcome = await Promise.race([
      exited,
      delay(10_000).then(() => ({ code: null, signal: "timeout" })),
    ]);
    if (outcome.signal === "timeout") {
      child.kill("SIGKILL");
      const forcedOutcome = await exited;
      const endpointGone = await fetch(new URL("/v1/health", endpoint)).then(
        () => false,
        () => true,
      );
      return { ...forcedOutcome, forced: true, endpointGone };
    }
    const endpointGone = await fetch(new URL("/v1/health", endpoint)).then(
      () => false,
      () => true,
    );
    return { ...outcome, forced: false, endpointGone };
  };
  return { endpoint, health, pid: child.pid, stop };
};

const ownerToken = (dataRoot) => {
  const path = join(dataRoot, "owner.token");
  requireEvidence((statSync(path).mode & 0o777) === 0o600, "owner.token is not mode 0600");
  const owner = JSON.parse(readFileSync(path, "utf8"));
  requireEvidence(typeof owner.token === "string" && owner.token.length > 0, "owner token missing");
  return owner.token;
};

const authorization = (token, json = false) => ({
  authorization: `Bearer ${token}`,
  ...(json ? { "content-type": "application/json" } : {}),
});

const getStatus = async (endpoint, token) => {
  const response = await fetch(new URL("/v1/status", endpoint), {
    headers: authorization(token),
  });
  requireEvidence(response.ok, `status returned HTTP ${response.status}`);
  return response.json();
};

const postCommand = async (endpoint, token, command) => {
  const response = await fetch(new URL("/v1/commands", endpoint), {
    method: "POST",
    headers: authorization(token, true),
    body: JSON.stringify({ idempotencyKey: randomUUID(), command }),
  });
  const receipt = await response.json();
  requireEvidence(response.status === 200, `command returned HTTP ${response.status}`);
  requireEvidence(receipt.accepted === true, `command rejected: ${receipt.error ?? "unknown"}`);
  return receipt;
};

const waitForRun = async (endpoint, token, runId, predicate, timeout = 300_000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const snapshot = await getStatus(endpoint, token);
    const run = snapshot.runs.find((candidate) => candidate.id === runId);
    if (run && predicate(run)) return { run, snapshot };
    if (Date.now() >= deadline) throw new Error(`timed out waiting for run ${runId}`);
    await delay(250);
  }
};

const sseReplay = async (endpoint, token, cursor, untilReason) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(new URL(`/v1/events?cursor=${cursor}`, endpoint), {
      headers: authorization(token),
      signal: controller.signal,
    });
    requireEvidence(response.status === 200, `event replay returned HTTP ${response.status}`);
    const reader = response.body?.getReader();
    requireEvidence(reader, "event replay omitted its body");
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      text += decoder.decode(next.value, { stream: true });
      if (parseTransitions(text).reasons.includes(untilReason)) break;
    }
    await reader.cancel();
    const parsed = parseTransitions(text);
    return { httpStatus: response.status, connected: text.includes(": connected"), ...parsed };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
};

const sseReconnect = async (endpoint, token, cursor) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(new URL(`/v1/events?cursor=${cursor}`, endpoint), {
      headers: authorization(token),
      signal: controller.signal,
    });
    requireEvidence(response.status === 200, `event reconnect returned HTTP ${response.status}`);
    const reader = response.body?.getReader();
    requireEvidence(reader, "event reconnect omitted its body");
    const first = await reader.read();
    const text = first.done ? "" : new TextDecoder().decode(first.value);
    await reader.cancel();
    return { httpStatus: response.status, connected: text.includes(": connected") };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
};

const runCli = (args) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    argv: ["node", "packages/cli/dist/bin.js", ...args],
    exitCode: result.status,
    stdout: result.stdout,
    stderrFirstLine: result.stderr.trim().split("\n")[0] || null,
  };
};

const fetchArtifact = async (endpoint, token, row, expectedBody) => {
  const metadata = await fetch(new URL(row.metadataUrl, endpoint), {
    headers: authorization(token),
  });
  const metadataBody = await metadata.json();
  const content = await fetch(new URL(row.contentUrl, endpoint), {
    headers: authorization(token),
  });
  const bytes = Buffer.from(await content.arrayBuffer());
  return assessArtifact({
    endpoint,
    row,
    metadataStatus: metadata.status,
    metadata: metadataBody,
    contentStatus: content.status,
    bytes,
    expectedBody,
  });
};

const commandOutput = (command, cwd = process.cwd()) => {
  const result = spawnSync(command[0], command.slice(1), { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : `unavailable (exit ${result.status})`;
};

const dockerResourceEvidence = (runId) => {
  const containers = spawnSync("docker", ["ps", "-a", "--format", "{{.Names}}"], {
    encoding: "utf8",
  });
  const networks = spawnSync("docker", ["network", "ls", "--format", "{{.Name}}"], {
    encoding: "utf8",
  });
  const expected = runId ? [`agentis-run-${runId}`, `agentis-egress-${runId}`] : [];
  const exactContainers =
    containers.status === 0
      ? containers.stdout
          .trim()
          .split("\n")
          .filter((name) => expected.includes(name))
      : [];
  const exactNetworks =
    networks.status === 0 && runId
      ? networks.stdout
          .trim()
          .split("\n")
          .filter((name) => name === `agentis-net-${runId}`)
      : [];
  return {
    containerQueryExitCode: containers.status,
    networkQueryExitCode: networks.status,
    exactContainers,
    exactNetworks,
    passed:
      containers.status === 0 &&
      networks.status === 0 &&
      exactContainers.length === 0 &&
      exactNetworks.length === 0,
  };
};

const environmentEvidence = () => ({
  node: process.version,
  pnpm: commandOutput(["pnpm", "--version"]),
  packageVersion: JSON.parse(readFileSync("packages/cli/package.json", "utf8")).version,
  os: commandOutput(["uname", "-srm"]),
  docker: commandOutput(["docker", "version", "--format", "{{.Server.Version}}"]),
  images: {
    codex: commandOutput([
      "docker",
      "image",
      "inspect",
      "--format",
      "{{.Id}} {{.Architecture}} {{.Os}}",
      "agentis-codex:0.153.4",
    ]),
    claude: commandOutput([
      "docker",
      "image",
      "inspect",
      "--format",
      "{{.Id}} {{.Architecture}} {{.Os}}",
      "agentis-claude:2.1.263",
    ]),
  },
  providerBoundary: "docker-desktop-run-container",
  host: "sartre",
});

const selectCaseRows = (snapshot, receipt, definition) => {
  const task = snapshot.tasks.find((row) => row.id === receipt.taskId);
  const run = snapshot.runs.find((row) => row.id === receipt.runId);
  const config = snapshot.botConfigRevisions.find(
    (row) => row.id === run?.botConfigRevisionId,
  );
  const source = snapshot.evidence.find((row) => task?.evidence.includes(row.id));
  const artifact = snapshot.artifacts.find((row) => row.runId === receipt.runId);
  const messages = snapshot.messages.filter((row) => row.taskId === receipt.taskId);
  requireEvidence(task && run && config && source, "public task, run, config, or source row is missing");
  requireEvidence(run.status === "succeeded", `provider run ended ${run.status}: ${run.failure}`);
  requireEvidence(artifact, "succeeded run has no public artifact row");
  requireEvidence(config.bot === definition.command.bot, "frozen bot does not match submission");
  requireEvidence(config.provider === definition.provider, "frozen provider does not match case");
  requireEvidence(
    config.executionBoundary === "docker-desktop-run-container",
    "provider did not run in the configured container boundary",
  );
  requireEvidence(run.actionCount === 0 && task.actionCount === 0, "read-only run used an action");
  requireEvidence(source.source === definition.command.source.kind, "source kind was not retained");
  requireEvidence(
    isDeepStrictEqual(task.constraints, definition.command.constraints),
    "operator constraints were not retained",
  );
  requireEvidence(
    isDeepStrictEqual(artifact.citations, definition.command.source.citations),
    "artifact citations do not match the supplied source",
  );
  requireEvidence(artifact.source === definition.provider, "artifact provider attribution mismatch");
  requireEvidence(messages.some((row) => row.kind === "request"), "request message missing");
  requireEvidence(messages.some((row) => row.kind === "result"), "result message missing");
  return { task, run, config, source, artifact, messages };
};

export const runLiveRetention = async ({ dataRoot, bot, output }) => {
  const definition = definitions[bot];
  requireEvidence(definition, "BOT must be mara or ivo");
  requireEvidence(
    !process.env.AGENTIS_CODEX_STUB &&
      !process.env.AGENTIS_CLAUDE_STUB &&
      !process.env.AGENTIS_TEST_DOCKER_LOG,
    "live retention refuses fixture configuration",
  );
  const evidence = {
    schema: "kat-3240-live-provider-retention-v1",
    recordedAt: new Date().toISOString(),
    sourceCommit: commandOutput(["git", "rev-parse", "HEAD"]),
    productSourceDirty:
      spawnSync("git", ["diff", "--quiet", "HEAD", "--", "packages/cli"], {
        encoding: "utf8",
      }).status !== 0,
    harnessSourceDirty:
      spawnSync("git", ["diff", "--quiet", "HEAD", "--", import.meta.filename], {
        encoding: "utf8",
      }).status !== 0,
    dataRoot,
    environment: environmentEvidence(),
    provider: definition.provider,
    bot,
    input: definition.command,
    expected: {
      terminalStatus: "succeeded",
      body: definition.marker,
      publicResourceMutations: 0,
      sessionLoad: "succeeded",
      retainedIdentityAfterLoad: true,
      retainedIdentityAfterRestart: true,
      sseReplayDuplicateFree: true,
      sseReconnectAccepted: true,
      artifactAccessAfterRestart: "PASS",
    },
    status: "UNVERIFIED",
    secretValuesRecorded: false,
    dotenvUsed: false,
  };
  mkdirSync(dirname(output), { recursive: true });
  const persist = () => writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  let daemon;
  try {
    daemon = await startDaemon(dataRoot);
    evidence.initialDaemon = {
      pid: daemon.pid,
      endpoint: daemon.endpoint,
      health: daemon.health,
    };
    requireEvidence(daemon.health.schemaId === "agentis.v2.gate1.0", "unexpected schema");
    requireEvidence(daemon.health.node === "v24.20.0", "daemon Node pin mismatch");
    const token = ownerToken(dataRoot);
    evidence.ownerCredentialPrecheck = {
      mode: "0600",
      tokenPresent: true,
      tokenRecorded: false,
    };
    const before = await getStatus(daemon.endpoint, token);
    evidence.before = { cursor: before.cursor };
    const receipt = await postCommand(daemon.endpoint, token, definition.command);
    evidence.submission = receipt;
    const completed = await waitForRun(
      daemon.endpoint,
      token,
      receipt.runId,
      (run) => terminal.has(run.status),
    );
    const rows = selectCaseRows(completed.snapshot, receipt, definition);
    evidence.persistedResult = {
      task: rows.task,
      run: rows.run,
      botConfigRevision: rows.config,
      source: rows.source,
      artifact: rows.artifact,
      messages: rows.messages,
      cursor: completed.snapshot.cursor,
    };
    const replay = await sseReplay(
      daemon.endpoint,
      token,
      before.cursor,
      "run_succeeded",
    );
    requireEvidence(replay.connected, "SSE replay did not connect");
    requireEvidence(replay.duplicateFree, "SSE replay repeated a cursor");
    requireEvidence(replay.reasons.includes("task_submitted"), "SSE replay omitted submission");
    requireEvidence(replay.reasons.includes("run_succeeded"), "SSE replay omitted completion");
    evidence.sseReplay = replay;

    const load = runCli([
      "session",
      "load",
      "--endpoint",
      daemon.endpoint,
      "--data-root",
      dataRoot,
      "--run",
      receipt.runId,
    ]);
    requireEvidence(load.exitCode === 0, `CLI session load exited ${load.exitCode}`);
    const loadReceipt = JSON.parse(load.stdout);
    requireEvidence(loadReceipt.accepted === true, "CLI session load was rejected");
    const loaded = await waitForRun(
      daemon.endpoint,
      token,
      receipt.runId,
      (run) => run.providerLoadStatus === "succeeded" || run.providerLoadStatus === "failed",
    );
    requireEvidence(loaded.run.providerLoadStatus === "succeeded", "provider session load failed");
    const loadIdentity = compareSnapshotIdentity(completed.snapshot, loaded.snapshot);
    requireEvidence(loadIdentity.stable, "session load changed public identities");
    evidence.providerReconnect = {
      command: load.argv,
      exitCode: load.exitCode,
      receipt: loadReceipt,
      loadStatus: loaded.run.providerLoadStatus,
      retainedIdentity: loadIdentity,
    };

    evidence.initialDaemon.cleanup = await daemon.stop();
    requireEvidence(
      !evidence.initialDaemon.cleanup.forced && evidence.initialDaemon.cleanup.endpointGone,
      "initial daemon did not stop cleanly",
    );
    daemon = null;
    const restarted = await startDaemon(dataRoot);
    daemon = restarted;
    evidence.restartedDaemon = {
      pid: restarted.pid,
      endpoint: restarted.endpoint,
      health: restarted.health,
    };
    const restartedToken = ownerToken(dataRoot);
    const restored = await getStatus(restarted.endpoint, restartedToken);
    const restartIdentity = compareSnapshotIdentity(loaded.snapshot, restored);
    requireEvidence(restartIdentity.stable, "daemon restart changed public identities");
    evidence.refreshAfterRestart = {
      cursor: restored.cursor,
      retainedIdentity: restartIdentity,
    };
    const reconnect = await sseReconnect(restarted.endpoint, restartedToken, restored.cursor);
    requireEvidence(reconnect.connected, "SSE reconnect did not accept restored cursor");
    evidence.sseReconnect = reconnect;

    const restoredArtifact = restored.artifacts.find((row) => row.id === rows.artifact.id);
    requireEvidence(restoredArtifact, "artifact missing after daemon restart");
    const artifact = await fetchArtifact(
      restarted.endpoint,
      restartedToken,
      restoredArtifact,
      definition.marker,
    );
    requireEvidence(artifact.verdict === "PASS", "artifact metadata or content did not match");
    evidence.artifactAccessAfterRestart = artifact;

    const doctor = runCli([
      "doctor",
      "--endpoint",
      restarted.endpoint,
      "--data-root",
      dataRoot,
    ]);
    requireEvidence(doctor.exitCode === 0, `CLI doctor exited ${doctor.exitCode}`);
    const doctorBody = JSON.parse(doctor.stdout);
    requireEvidence(doctorBody.health?.ok === true, "CLI doctor health failed");
    requireEvidence(
      doctorBody.status?.artifacts?.some((row) => row.id === restoredArtifact.id),
      "CLI doctor omitted restored artifact",
    );
    evidence.cliDoctor = {
      command: doctor.argv,
      exitCode: doctor.exitCode,
      health: doctorBody.health,
      restoredTaskId: receipt.taskId,
      restoredRunId: receipt.runId,
      restoredArtifactId: restoredArtifact.id,
    };
    evidence.status = "PASS";
  } catch (error) {
    evidence.status = "FAIL";
    evidence.failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (daemon) {
      const cleanup = await daemon.stop();
      if (evidence.restartedDaemon) evidence.restartedDaemon.cleanup = cleanup;
      else if (evidence.initialDaemon) evidence.initialDaemon.cleanup = cleanup;
      if ((cleanup.forced || !cleanup.endpointGone) && evidence.status === "PASS") {
        evidence.status = "FAIL";
      }
    }
    evidence.cleanup = dockerResourceEvidence(evidence.submission?.runId);
    if (!evidence.cleanup.passed && evidence.status === "PASS") evidence.status = "FAIL";
    persist();
  }
  return evidence;
};

const invokedDirectly =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedDirectly) {
  const [dataRoot, bot, output] = process.argv.slice(2);
  if (!dataRoot || !bot || !output) {
    process.stderr.write("usage: node docs/verification/kat-3240/live-retention.mjs DATA_ROOT mara|ivo OUTPUT\n");
    process.exitCode = 2;
  } else {
    try {
      const result = await runLiveRetention({ dataRoot: resolve(dataRoot), bot, output: resolve(output) });
      process.stdout.write(
        `${JSON.stringify({ status: result.status, provider: result.provider, output: resolve(output) })}\n`,
      );
      if (result.status !== "PASS") process.exitCode = 1;
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  }
}
