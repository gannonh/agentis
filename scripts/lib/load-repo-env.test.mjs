import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  DEFAULT_OP_ENVIRONMENT_ID,
  loadRepoEnv,
  OnePasswordEnvironmentReadError,
} from "./load-repo-env.mjs";

test("missing token does not call the reader", () => {
  const env = loadRepoEnv({
    baseEnv: { ANTHROPIC_API_KEY: "from-process" },
    readOpEnvironment: () => {
      throw new Error("should not read 1Password without a service account token");
    },
  });
  assert.equal(env.ANTHROPIC_API_KEY, "from-process");
});

test("whitespace-only token is treated as missing", () => {
  const env = loadRepoEnv({
    baseEnv: { OP_SERVICE_ACCOUNT_TOKEN: " \t\n ", ANTHROPIC_API_KEY: "from-process" },
    readOpEnvironment: () => {
      throw new Error("should not read 1Password with a whitespace-only token");
    },
  });
  assert.equal(env.ANTHROPIC_API_KEY, "from-process");
});

test("process env overrides 1Password for the same key and keeps other op keys", () => {
  let requestedId = "";
  const env = loadRepoEnv({
    baseEnv: {
      OP_SERVICE_ACCOUNT_TOKEN: "ops_test",
      ANTHROPIC_API_KEY: "from-process",
    },
    readOpEnvironment: ({ environmentId }) => {
      requestedId = environmentId;
      return {
        ANTHROPIC_API_KEY: "from-op",
        CURSOR_API_KEY: "cursor-op",
      };
    },
  });
  assert.equal(requestedId, DEFAULT_OP_ENVIRONMENT_ID);
  assert.equal(env.ANTHROPIC_API_KEY, "from-process");
  assert.equal(env.CURSOR_API_KEY, "cursor-op");
});

test("OP_ENVIRONMENT_ID is passed through", () => {
  let requestedId = "";
  loadRepoEnv({
    baseEnv: {
      OP_SERVICE_ACCOUNT_TOKEN: "ops_test",
      OP_ENVIRONMENT_ID: "custom-environment-id",
    },
    readOpEnvironment: ({ environmentId }) => {
      requestedId = environmentId;
      return {};
    },
  });
  assert.equal(requestedId, "custom-environment-id");
});

test("does not load keys that exist only in a cwd .env file", () => {
  const dir = mkdtempSync(join(tmpdir(), "agentis-env-"));
  const previous = process.cwd();
  try {
    writeFileSync(join(dir, ".env"), "FROM_DOTENV=file-only\n");
    process.chdir(dir);
    const env = loadRepoEnv({
      baseEnv: { OP_SERVICE_ACCOUNT_TOKEN: "ops_test" },
      readOpEnvironment: () => ({ FROM_OP: "op" }),
    });
    assert.equal(env.FROM_DOTENV, undefined);
    assert.equal(env.FROM_OP, "op");
  } finally {
    process.chdir(previous);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("reader throw fails closed with OnePasswordEnvironmentReadError and the environment id", () => {
  assert.throws(
    () =>
      loadRepoEnv({
        baseEnv: { OP_SERVICE_ACCOUNT_TOKEN: "ops_test" },
        readOpEnvironment: ({ environmentId }) => {
          throw new OnePasswordEnvironmentReadError(environmentId, "not signed in");
        },
      }),
    (error) =>
      error instanceof OnePasswordEnvironmentReadError &&
      error.environmentId === DEFAULT_OP_ENVIRONMENT_ID &&
      error.message.includes(DEFAULT_OP_ENVIRONMENT_ID),
  );
});
