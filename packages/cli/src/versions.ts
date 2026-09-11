export const SCHEMA_ID = "agentis.v2.gate0.5";
export const API_FAMILY = "v1";
export const PACKAGE_NAME = "@agentis-labs/cli";
export const PACKAGE_VERSION = "2.0.0";
export const NODE_PIN = "24.20.0";
export const CODEX_CLI_PIN = "0.153.4";
export const CODEX_IMAGE = `agentis-codex:${CODEX_CLI_PIN}`;
export const CODEX_TRANSPORT = "app-server-v2-jsonl-stdio";
export const CODEX_AUTH_MODE = "chatgpt-login";
export const DEFAULT_DATA_ROOT_SEGMENTS = [".agentis", "v2"] as const;
export const RUN_DEADLINE_MS = 15 * 60 * 1000;
export const MAX_ACTIVE_RUNS = 2;
export const MAX_ACTIVE_RUNS_PER_BOT = 1;
export const MAX_ACTIONS_PER_RUN = 20;
export const MAX_ACTIONS_PER_TASK = 40;
export const APPROVAL_TTL_MS = 5 * 60 * 1000;

export const CLAUDE_CLI_PIN = "2.1.263";
export const CLAUDE_IMAGE = `agentis-claude:${CLAUDE_CLI_PIN}`;

export const CLAUDE_SDK_PIN = "0.3.263";
