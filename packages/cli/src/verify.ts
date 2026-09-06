import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { saveProfile } from "./profile.js";

const allocateEndpoint = () =>
  new Promise<URL>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("could not allocate port"));
        return;
      }
      const port = address.port;
      server.close((error) =>
        error ? reject(error) : resolve(new URL(`http://127.0.0.1:${port}`)),
      );
    });
    server.on("error", reject);
  });

export type LaunchHandle = {
  readonly endpoint: string;
  readonly pid: number;
  readonly dataRoot: string;
  readonly log: string;
  readonly workspace: string;
  readonly stop: () => Promise<void>;
};

export const launchVerify = async (): Promise<LaunchHandle> => {
  const dataRoot = mkdtempSync(join(tmpdir(), "agentis-verify-"));
  const workspace = join(dataRoot, "scratch");
  const log = join(dataRoot, "daemon.log");
  const endpoint = await allocateEndpoint();
  saveProfile({
    name: "verify",
    endpoint: endpoint.toString(),
    dataRoot,
    provider: "fake",
    executionBoundary: "unverified-host-scratch",
  });
  writeFileSync(
    join(dataRoot, "registry.json"),
    `${JSON.stringify({ providers: ["fake"], credentials: [] })}\n`,
  );
  const bin = fileURLToPath(new URL("./bin.js", import.meta.url));
  const child = spawn(
    process.execPath,
    [
      bin,
      "serve",
      "--endpoint",
      endpoint.toString(),
      "--data-root",
      dataRoot,
      "--provider",
      "fake",
      "--execution-boundary",
      "unverified-host-scratch",
      "--profile",
      "verify",
    ],
    {
      env: {
        PATH: "/usr/bin:/bin",
        HOME: dataRoot,
        AGENTIS_FAKE_REGISTRY: join(dataRoot, "registry.json"),
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("verify launch timed out")), 10_000);
    child.stdout.on("data", (chunk: Buffer) => {
      writeFileSync(log, chunk, { flag: "a" });
      if (chunk.toString().includes(endpoint.toString())) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      writeFileSync(log, chunk, { flag: "a" });
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`verify daemon exited ${code}`));
    });
  });
  return {
    endpoint: endpoint.toString(),
    pid: child.pid ?? 0,
    dataRoot,
    log,
    workspace,
    stop: async () => {
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      }
    },
  };
};
