import type { ExecutionBoundary, FrozenConfig, ProviderKind } from "./schema.js";
import {
  CLAUDE_CLI_PIN,
  CODEX_AUTH_MODE,
  CODEX_CLI_PIN,
  CODEX_TRANSPORT,
  MAX_ACTIONS_PER_RUN,
  RUN_DEADLINE_MS,
} from "./versions.js";

export type ProviderProfile = {
  readonly model: string;
  readonly authMode: string;
  readonly transport: string;
  readonly executableVersion: string;
  readonly effort: string | null;
};

export type BotName = "mara" | "ivo";

const PROFILES: Record<ProviderKind, ProviderProfile> = {
  codex: {
    model: "gpt-5.6-sol",
    authMode: CODEX_AUTH_MODE,
    transport: CODEX_TRANSPORT,
    executableVersion: CODEX_CLI_PIN,
    effort: "medium",
  },
  claude: {
    model: "claude-sonnet-5",
    authMode: "api-key",
    transport: "claude-sdk-jsonl-stdio",
    executableVersion: CLAUDE_CLI_PIN,
    effort: "medium",
  },
  fake: {
    model: "fake",
    authMode: "none",
    transport: "fake-in-process",
    executableVersion: "fake-1",
    effort: null,
  },
};

export const providerProfile = (provider: ProviderKind): ProviderProfile => PROFILES[provider];

const LOCATIONS: Record<ExecutionBoundary, string> = {
  "docker-fixture-container": "isolated fixture container",
  "docker-desktop-run-container": "local provider container",
  "unverified-host-scratch": "local daemon scratch",
};

export const executionLocation = (boundary: ExecutionBoundary): string => LOCATIONS[boundary];

const BOTS: Record<
  BotName,
  { readonly role: "coordinator" | "specialist"; readonly skills: readonly string[] }
> = {
  mara: { role: "coordinator", skills: ["coordinate", "business-brief"] },
  ivo: { role: "specialist", skills: ["specialist-draft"] },
};

export const frozenConfig = (input: {
  readonly bot: BotName;
  readonly provider: ProviderKind;
  readonly executionBoundary: ExecutionBoundary;
  readonly workspaceId: string;
  readonly mode?: "agent" | "plan" | undefined;
  readonly deadlineMs?: number | undefined;
  readonly actionBudget?: number | undefined;
}): FrozenConfig => {
  const profile = providerProfile(input.provider);
  const bot = BOTS[input.bot];
  return {
    bot: input.bot,
    role: bot.role,
    mode: input.mode ?? "agent",
    provider: input.provider,
    transport: profile.transport,
    executableVersion: profile.executableVersion,
    model: profile.model,
    ...(profile.effort === null ? {} : { effort: profile.effort }),
    skills: [...bot.skills],
    grants: ["read:provided-source", "write:task-artifact"],
    publicConfig: { sourceMode: "materialized-read-only" },
    executionBoundary: input.executionBoundary,
    executionLocation: executionLocation(input.executionBoundary),
    authMode: profile.authMode,
    workspaceId: input.workspaceId,
    deadlineMs: input.deadlineMs ?? RUN_DEADLINE_MS,
    actionBudget: input.actionBudget ?? MAX_ACTIONS_PER_RUN,
  };
};
