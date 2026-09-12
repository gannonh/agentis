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

function parseEnvironmentStdout(stdout, environmentId) {
  const text = stdout ?? "";
  const parsed = parseEnv(text);
  if (Object.keys(parsed).length === 0 && text.trim() !== "") {
    throw new OnePasswordEnvironmentReadError(
      environmentId,
      "op environment read returned no KEY=value lines. Unset OP_FORMAT and do not pass --format json.",
    );
  }
  return parsed;
}

export function readOpEnvironment({ environmentId, env, run = spawnSync } = {}) {
  const cached = opEnvironmentCache.get(environmentId);
  if (cached) {
    return cached;
  }

  const childEnv = { ...env };
  delete childEnv.OP_FORMAT;
  const result = run("op", ["environment", "read", environmentId], {
    encoding: "utf8",
    env: childEnv,
  });
  if (result.error) {
    throw new OnePasswordEnvironmentReadError(environmentId, result.error.message);
  }
  if (result.status !== 0) {
    const detail =
      (result.stderr ?? "").trim().split("\n")[0] || `op exited ${String(result.status)}`;
    throw new OnePasswordEnvironmentReadError(environmentId, detail);
  }

  const parsed = parseEnvironmentStdout(result.stdout, environmentId);
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
