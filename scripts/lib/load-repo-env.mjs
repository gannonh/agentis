import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";

export const DEFAULT_OP_ENVIRONMENT_ID = "sjeqjrunoqacvlom5cjq5kizxa";

const opEnvironmentCache = new Map();

export class OnePasswordEnvironmentReadError extends Error {
  constructor(environmentId, detail) {
    super(
      `Failed to read 1Password Environment ${environmentId}. Install 1Password CLI beta 2.33.0-beta.02 or later, set OP_SERVICE_ACCOUNT_TOKEN, and confirm the service account can read that Environment. ${detail}`,
    );
    this.name = "OnePasswordEnvironmentReadError";
    this.environmentId = environmentId;
    this.detail = detail;
  }
}

export function readOpEnvironment({ environmentId, env }) {
  const cached = opEnvironmentCache.get(environmentId);
  if (cached) {
    return cached;
  }

  const result = spawnSync("op", ["environment", "read", environmentId], {
    encoding: "utf8",
    env,
  });
  if (result.error) {
    throw new OnePasswordEnvironmentReadError(environmentId, result.error.message);
  }
  if (result.status !== 0) {
    const detail =
      (result.stderr ?? "").trim().split("\n")[0] || `op exited ${String(result.status)}`;
    throw new OnePasswordEnvironmentReadError(environmentId, detail);
  }

  const parsed = parseEnv(result.stdout ?? "");
  opEnvironmentCache.set(environmentId, parsed);
  return parsed;
}

export function loadRepoEnv({
  baseEnv = process.env,
  readOpEnvironment: readEnvironment = readOpEnvironment,
} = {}) {
  const token = baseEnv.OP_SERVICE_ACCOUNT_TOKEN?.trim();
  const opEnv =
    token === undefined || token.length === 0
      ? {}
      : readEnvironment({
          environmentId: baseEnv.OP_ENVIRONMENT_ID?.trim() || DEFAULT_OP_ENVIRONMENT_ID,
          env: baseEnv,
        });
  return { ...opEnv, ...baseEnv };
}

export function applyRepoEnv() {
  return Object.assign(process.env, loadRepoEnv());
}
