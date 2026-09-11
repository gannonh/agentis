import { appendFileSync, lstatSync, realpathSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer, type Server, type Socket } from "node:net";
import { fileURLToPath } from "node:url";

export const FIXTURE_IMAGE =
  "node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e";

const MANAGED_LABEL = "io.agentis.managed";
const LAUNCH_LABEL = "io.agentis.verify-launch";
const MANAGED_VALUE = "verify-fixture";
const MAX_ACTIVE_RELAYS = 32;
const RELAY_SOURCE =
  'const net=require("node:net");const host=process.argv[1];const port=Number(process.argv[2]);if(host!=="127.0.0.1"||!Number.isInteger(port)||port<1||port>65535)process.exit(2);const socket=net.connect(port,host);const fail=()=>{process.exitCode=1;process.stdin.destroy();socket.destroy();};socket.on("error",fail);process.stdin.on("error",fail);process.stdout.on("error",fail);socket.pipe(process.stdout);process.stdin.pipe(socket);process.stdin.on("end",()=>socket.end());socket.on("end",()=>process.stdout.end());';

export type FixtureRuntime = {
  readonly image: string;
  readonly daemonEntry: string;
};

export type FixtureContainer = {
  readonly name: string;
  readonly id: string;
  readonly supervisorPid: number;
  readonly exited: Promise<void>;
  readonly isRunning: () => boolean;
  readonly stop: () => Promise<void>;
};

export type LoopbackRelay = {
  readonly endpoint: URL;
  readonly attach: (containerId: string) => void;
  readonly close: () => Promise<void>;
};

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const appendLog = (path: string, chunk: Buffer | string) => {
  try {
    appendFileSync(path, chunk);
  } catch {
    // The launcher owns log cleanup. A caller removing it must not bring down
    // the host control process while the container is being reaped.
  }
};

const hostIdentity = () => {
  const uid = process.getuid?.();
  const gid = process.getgid?.();
  if (uid === undefined || gid === undefined || uid === 0 || gid === 0) {
    throw new Error("fixture Docker launch requires a non-root host UID and GID");
  }
  return { uid, gid };
};

const imageExists = (image: string) => {
  const result = spawnSync("docker", ["image", "inspect", image], {
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status === 0) return true;
  if (/No such image/i.test(result.stderr)) return false;
  throw new Error(`cannot inspect fixture image: ${result.stderr.trim()}`);
};

export const ensureFixtureImage = (image = FIXTURE_IMAGE) => {
  if (imageExists(image)) return;
  const pulled = spawnSync("docker", ["pull", image], { encoding: "utf8" });
  if (pulled.error) throw pulled.error;
  if (pulled.status !== 0) {
    throw new Error(`cannot pull fixture image ${image}: ${pulled.stderr.trim()}`);
  }
};

const regularFile = (path: string) => {
  const stat = lstatSync(path);
  if (!stat.isFile()) throw new Error(`fixture runtime is not a regular file: ${path}`);
  const resolved = realpathSync(path);
  if (resolved !== path) throw new Error(`fixture runtime must not be a symlink: ${path}`);
  if ((statSync(path).mode & 0o444) === 0) {
    throw new Error(`fixture runtime is not readable: ${path}`);
  }
  return resolved;
};

export const resolveFixtureRuntime = (): FixtureRuntime => ({
  image: FIXTURE_IMAGE,
  daemonEntry: regularFile(fileURLToPath(new URL("./fixture-daemon.mjs", import.meta.url))),
});

const inspectOwned = (name: string, launchId: string): string | null => {
  const format = `{{.Id}}\t{{index .Config.Labels "${MANAGED_LABEL}"}}\t{{index .Config.Labels "${LAUNCH_LABEL}"}}`;
  const result = spawnSync("docker", ["inspect", "--type", "container", "--format", format, name], {
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (/No such (object|container)/i.test(result.stderr)) return null;
    throw new Error(`cannot inspect fixture container ${name}: ${result.stderr.trim()}`);
  }
  const [id, managed, owner] = result.stdout.trim().split("\t");
  if (managed !== MANAGED_VALUE || owner !== launchId || !id) {
    throw new Error(`refusing to use unowned fixture container ${name}`);
  }
  return id;
};

const ownedContainerIsRunning = (id: string, launchId: string) => {
  if (!inspectOwned(id, launchId)) return false;
  const result = spawnSync(
    "docker",
    ["inspect", "--type", "container", "--format", "{{.State.Running}}", id],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (/No such (object|container)/i.test(result.stderr)) return false;
    throw new Error(`cannot inspect fixture container ${id}: ${result.stderr.trim()}`);
  }
  return result.stdout.trim() === "true";
};

const runDocker = (args: readonly string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("docker", [...args], { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`docker ${args[0] ?? "command"} exited ${code}`));
    });
  });

const removeOwned = async (id: string, launchId: string) => {
  if (!inspectOwned(id, launchId)) return;
  try {
    await runDocker(["stop", "--time", "5", id]);
  } catch {
    // The container can exit between inspect and stop. Re-inspection below is
    // the ownership and cleanup check.
  }
  if (inspectOwned(id, launchId)) {
    await runDocker(["rm", "-f", id]);
  }
  if (inspectOwned(id, launchId)) {
    throw new Error(`fixture container ${id} survived removal`);
  }
};

const waitForExit = async (child: ChildProcess, limitMs: number) => {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  let timer: NodeJS.Timeout | undefined;
  let resolveExit!: () => void;
  const onExit = () => resolveExit();
  const exited = new Promise<void>((resolve) => {
    resolveExit = resolve;
    child.once("exit", onExit);
  });
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, limitMs);
    timer.unref?.();
  });
  await Promise.race([exited, timeout]);
  if (timer) clearTimeout(timer);
  child.removeListener("exit", onExit);
  return child.exitCode !== null || child.signalCode !== null;
};

export const startFixtureContainer = async (input: {
  readonly dataRoot: string;
  readonly endpoint: URL;
  readonly runtime: FixtureRuntime;
  readonly log: string;
}): Promise<FixtureContainer> => {
  const { uid, gid } = hostIdentity();
  const dataRoot = realpathSync(input.dataRoot);
  const launchId = randomUUID();
  const name = `agentis-verify-${launchId}`;
  const args = [
    "run",
    "--rm",
    "--init",
    "--interactive",
    "--pull=never",
    "--name",
    name,
    "--label",
    `${MANAGED_LABEL}=${MANAGED_VALUE}`,
    "--label",
    `${LAUNCH_LABEL}=${launchId}`,
    "--network",
    "none",
    "--read-only",
    "--user",
    `${uid}:${gid}`,
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    "128",
    "--memory",
    "512m",
    "--cpus",
    "1",
    "--ipc",
    "private",
    "--stop-timeout",
    "5",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,noexec,size=67108864",
    "--tmpfs",
    `/fixture-home:rw,nosuid,nodev,noexec,size=16777216,uid=${uid},gid=${gid},mode=700`,
    "--mount",
    `type=bind,src=${dataRoot},dst=${dataRoot}`,
    "--mount",
    `type=bind,src=${input.runtime.daemonEntry},dst=/opt/agentis/fixture-daemon.mjs,readonly`,
    "--env",
    "HOME=/fixture-home",
    "--env",
    "XDG_CONFIG_HOME=/fixture-home/.config",
    "--env",
    "XDG_DATA_HOME=/fixture-home/.local/share",
    "--env",
    "NPM_CONFIG_USERCONFIG=/dev/null",
    "--env",
    "npm_config_userconfig=/dev/null",
    "--env",
    "PATH=/usr/local/bin:/usr/bin:/bin",
    "--env",
    "NO_OPEN_BROWSER=1",
    "--entrypoint",
    "/usr/local/bin/node",
    input.runtime.image,
    "/opt/agentis/fixture-daemon.mjs",
    "--endpoint",
    input.endpoint.toString(),
    "--data-root",
    dataRoot,
  ];
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let supervisorError: Error | undefined;
  child.on("error", (error) => {
    supervisorError = error;
  });
  child.stdin?.on("error", (error) => {
    supervisorError ??= error;
  });
  if (!child.pid) {
    throw supervisorError ?? new Error("Docker fixture supervisor did not receive a PID");
  }
  child.stdout?.on("data", (chunk: Buffer) => appendLog(input.log, chunk));
  child.stderr?.on("data", (chunk: Buffer) => appendLog(input.log, chunk));
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  let containerId: string | null = null;
  try {
    const deadline = Date.now() + 15_000;
    while (Date.now() <= deadline) {
      if (supervisorError) throw supervisorError;
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`fixture container exited before readiness (code ${child.exitCode})`);
      }
      containerId = inspectOwned(name, launchId);
      if (containerId) break;
      await delay(50);
    }
    if (!containerId) throw new Error("fixture container did not become inspectable");
  } catch (error) {
    if (child.stdin && !child.stdin.destroyed) child.stdin.end();
    await waitForExit(child, 1_000);
    const ownedId = containerId ?? inspectOwned(name, launchId);
    if (ownedId) await removeOwned(ownedId, launchId).catch(() => undefined);
    throw error;
  }
  let stopPromise: Promise<void> | undefined;
  const stop = async () => {
    if (stopPromise) return stopPromise;
    stopPromise = (async () => {
      if (child.stdin && !child.stdin.destroyed) child.stdin.end();
      if (!(await waitForExit(child, 5_000))) {
        await removeOwned(containerId!, launchId);
        if (!(await waitForExit(child, 2_000))) {
          child.kill("SIGTERM");
          await waitForExit(child, 2_000);
        }
      } else {
        await removeOwned(containerId!, launchId);
      }
    })();
    return stopPromise;
  };
  return {
    name,
    id: containerId,
    supervisorPid: child.pid,
    exited,
    isRunning: () => ownedContainerIsRunning(containerId!, launchId),
    stop,
  };
};

export const openLoopbackRelay = async (log: string): Promise<LoopbackRelay> => {
  let containerId: string | null = null;
  let closed = false;
  let closePromise: Promise<void> | undefined;
  const relays = new Set<{
    child: ChildProcess;
    socket: Socket;
    finished: Promise<void>;
    close: () => void;
  }>();
  let server: Server | undefined;
  let endpoint: URL;
  server = createServer((socket) => {
    if (closed || !containerId || relays.size >= MAX_ACTIVE_RELAYS) {
      socket.destroy();
      return;
    }
    const child = spawn(
      "docker",
      [
        "exec",
        "--interactive",
        containerId,
        "/usr/local/bin/node",
        "-e",
        RELAY_SOURCE,
        "127.0.0.1",
        String(endpoint.port),
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let resolveFinished!: () => void;
    let finished = false;
    const relay: {
      child: ChildProcess;
      socket: Socket;
      finished: Promise<void>;
      close: () => void;
    } = {
      child,
      socket,
      finished: new Promise<void>((resolve) => {
        resolveFinished = resolve;
      }),
      close: () => undefined,
    };
    relays.add(relay);
    const finish = () => {
      if (finished) return;
      finished = true;
      relays.delete(relay);
      resolveFinished();
    };
    const dispose = () => {
      if (!socket.destroyed) socket.destroy();
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    };
    relay.close = dispose;
    child.once("close", () => {
      finish();
      if (!socket.destroyed) socket.destroy();
    });
    child.once("error", dispose);
    child.stdin?.once("error", dispose);
    child.stdout?.once("error", dispose);
    child.stderr?.once("error", dispose);
    child.stderr?.on("data", (chunk: Buffer) => appendLog(log, chunk));
    socket.once("error", dispose);
    socket.once("close", dispose);
    if (!child.stdin || !child.stdout) {
      dispose();
      return;
    }
    try {
      child.stdout.pipe(socket);
      socket.pipe(child.stdin);
    } catch {
      dispose();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server?.once("error", reject);
    server?.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("fixture relay did not receive a loopback port");
  }
  endpoint = new URL(`http://127.0.0.1:${address.port}`);
  return {
    endpoint,
    attach: (id) => {
      if (closed) throw new Error("fixture relay is closed");
      containerId = id;
    },
    close: async () => {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        closed = true;
        containerId = null;
        const activeRelays = [...relays];
        for (const relay of activeRelays) relay.close();
        const serverClosed = new Promise<void>((resolve, reject) => {
          if (!server) {
            resolve();
            return;
          }
          server.close((error) => (error ? reject(error) : resolve()));
        });
        await Promise.all([serverClosed, ...activeRelays.map((relay) => relay.finished)]);
      })();
      return closePromise;
    },
  };
};
