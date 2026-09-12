#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { arch, machine, platform, release } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const repo = resolve(process.cwd());
const cli = resolve(repo, "packages/cli/dist/bin.js");
const [evidenceArgument, ...extra] = process.argv.slice(2);
const launchLimit = 15_000;
const commandLimit = 15_000;
const smokeLimit = 10_000;
const cleanupLimit = 5_000;
const fixtureBoundary = "docker-fixture-container";
const fixtureManagedLabel = "io.agentis.managed";
const fixtureManagedValue = "verify-fixture";
const fixtureLaunchLabel = "io.agentis.verify-launch";
const fixtureNamePrefix = "agentis-verify-";
const fixtureTempRoot = realpathSync("/tmp");
const launchIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const containerIdPattern = /^[0-9a-f]{12,64}$/i;
let evidence;
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
  for (const key of ["endpoint", "dataRoot", "workspace", "log", "containerId", "containerName"])
    if (typeof raw[key] !== "string" || !raw[key]) throw new Error(`launch output missing ${key}`);
  if (!Number.isInteger(raw.pid) || raw.pid <= 0) throw new Error("launch output has invalid pid");
  if (!containerIdPattern.test(raw.containerId))
    throw new Error("launch output has invalid containerId");
  const containerName = raw.containerName.replace(/^\/+/, "");
  const launchId = containerName.startsWith(fixtureNamePrefix)
    ? containerName.slice(fixtureNamePrefix.length)
    : "";
  if (!launchIdPattern.test(launchId) || containerName !== `${fixtureNamePrefix}${launchId}`)
    throw new Error("launch output has invalid containerName");
  const endpoint = new URL(raw.endpoint);
  if (!endpoint.port || !["127.0.0.1", "localhost"].includes(endpoint.hostname))
    throw new Error("launch endpoint is not loopback");
  const dataRoot = resolve(raw.dataRoot);
  const dataRootReal = realpathSync(dataRoot);
  const workspace = realpathSync(resolve(raw.workspace));
  const log = realpathSync(resolve(raw.log));
  if (
    dirname(dataRootReal) !== fixtureTempRoot ||
    !basename(dataRootReal).startsWith(fixtureNamePrefix)
  )
    throw new Error("launch dataRoot is outside the canonical fixture temp root");
  if (!within(dataRootReal, workspace) || !within(dataRootReal, log))
    throw new Error("launch workspace or log is outside dataRoot");
  return {
    endpoint: endpoint.toString(),
    pid: raw.pid,
    containerId: raw.containerId,
    containerName,
    launchId,
    dataRoot,
    dataRootReal,
    workspace,
    log,
  };
};
const validateFixtureProfile = (info) => {
  const profilePath = join(info.dataRoot, "profiles", "verify.json");
  const profile = json(readFileSync(profilePath, "utf8"));
  if (resolve(profile.dataRoot) !== info.dataRoot)
    throw new Error("fixture profile dataRoot does not match readiness");
  if (profile.provider !== "fake" || profile.executionBoundary !== fixtureBoundary)
    throw new Error("fixture profile does not declare the Docker fixture boundary");
  return profile;
};
const launch = async () => {
  const handle = capture("verify launch", ["verify", "launch"], process.env, true);
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
  const candidate = validateLaunch(raw);
  const profile = validateFixtureProfile(candidate);
  if (!inspectOwnedContainer(candidate))
    throw new Error(
      `fixture container ${candidate.containerId} disappeared before ownership check`,
    );
  launchInfo = { ...candidate, boundary: profile.executionBoundary };
  return launchInfo;
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
const inspectContainer = (containerId) => {
  if (!containerIdPattern.test(containerId)) throw new Error("invalid container id for inspect");
  const result = spawnSync("docker", ["inspect", "--type", "container", containerId], {
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (/No such (object|container)/i.test(String(result.stderr ?? ""))) return null;
    throw new Error(
      `cannot inspect fixture container ${containerId}: ${String(result.stderr ?? "").trim()}`,
    );
  }
  let values;
  try {
    values = json(result.stdout);
  } catch (error) {
    throw new Error(`docker inspect returned invalid JSON: ${text(error)}`);
  }
  if (!Array.isArray(values) || values.length !== 1 || !values[0]?.Id)
    throw new Error(`docker inspect returned no unique container for ${containerId}`);
  if (values[0].Id !== containerId)
    throw new Error(`docker inspect identity mismatch for ${containerId}`);
  return values[0];
};
const inspectOwnedContainer = (info) => {
  const container = inspectContainer(info.containerId);
  if (!container) return null;
  const labels = container.Config?.Labels ?? {};
  if (labels[fixtureManagedLabel] !== fixtureManagedValue)
    throw new Error(`refusing unowned fixture container ${info.containerId}`);
  if (labels[fixtureLaunchLabel] !== info.launchId)
    throw new Error(`fixture launch label mismatch for ${info.containerId}`);
  const inspectedName = String(container.Name ?? "").replace(/^\/+/, "");
  if (inspectedName !== info.containerName)
    throw new Error(`fixture container name mismatch for ${info.containerId}`);
  if (container.HostConfig?.NetworkMode !== "none")
    throw new Error(`fixture container ${info.containerId} is not network isolated`);
  const mounts = Array.isArray(container.Mounts) ? container.Mounts : [];
  const writableBinds = mounts.filter((mount) => mount?.Type === "bind" && mount.RW === true);
  const rootMounts = writableBinds.filter((mount) => {
    try {
      return (
        mount.Source === info.dataRoot &&
        mount.Destination === info.dataRoot &&
        realpathSync(mount.Source) === info.dataRootReal
      );
    } catch {
      return false;
    }
  });
  if (writableBinds.length !== 1 || rootMounts.length !== 1)
    throw new Error(`fixture dataRoot mount does not match readiness for ${info.containerId}`);
  if (Object.keys(container.NetworkSettings?.Ports ?? {}).length !== 0)
    throw new Error(`fixture container ${info.containerId} publishes an unexpected port`);
  return { container, labels, mounts, rootMount: rootMounts[0] };
};
const ownsSupervisor = (info, command) =>
  /(?:^|\s)(?:docker|docker\.exe)\s+run(?:\s|$)/.test(command.trim()) &&
  command.includes(info.containerName);
const signalSupervisor = (info, signal) => {
  const processInfo = processAt(info.pid);
  if (!processInfo.known)
    throw new Error(`cannot inspect fixture supervisor: ${processInfo.error}`);
  if (!processInfo.exists) return processInfo;
  if (!ownsSupervisor(info, processInfo.command))
    throw new Error(`fixture supervisor pid ${info.pid} is not owned by this launch`);
  process.kill(info.pid, signal);
  return { ...processInfo, signal };
};
const supervisorGone = async (info, limit) => {
  const deadline = Date.now() + limit;
  while (Date.now() <= deadline) {
    const processInfo = processAt(info.pid);
    if (!processInfo.known)
      throw new Error(`cannot inspect fixture supervisor: ${processInfo.error}`);
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
const stopOwnedContainer = (info) => {
  const before = inspectOwnedContainer(info);
  if (!before) return { before: null, stopped: false, removed: true, after: null };
  const stop = spawnSync("docker", ["stop", "--time", "5", info.containerId], {
    encoding: "utf8",
  });
  if (stop.error) throw stop.error;
  if (stop.status !== 0 && !/No such (object|container)/i.test(String(stop.stderr ?? "")))
    throw new Error(`docker stop exited ${stop.status}: ${String(stop.stderr ?? "").trim()}`);
  let after = inspectOwnedContainer(info);
  if (after) {
    const remove = spawnSync("docker", ["rm", "-f", info.containerId], {
      encoding: "utf8",
    });
    if (remove.error) throw remove.error;
    if (remove.status !== 0 && !/No such (object|container)/i.test(String(remove.stderr ?? "")))
      throw new Error(`docker rm exited ${remove.status}: ${String(remove.stderr ?? "").trim()}`);
    after = inspectOwnedContainer(info);
  }
  if (after) throw new Error(`owned fixture container ${info.containerId} survived removal`);
  return { before, stopped: true, removed: true, after: null };
};
const removeOwnedDataRoot = (info) => {
  const dataRootReal = realpathSync(info.dataRoot);
  if (
    dataRootReal !== info.dataRootReal ||
    dirname(dataRootReal) !== fixtureTempRoot ||
    !basename(dataRootReal).startsWith(fixtureNamePrefix)
  )
    throw new Error("refusing to remove an unowned fixture dataRoot");
  const dataRootStat = lstatSync(info.dataRoot);
  if (!dataRootStat.isDirectory() || dataRootStat.isSymbolicLink())
    throw new Error("fixture dataRoot is not an owned directory");
  rmSync(info.dataRoot, { recursive: true, force: false });
  if (existsSync(info.dataRoot)) throw new Error("fixture dataRoot still exists");
  return true;
};
const cleanup = async () => {
  const errors = [];
  let launcherStopped = !launcher;
  let containerStopped = launchInfo ? false : null;
  let supervisorStopped = launchInfo ? false : null;
  let endpointUnreachable = launchInfo ? false : null;
  let dataRootRemoved = launchInfo ? false : null;
  let containerInspection;
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
  const info = launchInfo;
  if (info) {
    try {
      containerInspection = stopOwnedContainer(info);
      containerStopped = containerInspection.removed;
      supervisorStopped = await supervisorGone(info, cleanupLimit);
      if (!supervisorStopped) {
        containerInspection.supervisor = signalSupervisor(info, "SIGTERM");
        supervisorStopped = await supervisorGone(info, cleanupLimit);
        if (!supervisorStopped) {
          containerInspection.supervisor.forced = signalSupervisor(info, "SIGKILL");
          supervisorStopped = await supervisorGone(info, 2_000);
          if (!supervisorStopped)
            throw new Error(`fixture supervisor pid ${info.pid} did not disappear`);
        }
      }
    } catch (error) {
      errors.push(`fixture cleanup: ${text(error)}`);
    }
    try {
      endpointUnreachable = !(await endpointUp(info.endpoint));
      if (!endpointUnreachable) throw new Error(`endpoint remained reachable: ${info.endpoint}`);
    } catch (error) {
      errors.push(`endpoint cleanup: ${text(error)}`);
    }
    if (!errors.length && containerStopped && supervisorStopped && endpointUnreachable) {
      try {
        dataRootRemoved = removeOwnedDataRoot(info);
      } catch (error) {
        errors.push(`dataRoot cleanup: ${text(error)}`);
      }
    }
  }
  cleanupResult = {
    finishedAt: stamp(),
    launcherStopped,
    containerStopped,
    supervisorStopped,
    dataRootRemoved,
    dataRoot: info?.dataRoot ?? null,
    containerInspection,
    endpointUnreachable,
    ownershipVerified: Boolean(info),
    cleanupScope: info
      ? "validated launch resources"
      : "owned launcher only; unidentified fixture roots are retained",
    dataRootExists: Boolean(info?.dataRoot && existsSync(info.dataRoot)),
    errors,
    ok:
      !errors.length &&
      launcherStopped &&
      (!info || (containerStopped && supervisorStopped && endpointUnreachable && dataRootRemoved)),
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
  if (
    dirname(dataRoot) !== fixtureTempRoot ||
    !basename(dataRoot).startsWith(fixtureNamePrefix) ||
    !within(dataRoot, workspace)
  )
    throw new Error("workspace or dataRoot realpath is outside the owned fixture root");
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
        cleanup:
          "owned Docker fixture container and host supervisor disappear, endpoint is unreachable, and the data root is removed",
      },
      observed: {
        launch: launchInfo,
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
