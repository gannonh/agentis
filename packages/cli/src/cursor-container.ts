import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { docker, prepareProviderNetwork, removeProviderNetwork, squidConfig } from "./provider.js";
import { spawnInRunContainer } from "./container.js";
import { CURSOR_CLI_PIN, CURSOR_IMAGE } from "./versions.js";
export const cursorVolume = (root: string) =>
  `agentis-cursor-auth-${createHash("sha256").update(resolve(root)).digest("hex").slice(0, 24)}`;
export const provisionCursor = (dataRoot: string, packagePath: string) => {
  const bytes = readFileSync(packagePath);
  if (
    createHash("sha256").update(bytes).digest("hex") !==
    "fb7bc635be6172ebcf68f907fd9217e3614da51916455c6d7fdb66690997884c"
  )
    throw new Error("Cursor package SHA256 mismatch");
  const context = mkdtempSync(join(tmpdir(), "agentis-cursor-image-"));
  try {
    copyFileSync(packagePath, join(context, "cursor.tar.gz"));
    writeFileSync(
      join(context, "squid.conf"),
      squidConfig.replace(
        "auth.openai.com chatgpt.com",
        "api2.cursor.sh agentn.global.api5.cursor.sh",
      ),
    );
    writeFileSync(
      join(context, "Dockerfile"),
      `FROM node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e\nRUN apt-get update && apt-get install -y --no-install-recommends squid=5.7-2+deb12u6 ca-certificates git && rm -rf /var/lib/apt/lists/*\nCOPY cursor.tar.gz /tmp/cursor.tar.gz\nRUN mkdir -p /opt/cursor /provider-auth /provider-home && tar -xzf /tmp/cursor.tar.gz -C /opt/cursor --strip-components=1 && rm /tmp/cursor.tar.gz && chown 10001:10001 /provider-auth /provider-home\nCOPY squid.conf /etc/squid/squid.conf\nUSER 10001:10001\n`,
    );
    docker(["build", "--platform", "linux/arm64", "--tag", CURSOR_IMAGE, context]);
    docker([
      "volume",
      "create",
      "--label",
      "io.agentis.managed=provider-auth",
      cursorVolume(dataRoot),
    ]);
  } finally {
    rmSync(context, { recursive: true, force: true });
  }
};
export const importCursorKey = (dataRoot: string, key: string) => {
  if (!key.trim() || /[\r\n]/.test(key.trim())) throw new Error("expected one API key");
  docker(["volume", "inspect", cursorVolume(dataRoot)]);
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
      `type=volume,src=${cursorVolume(dataRoot)},dst=/provider-auth`,
      CURSOR_IMAGE,
      "sh",
      "-ec",
      "umask 077; cat > /provider-auth/api-key",
    ],
    { input: key.trim(), encoding: "utf8" },
  );
  if (result.error || result.status !== 0) throw new Error("Cursor API key import failed");
};
export const spawnCursorInContainer = (input: {
  runId: string;
  workspace: string;
  dataRoot: string;
  loadSession?: boolean;
  draftOnly?: boolean;
}) => {
  const volume = cursorVolume(input.dataRoot);
  docker(["volume", "inspect", volume]);
  const homeVolume = `agentis-provider-state-${input.runId}`;
  docker(["volume", "create", "--label", "io.agentis.managed=provider-state", homeVolume]);
  const policyDirectory = join(input.workspace, ".cursor");
  if (input.draftOnly) {
    mkdirSync(policyDirectory, { recursive: true, mode: 0o755 });
    const policy = JSON.stringify({
      permissions: {
        allow: [],
        deny: [
          "Shell(*)",
          "Read(**)",
          "Read(/**)",
          "Write(**)",
          "Write(/**)",
          "WebFetch(*)",
          "Mcp(*:*)",
        ],
      },
    });
    const hooks = JSON.stringify({
      version: 1,
      hooks: {
        subagentStart: [
          {
            command: "/bin/sh .cursor/hooks/deny-native-subagent.sh",
            failClosed: true,
            timeout: 5,
          },
        ],
      },
    });
    const denySubagent = `#!/bin/sh
cat >/dev/null
printf '%s\\n' '{"permission":"deny","user_message":"Native subagents are disabled; use the Agentis handoff."}'
`;
    for (const [relative, expected] of [
      ["cli.json", policy],
      ["hooks.json", hooks],
      ["hooks/deny-native-subagent.sh", denySubagent],
    ] as const) {
      const path = join(policyDirectory, relative);
      if (input.loadSession && !existsSync(path))
        throw new Error("Cursor handoff policy missing; refusing session load");
      mkdirSync(dirname(path), { recursive: true, mode: 0o755 });
      if (!existsSync(path)) writeFileSync(path, expected, { flag: "wx", mode: 0o444 });
      if (readFileSync(path, "utf8") !== expected)
        throw new Error("Cursor handoff policy changed; refusing launch");
    }
  }
  const network = prepareProviderNetwork(input.runId, CURSOR_IMAGE);
  try {
    return spawnInRunContainer({
      runId: input.runId,
      workspace: input.workspace,
      image: CURSOR_IMAGE,
      network,
      providerAuthVolume: volume,
      providerHomeVolume: homeVolume,
      ...(input.loadSession || input.draftOnly ? { workspaceReadonly: true } : {}),
      env: { HOME: "/provider-home" },
      command: [
        "sh",
        "-ec",
        `mkdir -m 700 -p "$HOME"; export CURSOR_API_KEY="$(cat /provider-auth/api-key)"; test "$(/opt/cursor/cursor-agent --version)" = '${CURSOR_CLI_PIN}'; exec /opt/cursor/cursor-agent acp`,
      ],
    });
  } catch (error) {
    removeProviderNetwork(input.runId);
    throw error;
  }
};
