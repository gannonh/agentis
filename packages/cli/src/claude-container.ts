import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { docker, prepareProviderNetwork, removeProviderNetwork, squidConfig } from "./provider.js";
import { spawnInRunContainer } from "./container.js";
import { CLAUDE_SDK_PIN, CLAUDE_CLI_PIN, CLAUDE_IMAGE } from "./versions.js";

export const claudeVolume = (root: string) =>
  `agentis-claude-auth-${createHash("sha256").update(resolve(root)).digest("hex").slice(0, 24)}`;

export const provisionClaude = (dataRoot: string) => {
  const context = mkdtempSync(join(tmpdir(), "agentis-claude-image-"));
  try {
    for (const name of ["claude-bridge.js", "claude-result.js"])
      copyFileSync(new URL(`./${name}`, import.meta.url), join(context, name));
    writeFileSync(
      join(context, "squid.conf"),
      squidConfig.replace("auth.openai.com chatgpt.com", "api.anthropic.com"),
    );
    writeFileSync(
      join(context, "Dockerfile"),
      `FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e
RUN apt-get update && apt-get install -y --no-install-recommends squid=5.7-2+deb12u6 ca-certificates git && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/agentis /provider-auth /provider-home && chown 10001:10001 /provider-auth /provider-home
WORKDIR /opt/agentis
RUN npm install --save-exact @anthropic-ai/claude-agent-sdk@${CLAUDE_SDK_PIN} && test "$(node_modules/@anthropic-ai/claude-agent-sdk-linux-arm64/claude --version)" = '${CLAUDE_CLI_PIN} (Claude Code)'
RUN printf '%s' '{"type":"module"}' > package.json
COPY claude-bridge.js claude-result.js /opt/agentis/
COPY squid.conf /etc/squid/squid.conf
USER 10001:10001
`,
    );
    docker(["build", "--platform", "linux/arm64", "--tag", CLAUDE_IMAGE, context]);
    docker([
      "volume",
      "create",
      "--label",
      "io.agentis.managed=provider-auth",
      claudeVolume(dataRoot),
    ]);
  } finally {
    rmSync(context, { recursive: true, force: true });
  }
};

export const importClaudeKey = (dataRoot: string, key: string) => {
  if (!key.trim() || /[\r\n]/.test(key.trim())) throw new Error("expected one API key");
  docker(["volume", "inspect", claudeVolume(dataRoot)]);
  const result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--read-only",
      "--user=10001:10001",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--mount",
      `type=volume,src=${claudeVolume(dataRoot)},dst=/provider-auth`,
      CLAUDE_IMAGE,
      "sh",
      "-ec",
      "umask 077; cat > /provider-auth/api-key",
    ],
    { input: key.trim(), encoding: "utf8" },
  );
  if (result.error || result.status !== 0) throw new Error("Claude API key import failed");
};

export const spawnClaudeInContainer = (input: {
  runId: string;
  workspace: string;
  dataRoot: string;
  loadSession?: boolean;
  draftOnly?: boolean;
}) => {
  const volume = claudeVolume(input.dataRoot);
  docker(["volume", "inspect", volume]);
  const homeVolume = `agentis-provider-state-${input.runId}`;
  docker(["volume", "create", "--label", "io.agentis.managed=provider-state", homeVolume]);
  const network = prepareProviderNetwork(input.runId, CLAUDE_IMAGE);
  try {
    return spawnInRunContainer({
      runId: input.runId,
      workspace: input.workspace,
      image: CLAUDE_IMAGE,
      network,
      providerAuthVolume: volume,
      providerHomeVolume: homeVolume,
      ...(input.loadSession || input.draftOnly ? { workspaceReadonly: true } : {}),
      env: { HOME: "/provider-home", CLAUDE_DRAFT_ONLY: input.draftOnly ? "1" : "0" },
      command: [
        "sh",
        "-ec",
        "test -s /provider-auth/api-key || exit 77; exec node /opt/agentis/claude-bridge.js",
      ],
    });
  } catch (error) {
    removeProviderNetwork(input.runId);
    throw error;
  }
};
