import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import {
  claudeVolume,
  importClaudeKey,
  provisionClaude,
  spawnClaudeInContainer,
} from "../src/claude-container.js";
import { docker, prepareProviderNetwork, removeProviderNetwork } from "../src/provider.js";
import { spawnInRunContainer } from "../src/container.js";
import { spawnSync } from "node:child_process";

vi.mock("../src/provider.js", async (original) => ({
  ...(await original<typeof import("../src/provider.js")>()),
  docker: vi.fn(() => ""),
  prepareProviderNetwork: vi.fn(() => "test-network"),
  removeProviderNetwork: vi.fn(),
}));
vi.mock("../src/container.js", () => ({ spawnInRunContainer: vi.fn(() => ({ stop: vi.fn() })) }));
vi.mock("node:child_process", () => ({ spawnSync: vi.fn(() => ({ status: 0 })) }));
vi.mock("node:fs", async (original) => ({
  ...(await original<typeof import("node:fs")>()),
  copyFileSync: vi.fn(),
}));
vi.mock("../src/versions.js", () => ({
  CLAUDE_SDK_PIN: "0.3.263",
  CLAUDE_CLI_PIN: "2.1.263",
  CLAUDE_IMAGE: "agentis-claude:0.3.263",
  CODEX_IMAGE: "codex",
  CODEX_CLI_PIN: "0.153.4",
}));
afterEach(() => vi.clearAllMocks());

it("builds the pinned SDK and verifies bundled native CLI with only Anthropic egress", () => {
  let dockerfile = "";
  let proxy = "";
  vi.mocked(docker).mockImplementation((args) => {
    if (args[0] === "build") {
      const context = args.at(-1);
      if (!context) throw new Error("missing context");
      dockerfile = readFileSync(`${context}/Dockerfile`, "utf8");
      proxy = readFileSync(`${context}/squid.conf`, "utf8");
    }
    return "";
  });
  provisionClaude("/scoped-root");
  expect(dockerfile).toContain("@anthropic-ai/claude-agent-sdk@0.3.263");
  expect(dockerfile).toContain("2.1.263");
  expect(dockerfile).toContain("COPY claude-bridge.js claude-result.js /opt/agentis/");
  expect(proxy).toContain("acl provider dstdomain -n api.anthropic.com\n");
  expect(docker).toHaveBeenCalledWith(expect.arrayContaining([claudeVolume("/scoped-root")]));
});

it("imports a scoped key through stdin without putting it in command arguments", () => {
  importClaudeKey("/scoped-root", "secret-value");
  expect(spawnSync).toHaveBeenCalledWith(
    "docker",
    expect.arrayContaining([
      "--network",
      "none",
      "--read-only",
      `type=volume,src=${claudeVolume("/scoped-root")},dst=/provider-auth`,
    ]),
    expect.objectContaining({ input: "secret-value" }),
  );
  expect(JSON.stringify(vi.mocked(spawnSync).mock.calls[0]?.[1])).not.toContain("secret-value");
  expect(() => importClaudeKey("/scoped-root", "\n")).toThrow("one API key");
  expect(() => importClaudeKey("/scoped-root", "a\nb")).toThrow("one API key");
  expect(claudeVolume("/scoped-root")).not.toBe(claudeVolume("/other-root"));
});

it.each([{ draftOnly: true }, { loadSession: true }])(
  "mounts the workspace read-only for %j",
  (mode) => {
    spawnClaudeInContainer({
      runId: "one",
      workspace: "/scratch/one",
      dataRoot: "/scoped-root",
      ...mode,
    });
    expect(spawnInRunContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceReadonly: true,
        providerAuthVolume: claudeVolume("/scoped-root"),
        providerHomeVolume: "agentis-provider-state-one",
        env: { HOME: "/provider-home", CLAUDE_DRAFT_ONLY: mode.draftOnly ? "1" : "0" },
        command: [
          "sh",
          "-ec",
          "test -s /provider-auth/api-key || exit 77; exec node /opt/agentis/claude-bridge.js",
        ],
      }),
    );
  },
);

it("cleans the scoped network when launch fails", () => {
  vi.mocked(spawnInRunContainer).mockImplementationOnce(() => {
    throw new Error("launch failed");
  });
  expect(() =>
    spawnClaudeInContainer({
      runId: "failure",
      workspace: "/scratch/failure",
      dataRoot: "/scoped-root",
    }),
  ).toThrow("launch failed");
  expect(prepareProviderNetwork).toHaveBeenCalledWith("failure", "agentis-claude:0.3.263");
  expect(removeProviderNetwork).toHaveBeenCalledWith("failure");
});
