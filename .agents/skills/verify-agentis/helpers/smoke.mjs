#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { arch, machine, platform, release, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const repo = resolve(process.cwd());
const cli = resolve(repo, "packages/cli/dist/bin.js");
const [evidenceArgument, ...extra] = process.argv.slice(2);
const launchLimit = 15_000;
const commandLimit = 15_000;
const smokeLimit = 10_000;
const cleanupLimit = 5_000;
let evidence;
let tempParent;
let tempParentReal;
let launcher;
let launchHandle;
let launchDone;
let launchInfo;
let ownerToken;
let runId;
let taskId;
let interrupted;
let cleanupResult;
const failures = [];

const stamp = () => new Date().toISOString();
const text = (error) => (error instanceof Error ? error.message : String(error));
const redact = (value) => {
  if (typeof value === "string")
    return ownerToken ? value.replaceAll(ownerToken, "[REDACTED]") : value;
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redact(child)]));
  return value;
};
const writeEvidence = (name, value) => {
  const path = join(evidence, name);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(redact(value), null, 2)}\n`, { mode: 0o600 });
};
const fail = (stage, error) => {
  failures.push({ stage, error: redact(text(error)), at: stamp() });
  try {
    writeEvidence("failure.json", {
      recordedAt: stamp(),
      failures,
      tempParent,
      cleanup: cleanupResult,
    });
  } catch (writeError) {
    process.stderr.write(`Could not write failure evidence: ${text(writeError)}\n`);
  }
};
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const within = (root, target) => {
  const suffix = relative(resolve(root), resolve(target));
  return suffix !== "" && suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
};
const json = (value) => JSON.parse(String(value).trim());

const capture = (name, args, env = process.env, allowRunning = false) => {
  const startedAt = stamp();
  const child = spawn(process.execPath, [cli, ...args], {
    cwd: repo,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
  child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
  const done = new Promise((resolveDone) => {
    const record = (exitCode, signal, error) => ({
      name,
      command: [process.execPath, cli, ...args],
      cwd: repo,
      startedAt,
      finishedAt: stamp(),
      stdout,
      stderr,
      exitCode,
      signal,
      timedOut,
      ...(error ? { error: text(error) } : {}),
    });
    child.once("error", (error) => resolveDone(record(null, null, error)));
    child.once("close", (exitCode, signal) => resolveDone(record(exitCode, signal)));
  });
  if (!allowRunning) {
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1_000);
    }, commandLimit);
    done.finally(() => clearTimeout(timer)).catch(() => undefined);
  }
  return { child, done, output: () => ({ stdout, stderr }) };
};

const validateLaunch = (raw) => {
  if (!raw || typeof raw !== "object") throw new Error("launch output is not an object");
  for (const key of ["endpoint", "dataRoot", "workspace", "log"])
    if (typeof raw[key] !== "string" || !raw[key]) throw new Error(`launch output missing ${key}`);
  if (!Number.isInteger(raw.pid) || raw.pid <= 0) throw new Error("launch output has invalid pid");
  const endpoint = new URL(raw.endpoint);
  if (!endpoint.port || !["127.0.0.1", "localhost"].includes(endpoint.hostname))
    throw new Error("launch endpoint is not loopback");
  const dataRoot = resolve(raw.dataRoot);
  const dataRootReal = realpathSync(dataRoot);
  const workspace = realpathSync(resolve(raw.workspace));
  const log = realpathSync(resolve(raw.log));
  if (!tempParentReal || !within(tempParentReal, dataRootReal))
    throw new Error("launch dataRoot is outside owned TMPDIR");
  if (!within(dataRootReal, workspace) || !within(dataRootReal, log))
    throw new Error("launch workspace or log is outside dataRoot");
  return { endpoint: endpoint.toString(), pid: raw.pid, dataRoot, workspace, log };
};
const launch = async () => {
  const handle = capture(
    "verify launch",
    ["verify", "launch"],
    { ...process.env, TMPDIR: tempParent, TMP: tempParent, TEMP: tempParent },
    true,
  );
  launchHandle = handle;
  launcher = handle.child;
  launchDone = handle.done;
  const deadline = Date.now() + launchLimit;
  let raw;
  while (!interrupted && launcher.exitCode === null && Date.now() <= deadline) {
    try {
      raw = json(handle.output().stdout);
      break;
    } catch {
      await wait(100);
    }
  }
  if (!raw) throw new Error("verify launch did not report readiness before deadline");
  launchInfo = validateLaunch(raw);
  return launchInfo;
};
const discoverLaunch = () => {
  if (!tempParentReal || !existsSync(tempParentReal)) return null;
  for (const entry of readdirSync(tempParentReal, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("agentis-verify-")) continue;
    const root = join(tempParentReal, entry.name);
    try {
      const profile = json(readFileSync(join(root, "profiles", "verify.json"), "utf8"));
      return validateLaunch({
        endpoint: profile.endpoint,
        pid: Number(readFileSync(join(root, "pid"), "utf8")),
        dataRoot: profile.dataRoot,
        workspace: join(profile.dataRoot, "scratch"),
        log: join(profile.dataRoot, "daemon.log"),
      });
    } catch {}
  }
  return null;
};
const processAt = (pid) => {
  const result = spawnSync("ps", ["-ww", "-p", String(pid), "-o", "command="], {
    encoding: "utf8",
  });
  if (result.error) return { known: false, error: text(result.error) };
  const command = String(result.stdout ?? "").trim();
  if (!command && result.status !== 0) return { known: true, exists: false, command: "" };
  if (!command) return { known: false, error: "ps returned no command" };
  return { known: true, exists: true, command };
};
const startupDaemons = (root, rootPath) => {
  const result = spawnSync("ps", ["-ww", "-axo", "pid=,command="], { encoding: "utf8" });
  if (result.error || result.status !== 0)
    throw new Error(
      `cannot inspect startup daemons: ${text(result.error ?? new Error(`ps exited ${result.status}`))}`,
    );
  const owned = [];
  const unknown = [];
  const references = [root, rootPath].filter(
    (item, index, all) => item && all.indexOf(item) === index,
  );
  const prefix = `${process.execPath} ${cli} serve --endpoint `;
  const marker = " --data-root ";
  const suffix = " --provider fake --execution-boundary unverified-host-scratch --profile verify";
  for (const line of String(result.stdout ?? "").split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(.+)$/);
    if (!match) continue;
    const [, pidText, command] = match;
    if (!references.some((reference) => command.includes(reference))) continue;
    const markerAt = command.indexOf(marker, prefix.length);
    const suffixAt = command.length - suffix.length;
    if (
      !command.startsWith(prefix) ||
      markerAt < prefix.length ||
      suffixAt <= markerAt + marker.length ||
      !command.endsWith(suffix)
    ) {
      unknown.push({ pid: Number(pidText), command });
      continue;
    }
    const endpointText = command.slice(prefix.length, markerAt);
    const dataRootText = command.slice(markerAt + marker.length, suffixAt);
    try {
      const endpoint = new URL(endpointText);
      if (
        !endpoint.port ||
        !["127.0.0.1", "localhost"].includes(endpoint.hostname) ||
        realpathSync(dataRootText) !== root
      )
        throw new Error("startup command identity mismatch");
      owned.push({ pid: Number(pidText), endpoint: endpointText, dataRoot: dataRootText });
    } catch {
      unknown.push({ pid: Number(pidText), command });
    }
  }
  return { owned, unknown };
};
const ownsDaemon = (info, command) => {
  const expected = [
    process.execPath,
    cli,
    "serve",
    "--endpoint",
    info.endpoint,
    "--data-root",
    info.dataRoot,
    "--provider",
    "fake",
    "--execution-boundary",
    "unverified-host-scratch",
    "--profile",
    "verify",
  ];
  return command.trim() === expected.join(" ");
};
const signalDaemon = (info, signal) => {
  const processInfo = processAt(info.pid);
  if (!processInfo.known) throw new Error(`cannot inspect daemon: ${processInfo.error}`);
  if (!processInfo.exists) return processInfo;
  if (!ownsDaemon(info, processInfo.command))
    throw new Error(`daemon pid ${info.pid} is not owned by this launch`);
  try {
    process.kill(-info.pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") process.kill(info.pid, signal);
  }
  return { ...processInfo, signal };
};
const daemonGone = async (info, limit) => {
  const deadline = Date.now() + limit;
  while (Date.now() <= deadline) {
    const processInfo = processAt(info.pid);
    if (!processInfo.known) throw new Error(`cannot inspect daemon: ${processInfo.error}`);
    if (!processInfo.exists) return true;
    await wait(100);
  }
  return false;
};
const endpointUp = async (endpoint) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 750);
  try {
    const response = await fetch(new URL("/v1/health", endpoint), { signal: controller.signal });
    await response.arrayBuffer();
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
const cleanupStartupFailure = async (inspection) => {
  for (const entry of readdirSync(tempParentReal, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("agentis-verify-")) continue;
    const rootPath = join(tempParent, entry.name);
    const root = realpathSync(join(tempParentReal, entry.name));
    let daemons = startupDaemons(root, rootPath);
    const record = { root, rootPath, before: daemons, terminated: [] };
    inspection.push(record);
    if (daemons.unknown.length)
      throw new Error(`cannot prove startup process ownership for ${root}`);
    for (const candidate of daemons.owned) {
      record.terminated.push({
        pid: candidate.pid,
        endpoint: candidate.endpoint,
        signal: "SIGTERM",
      });
      const inspected = signalDaemon(candidate, "SIGTERM");
      if (inspected.exists && !(await daemonGone(candidate, cleanupLimit))) {
        record.terminated[record.terminated.length - 1].signal = "SIGKILL";
        signalDaemon(candidate, "SIGKILL");
        if (!(await daemonGone(candidate, 2_000)))
          throw new Error(`startup daemon pid ${candidate.pid} did not disappear`);
      }
      if (await endpointUp(candidate.endpoint))
        throw new Error(`startup daemon endpoint remained reachable: ${candidate.endpoint}`);
    }
    daemons = startupDaemons(root, rootPath);
    record.after = daemons;
    if (daemons.unknown.length || daemons.owned.length)
      throw new Error(`could not prove startup cleanup for ${root}`);
  }
};
const cleanup = async () => {
  const errors = [];
  let launcherStopped = !launcher;
  let daemonStopped = launchInfo ? false : null;
  let endpointUnreachable = launchInfo ? false : null;
  let daemonInspection;
  const startupInspection = [];
  if (launcher && launcher.exitCode === null && launcher.signalCode === null)
    launcher.kill("SIGTERM");
  if (launcher) {
    await Promise.race([launchDone, wait(cleanupLimit)]);
    if (launcher.exitCode === null && launcher.signalCode === null) launcher.kill("SIGKILL");
    await Promise.race([launchDone, wait(2_000)]);
    launcherStopped = launcher.exitCode !== null || launcher.signalCode !== null;
    if (!launcherStopped) errors.push("launch process did not disappear");
  }
  if (launchDone && (launcher.exitCode !== null || launcher.signalCode !== null)) {
    writeEvidence("launch.json", { ...(await launchDone), parsed: launchInfo });
  } else if (launchHandle) {
    writeEvidence("launch.json", {
      name: "verify launch",
      command: [process.execPath, cli, "verify", "launch"],
      cwd: repo,
      stdout: launchHandle.output().stdout,
      stderr: launchHandle.output().stderr,
      exitCode: null,
      signal: null,
      parsed: launchInfo,
    });
  }
  const info = launchInfo ?? discoverLaunch();
  if (info) {
    try {
      daemonStopped = await daemonGone(info, cleanupLimit);
      if (!daemonStopped) {
        daemonInspection = signalDaemon(info, "SIGTERM");
        daemonStopped = await daemonGone(info, cleanupLimit);
        if (!daemonStopped) {
          daemonInspection.forced = signalDaemon(info, "SIGKILL");
          daemonStopped = await daemonGone(info, 2_000);
          if (!daemonStopped) throw new Error(`daemon pid ${info.pid} did not disappear`);
        }
      }
    } catch (error) {
      errors.push(`daemon cleanup: ${text(error)}`);
    }
    try {
      endpointUnreachable = !(await endpointUp(info.endpoint));
      if (!endpointUnreachable) throw new Error(`endpoint remained reachable: ${info.endpoint}`);
    } catch (error) {
      errors.push(`endpoint cleanup: ${text(error)}`);
    }
  } else if (tempParent) {
    try {
      await cleanupStartupFailure(startupInspection);
    } catch (error) {
      errors.push(`startup cleanup: ${text(error)}`);
    }
  }
  let removed = false;
  if (!errors.length && tempParent) {
    try {
      if (realpathSync(tempParent) !== tempParentReal)
        throw new Error("temporary parent realpath changed");
      rmSync(tempParent, { recursive: true, force: false });
      removed = !existsSync(tempParent);
      if (!removed) throw new Error("temporary parent still exists");
    } catch (error) {
      errors.push(`temporary parent removal: ${text(error)}`);
    }
  }
  cleanupResult = {
    finishedAt: stamp(),
    removed,
    launcherStopped,
    daemonStopped,
    daemonInspection,
    endpointUnreachable,
    startupInspection,
    temporaryParent: tempParent,
    temporaryParentExists: Boolean(tempParent && existsSync(tempParent)),
    preservedTemporaryParent: Boolean(tempParent && existsSync(tempParent)),
    errors,
    ok:
      !errors.length &&
      launcherStopped &&
      (!info || (daemonStopped && endpointUnreachable)) &&
      (!tempParent || removed),
  };
  writeEvidence("cleanup.json", cleanupResult);
  for (const error of errors) fail("cleanup", error);
};

const preflight = () => {
  if (!evidenceArgument || extra.length) throw new Error("usage: node smoke.mjs EVIDENCE_DIR");
  const target = resolve(evidenceArgument);
  try {
    lstatSync(target);
    throw new Error("evidence directory already exists");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  mkdirSync(target, { mode: 0o700 });
  evidence = target;
  if (!existsSync(cli)) throw new Error(`built CLI is missing: ${cli}`);
  tempParent = mkdtempSync(join(tmpdir(), "kat3315-smoke-"));
  chmodSync(tempParent, 0o700);
  tempParentReal = realpathSync(tempParent);
};
const metadata = () => {
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" });
  const pnpm = spawnSync("pnpm", ["--version"], { cwd: repo, encoding: "utf8" });
  const value = {
    recordedAt: stamp(),
    sourceSha: String(git.stdout ?? "").trim(),
    node: { executable: process.execPath, version: process.version },
    pnpm: { version: String(pnpm.stdout ?? "").trim(), exitCode: pnpm.status },
    platform: { platform: platform(), arch: arch(), release: release(), machine: machine() },
  };
  writeEvidence("metadata.json", value);
  if (
    git.status !== 0 ||
    !/^[0-9a-f]{40}$/i.test(value.sourceSha) ||
    pnpm.status !== 0 ||
    value.pnpm.version !== "9.15.9" ||
    process.version !== "v24.20.0"
  )
    throw new Error("verification requires a Git checkout, Node 24.20.0 and pnpm 9.15.9");
  return value;
};
const publicCli = async (name, args) => {
  const result = await capture(name, args).done;
  let parsed;
  try {
    parsed = json(result.stdout);
  } catch (error) {
    writeEvidence(`${name}.json`, result);
    throw new Error(`${name} did not return JSON: ${text(error)}`);
  }
  const complete = { ...result, parsed };
  writeEvidence(`${name}.json`, complete);
  if (result.exitCode !== 0) throw new Error(`${name} exited ${result.exitCode}`);
  return complete;
};
const readStatus = async (endpoint) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 750);
  try {
    const response = await fetch(new URL("/v1/status", endpoint), {
      headers: { authorization: `Bearer ${ownerToken}` },
      signal: controller.signal,
    });
    return { status: response.status, payload: json(await response.text()) };
  } finally {
    clearTimeout(timer);
  }
};
const poll = async (info) => {
  const attempts = [];
  let last;
  const deadline = Date.now() + smokeLimit;
  while (Date.now() <= deadline) {
    if (interrupted) {
      writeEvidence("status.json", { finishedAt: stamp(), attempts, last, interrupted });
      throw new Error(`interrupted by ${interrupted}`);
    }
    try {
      const result = await readStatus(info.endpoint);
      const at = stamp();
      const run = result.payload.runs?.find((item) => item.id === runId);
      const task = result.payload.tasks?.find((item) => item.id === taskId);
      last = {
        at,
        status: result.status,
        payload: result.payload,
        selectedRun: run ?? null,
        selectedTask: task ?? null,
      };
      attempts.push({
        at,
        status: result.status,
        runStatus: run?.status ?? null,
        taskStatus: task?.status ?? null,
      });
      if (result.status === 200 && run?.status === "succeeded" && task?.status === "completed") {
        const record = {
          finishedAt: stamp(),
          attempts,
          last,
          final: result.payload,
          selectedRun: run,
          selectedTask: task,
        };
        writeEvidence("status.json", record);
        return record;
      }
    } catch (error) {
      attempts.push({
        at: stamp(),
        error: text(error),
        last: last
          ? { status: last.status, selectedRun: last.selectedRun, selectedTask: last.selectedTask }
          : null,
      });
    }
    await wait(200);
  }
  writeEvidence("status.json", { finishedAt: stamp(), attempts, last });
  throw new Error("smoke run/task did not reach succeeded/completed before deadline");
};
const artifactProof = (status, info) => {
  const matches = status.final.artifacts.filter(
    (item) => item.runId === runId && item.taskId === taskId,
  );
  if (matches.length !== 1)
    throw new Error(`expected one matching artifact, found ${matches.length}`);
  const artifact = matches[0];
  if (!isAbsolute(artifact.path)) throw new Error("artifact path is not absolute");
  const dataRoot = realpathSync(info.dataRoot);
  const workspace = realpathSync(info.workspace);
  if (!within(tempParentReal, dataRoot) || !within(dataRoot, workspace))
    throw new Error("workspace or dataRoot realpath is outside owned scratch");
  const path = realpathSync(artifact.path);
  if (!within(workspace, path))
    throw new Error("artifact realpath is outside owned scratch workspace");
  const artifactStat = statSync(path);
  if (!artifactStat.isFile()) throw new Error("artifact realpath is not a regular file");
  const content = readFileSync(path);
  const sha256 = createHash("sha256").update(content).digest("hex");
  const proof = {
    metadata: artifact,
    realpath: path,
    dataRoot,
    workspace,
    insideDataRoot: true,
    insideWorkspace: true,
    regularFile: true,
    expectedBody: "# verification-smoke\n",
    observedByteSize: artifactStat.size,
    observedContentByteSize: content.byteLength,
    observedSha256: sha256,
    byteSizeMatches:
      artifact.byteSize === artifactStat.size && artifactStat.size === content.byteLength,
    sha256Matches: artifact.sha256 === sha256,
    bodyMatches: content.toString("utf8") === "# verification-smoke\n",
    sourceExpected: artifact.source === "fake",
    mediaTypeExpected: artifact.mediaType === "text/markdown",
    authorExpected: artifact.author === "mara",
    copyPath: join(evidence, "artifact", "hello.md"),
  };
  if (
    !proof.byteSizeMatches ||
    !proof.sha256Matches ||
    !proof.bodyMatches ||
    !proof.sourceExpected ||
    !proof.mediaTypeExpected ||
    !proof.authorExpected
  )
    throw new Error("artifact metadata, SHA, byte size, or body did not match smoke output");
  mkdirSync(dirname(proof.copyPath), { recursive: true, mode: 0o700 });
  writeFileSync(proof.copyPath, content, { mode: 0o600 });
  proof.copyByteSize = statSync(proof.copyPath).size;
  proof.copySha256 = createHash("sha256").update(readFileSync(proof.copyPath)).digest("hex");
  proof.copyMatches = proof.copyByteSize === content.byteLength && proof.copySha256 === sha256;
  writeEvidence("artifact.json", proof);
  if (!proof.copyMatches) throw new Error("saved artifact proof does not match source");
  return proof;
};

const onSignal = (signal) => {
  interrupted ??= signal;
  if (launcher?.exitCode === null && launcher?.signalCode === null) launcher.kill("SIGTERM");
};
const main = async () => {
  preflight();
  const sigint = () => onSignal("SIGINT");
  const sigterm = () => onSignal("SIGTERM");
  process.once("SIGINT", sigint);
  process.once("SIGTERM", sigterm);
  const observed = {};
  try {
    observed.metadata = metadata();
    const info = await launch();
    observed.registry = (() => {
      const raw = json(readFileSync(join(info.dataRoot, "registry.json"), "utf8"));
      const value = {
        path: join(info.dataRoot, "registry.json"),
        providers: raw.providers,
        credentialCount: raw.credentials?.length ?? null,
        noCredentials: Array.isArray(raw.credentials) && raw.credentials.length === 0,
      };
      writeEvidence("registry.json", value);
      return value;
    })();
    if (!observed.registry.noCredentials || !observed.registry.providers.includes("fake"))
      throw new Error("fake registry is missing or contains credentials");
    const ownerPath = join(info.dataRoot, "owner.token");
    const ownerStat = lstatSync(ownerPath);
    if (!ownerStat.isFile() || (ownerStat.mode & 0o777) !== 0o600)
      throw new Error("owner.token is missing or not private");
    const owner = json(readFileSync(ownerPath, "utf8"));
    if (
      typeof owner.token !== "string" ||
      !owner.token ||
      typeof owner.sessionId !== "string" ||
      !owner.sessionId
    )
      throw new Error("owner.token has no token or session ID");
    ownerToken = owner.token;
    observed.ownerCredential = { path: ownerPath, exists: true, privateMode: true };
    observed.doctor = await publicCli("doctor", [
      "doctor",
      "--endpoint",
      info.endpoint,
      "--data-root",
      info.dataRoot,
    ]);
    const health = observed.doctor.parsed.health;
    const status = observed.doctor.parsed.status;
    if (
      health?.ok !== true ||
      health.schemaId !== "agentis.v2.gate0.5" ||
      health.apiFamily !== "v1" ||
      health.node !== process.version ||
      health.packageVersion !== "2.0.0" ||
      status?.schemaId !== "agentis.v2.gate0.5"
    )
      throw new Error("doctor health or status schema did not match the documented API");
    observed.submit = await publicCli("submit", [
      "task",
      "submit",
      "--endpoint",
      info.endpoint,
      "--data-root",
      info.dataRoot,
      "--brief",
      "verification-smoke",
      "--fixture",
      "smoke",
    ]);
    if (
      observed.submit.parsed.accepted !== true ||
      ["runId", "taskId", "threadId"].some(
        (key) =>
          typeof observed.submit.parsed[key] !== "string" || !observed.submit.parsed[key].trim(),
      ) ||
      !Array.isArray(observed.submit.parsed.effects) ||
      observed.submit.parsed.effects.length !== 1 ||
      observed.submit.parsed.effects[0] !== "launch"
    )
      throw new Error(
        'smoke submit must be accepted with runId, taskId, threadId and effects ["launch"]',
      );
    runId = observed.submit.parsed.runId;
    taskId = observed.submit.parsed.taskId;
    observed.status = await poll(info);
    observed.artifact = artifactProof(observed.status, info);
  } catch (error) {
    fail("smoke", error);
  } finally {
    await cleanup();
    process.removeListener("SIGINT", sigint);
    process.removeListener("SIGTERM", sigterm);
    if (interrupted && !failures.length)
      fail("interruption", new Error(`interrupted by ${interrupted}`));
    const passed =
      !interrupted &&
      !failures.length &&
      observed.submit &&
      observed.status &&
      observed.artifact &&
      cleanupResult?.ok;
    writeEvidence("result.json", {
      schema: "kat-3315.verify-agentis.smoke.v1",
      recordedAt: stamp(),
      sourceSha: observed.metadata?.sourceSha ?? null,
      expected: {
        launch: "verify launch reports owned endpoint/data root",
        doctor: "public doctor succeeds",
        submit: "public smoke fixture is accepted",
        run: "selected run succeeds",
        task: "selected task completes",
        artifact: "matching artifact SHA and byte size inside scratch",
        cleanup: "owned daemon disappears, endpoint is unreachable, and temp parent is removed",
      },
      observed: {
        launch: launchInfo,
        registry: observed.registry ?? null,
        ownerCredential: observed.ownerCredential ?? null,
        doctor: observed.doctor
          ? { exitCode: observed.doctor.exitCode, parsed: observed.doctor.parsed }
          : null,
        submit: observed.submit
          ? { exitCode: observed.submit.exitCode, parsed: observed.submit.parsed }
          : null,
        status: observed.status
          ? { selectedRun: observed.status.selectedRun, selectedTask: observed.status.selectedTask }
          : null,
        artifact: observed.artifact ?? null,
        failures,
        cleanup: cleanupResult,
      },
      verdict: passed ? "PASS" : "FAIL",
    });
    ownerToken = null;
    process.exitCode = passed ? 0 : 1;
  }
};
try {
  await main();
} catch (error) {
  if (evidence) {
    fail("preflight", error);
    writeEvidence("result.json", {
      schema: "kat-3315.verify-agentis.smoke.v1",
      recordedAt: stamp(),
      failures,
      verdict: "FAIL",
    });
  }
  process.stderr.write(`${text(error)}\n`);
  process.exitCode = 1;
}
