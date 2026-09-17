import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { browserRuntime } from "../src/http-api.js";
import { executionLocation, frozenConfig, providerProfile } from "../src/provider-profile.js";
import type { ExecutionBoundary, ProviderKind } from "../src/schema.js";
import {
  CLAUDE_CLI_PIN,
  CODEX_AUTH_MODE,
  CODEX_CLI_PIN,
  CODEX_TRANSPORT,
} from "../src/versions.js";
import { tempRoot } from "./helpers/temp-root.js";

const dataRoot = () => tempRoot("agentis-profile-");

const frozenFor = (
  bot: "mara" | "ivo",
  provider: ProviderKind,
  executionBoundary: ExecutionBoundary,
) =>
  frozenConfig({
    bot,
    provider,
    executionBoundary,
    workspaceId: join(dataRoot(), "runs", "run-1"),
  });

describe("provider profile", () => {
  it.each([
    ["fake", "docker-fixture-container"],
    ["fake", "docker-desktop-run-container"],
    ["fake", "unverified-host-scratch"],
    ["claude", "docker-fixture-container"],
    ["claude", "docker-desktop-run-container"],
    ["claude", "unverified-host-scratch"],
    ["codex", "unverified-host-scratch"],
  ] as const)(
    "freezes the %s provider metadata the setup screen reports for %s",
    async (provider, boundary) => {
      const runtime = await browserRuntime(provider, boundary, dataRoot());
      const frozen = frozenFor("mara", provider, boundary);
      expect({
        model: frozen.model,
        authMode: frozen.authMode,
        executionLocation: frozen.executionLocation,
      }).toEqual({
        model: runtime.model,
        authMode: runtime.authMode,
        executionLocation: runtime.executionLocation,
      });
      expect(executionLocation(boundary)).toBe(runtime.executionLocation);
    },
  );

  it("freezes the role, skills, grants, and public config for each bot", () => {
    const mara = frozenFor("mara", "codex", "unverified-host-scratch");
    expect(mara.role).toBe("coordinator");
    expect(mara.skills).toEqual(["coordinate", "business-brief"]);

    const ivo = frozenFor("ivo", "claude", "unverified-host-scratch");
    expect(ivo.role).toBe("specialist");
    expect(ivo.skills).toEqual(["specialist-draft"]);

    for (const frozen of [mara, ivo]) {
      expect(frozen.grants).toEqual(["read:provided-source", "write:task-artifact"]);
      expect(frozen.publicConfig).toEqual({ sourceMode: "materialized-read-only" });
    }
  });

  it("freezes the versioned transport metadata the providers declare", () => {
    expect(providerProfile("codex").model).toBe("gpt-5.6-sol");
    expect(providerProfile("codex").authMode).toBe(CODEX_AUTH_MODE);
    expect(providerProfile("claude").model).toBe("claude-sonnet-5");
    expect(providerProfile("claude").authMode).toBe("api-key");

    const codex = frozenFor("mara", "codex", "unverified-host-scratch");
    expect(codex.transport).toBe(CODEX_TRANSPORT);
    expect(codex.executableVersion).toBe(CODEX_CLI_PIN);
    expect(codex.authMode).toBe(CODEX_AUTH_MODE);
    expect(codex.mode).toBe("agent");

    const claude = frozenFor("ivo", "claude", "unverified-host-scratch");
    expect(claude.transport).toBe("claude-sdk-jsonl-stdio");
    expect(claude.executableVersion).toBe(CLAUDE_CLI_PIN);
    expect(claude.authMode).toBe("api-key");

    const fake = frozenFor("mara", "fake", "unverified-host-scratch");
    expect(fake.transport).toBe("fake-in-process");
    expect(fake.executableVersion).toBe("fake-1");

    const planned = frozenConfig({
      bot: "mara",
      provider: "fake",
      executionBoundary: "unverified-host-scratch",
      workspaceId: join(dataRoot(), "runs", "run-3"),
      mode: "plan",
    });
    expect(planned.mode).toBe("plan");
  });

  it("records effort only for providers that declare one", () => {
    const fake = frozenFor("mara", "fake", "unverified-host-scratch");
    expect(Object.hasOwn(fake, "effort")).toBe(false);

    expect(frozenFor("mara", "codex", "unverified-host-scratch").effort).toBe("medium");
    expect(frozenFor("ivo", "claude", "unverified-host-scratch").effort).toBe("medium");
  });

  it("defaults the deadline and action budget and accepts the handoff overrides", () => {
    const defaults = frozenFor("mara", "codex", "unverified-host-scratch");
    expect(defaults.deadlineMs).toBe(15 * 60 * 1000);
    expect(defaults.actionBudget).toBe(20);

    const overridden = frozenConfig({
      bot: "ivo",
      provider: "claude",
      executionBoundary: "unverified-host-scratch",
      workspaceId: join(dataRoot(), "runs", "run-2"),
      deadlineMs: 1_234,
      actionBudget: 7,
    });
    expect(overridden.deadlineMs).toBe(1_234);
    expect(overridden.actionBudget).toBe(7);
  });
});
