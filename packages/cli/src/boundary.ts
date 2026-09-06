import { spawnSync } from "node:child_process";
import type { ExecutionBoundary, ProviderKind } from "./schema.js";

export class BoundaryError extends Error {
  readonly _tag = "BoundaryError";
}

export const assertBoundary = (input: {
  provider: typeof ProviderKind.Type;
  executionBoundary: typeof ExecutionBoundary.Type;
}) => {
  if (input.provider === "fake") {
    return;
  }
  if (input.executionBoundary === "unverified-host-scratch") {
    return;
  }
  const info = spawnSync("docker", ["info"], { encoding: "utf8" });
  if (info.status !== 0) {
    throw new BoundaryError(
      "docker-desktop-run-container is required for live Codex and is unavailable; refuse host fallback",
    );
  }
};
