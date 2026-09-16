import type { RunStatus } from "./schema.js";

export const ACTIVE_RUN_STATUSES = [
  "queued",
  "running",
  "waiting_approval",
  "waiting_input",
] as const satisfies readonly RunStatus[];

const quoted = ACTIVE_RUN_STATUSES.map((status) => `'${status}'`).join(",");

export const ACTIVE_RUN_SQL = `status IN (${quoted})`;

export const ACTIVE_RUN_OR_LOADING_SQL = `(${ACTIVE_RUN_SQL} OR json_extract(provider_state,'$.loadStatus')='loading')`;
