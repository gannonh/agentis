import {
  accessSync,
  chmodSync,
  constants as fsConstants,
  mkdtempSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  ensureFixtureImage,
  openLoopbackRelay,
  resolveFixtureRuntime,
  startFixtureContainer,
} from "./fixture-runtime.js";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const waitForHealth = async (endpoint: URL) => {
  const deadline = Date.now() + 15_000;
  while (Date.now() <= deadline) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 500);
    try {
      const response = await fetch(new URL("/v1/health", endpoint), {
        signal: controller.signal,
      });
      if (response.ok) return;
    } catch {
      // The daemon and its in-container relay target can start independently.
    } finally {
      clearTimeout(timer);
    }
    await wait(50);
  }
  throw new Error("fixture daemon did not become healthy before timeout");
};

const verifyHostArtifacts = (dataRoot: string, endpoint: URL, workspace: string) => {
  const endpointPath = join(dataRoot, "endpoint");
  const ownerPath = join(dataRoot, "owner.token");
  const profilePath = join(dataRoot, "profiles", "verify.json");
  for (const path of [endpointPath, ownerPath, profilePath, workspace]) {
    accessSync(path, fsConstants.R_OK);
  }
  if (readFileSync(endpointPath, "utf8").trim() !== endpoint.toString()) {
    throw new Error("fixture endpoint file does not match the loopback endpoint");
  }
  const owner = JSON.parse(readFileSync(ownerPath, "utf8")) as { token?: unknown };
  if (typeof owner.token !== "string" || owner.token.length === 0) {
    throw new Error("fixture owner credential is not readable");
  }
  const profile = JSON.parse(readFileSync(profilePath, "utf8")) as {
    endpoint?: unknown;
    dataRoot?: unknown;
    executionBoundary?: unknown;
  };
  if (
    profile.endpoint !== endpoint.toString() ||
    profile.dataRoot !== dataRoot ||
    profile.executionBoundary !== "docker-fixture-container"
  ) {
    throw new Error("fixture profile is incomplete");
  }
  if (!statSync(workspace).isDirectory()) throw new Error("fixture workspace is not a directory");
};

export type LaunchHandle = {
  readonly endpoint: string;
  readonly pid: number;
  readonly containerId: string;
  readonly containerName: string;
  readonly dataRoot: string;
  readonly log: string;
  readonly workspace: string;
  readonly stop: () => Promise<void>;
};

export const launchVerify = async (): Promise<LaunchHandle> => {
  const tempRoot = realpathSync("/tmp");
  const dataRoot = realpathSync(mkdtempSync(join(tempRoot, "agentis-verify-")));
  chmodSync(dataRoot, 0o700);
  const workspace = join(dataRoot, "scratch");
  const log = join(dataRoot, "daemon.log");
  writeFileSync(log, "", { mode: 0o600 });
  chmodSync(log, 0o600);

  const runtime = resolveFixtureRuntime();
  ensureFixtureImage(runtime.image);
  const relay = await openLoopbackRelay(log);
  let container: Awaited<ReturnType<typeof startFixtureContainer>> | undefined;
  try {
    container = await startFixtureContainer({
      dataRoot,
      endpoint: relay.endpoint,
      runtime,
      log,
    });
    relay.attach(container.id);
    void container.exited.then(() => relay.close()).catch(() => undefined);
    await waitForHealth(relay.endpoint);
    verifyHostArtifacts(dataRoot, relay.endpoint, workspace);
    if (!container.isRunning()) throw new Error("fixture container exited after becoming healthy");
    writeFileSync(join(dataRoot, "pid"), `${container.supervisorPid}\n`, { mode: 0o600 });
    chmodSync(join(dataRoot, "pid"), 0o600);
  } catch (error) {
    await relay.close().catch(() => undefined);
    await container?.stop().catch(() => undefined);
    throw error;
  }

  let stopPromise: Promise<void> | undefined;
  const stop = async () => {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      await relay.close();
      await container!.stop();
    })();
    return stopPromise;
  };
  return {
    endpoint: relay.endpoint.toString(),
    pid: container.supervisorPid,
    containerId: container.id,
    containerName: container.name,
    dataRoot,
    log,
    workspace,
    stop,
  };
};
