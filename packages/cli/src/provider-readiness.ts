import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { providerVolume } from "./provider.js";
import type { ExecutionBoundary, ProviderKind } from "./schema.js";
import { CODEX_IMAGE } from "./versions.js";

export type ProviderReadiness = {
  readonly eligible: boolean;
  readonly reason: string | null;
};

const unavailable = (reason: string): ProviderReadiness => ({ eligible: false, reason });

export const providerReadiness = (input: {
  readonly provider: ProviderKind;
  readonly executionBoundary: ExecutionBoundary;
  readonly dataRoot: string;
}): ProviderReadiness => {
  if (input.provider === "fake") return { eligible: true, reason: null };
  if (input.provider !== "codex") {
    return unavailable("Mara coordination requires a configured Codex provider connection.");
  }
  const stub = process.env.AGENTIS_CODEX_STUB;
  if (stub) {
    try {
      return existsSync(stub) && statSync(stub).isFile()
        ? { eligible: true, reason: null }
        : unavailable("The configured Codex test connection is unavailable.");
    } catch {
      return unavailable("The configured Codex test connection is unavailable.");
    }
  }
  if (input.executionBoundary !== "docker-desktop-run-container") {
    return unavailable("Live Codex requires the configured local provider container.");
  }
  const volume = providerVolume(input.dataRoot);
  const inspected = spawnSync(
    "docker",
    ["volume", "inspect", "--format", '{{index .Labels "io.agentis.managed"}}', volume],
    { encoding: "utf8", timeout: 5_000 },
  );
  if (inspected.status !== 0 || inspected.stdout.trim() !== "provider-auth") {
    return unavailable(
      "Codex authentication is unavailable. Run agentis provider provision first.",
    );
  }
  const checked = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--pull=never",
      "--network",
      "none",
      "--read-only",
      "--user=10001:10001",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--pids-limit=32",
      "--memory=128m",
      "--cpus=1",
      "--mount",
      `type=volume,src=${volume},dst=/provider-auth,readonly`,
      CODEX_IMAGE,
      "test",
      "-s",
      "/provider-auth/auth.json",
    ],
    { stdio: "ignore", timeout: 5_000 },
  );
  return checked.status === 0
    ? { eligible: true, reason: null }
    : unavailable("Codex authentication is unavailable. Run agentis provider login first.");
};
