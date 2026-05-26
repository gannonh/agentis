import {
  index,
  integer,
  sqliteTable,
  text,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    goals: text("goals"),
    status: text("status").notNull(),
    archivedAt: text("archived_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("projects_status_idx").on(table.status),
    index("projects_updated_at_idx").on(table.updatedAt),
  ]
)

export const projectMemories = sqliteTable(
  "project_memories",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("project_memories_project_id_idx").on(table.projectId)]
)

export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    model: text("model").notNull(),
    maxCostPerRunUsd: real("max_cost_per_run_usd"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("agents_name_idx").on(table.name),
    index("agents_updated_at_idx").on(table.updatedAt),
  ]
)

export const agentConfigurationVersions = sqliteTable(
  "agent_configuration_versions",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    model: text("model").notNull(),
    maxCostPerRunUsd: real("max_cost_per_run_usd"),
    toolGrantsJson: text("tool_grants_json").notNull().default("[]"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("agent_configuration_versions_agent_id_idx").on(table.agentId),
    uniqueIndex("agent_configuration_versions_agent_version_unique").on(
      table.agentId,
      table.version
    ),
  ]
)

export const threads = sqliteTable("threads", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  model: text("model").notNull(),
  mode: text("mode").notNull(),
  projectId: text("project_id"),
  agentId: text("agent_id").references(() => agents.id),
  agentNameSnapshot: text("agent_name_snapshot"),
  agentConfigurationVersionId: text("agent_configuration_version_id").references(
    () => agentConfigurationVersions.id
  ),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    partsJson: text("parts_json").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("messages_thread_id_created_at_idx").on(
      table.threadId,
      table.createdAt
    ),
  ]
)

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    model: text("model").notNull(),
    agentId: text("agent_id").references(() => agents.id),
    agentConfigurationVersionId: text("agent_configuration_version_id").references(
      () => agentConfigurationVersions.id
    ),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    errorSummary: text("error_summary"),
    usageJson: text("usage_json"),
    cost: real("cost"),
  },
  (table) => [
    index("runs_thread_id_started_at_idx").on(table.threadId, table.startedAt),
  ]
)

export const integrationToolkits = sqliteTable("integration_toolkits", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  featured: integer("featured", { mode: "boolean" }).notNull(),
  authConfigId: text("auth_config_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

export const integrationConnections = sqliteTable(
  "integration_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    toolkitSlug: text("toolkit_slug")
      .notNull()
      .references(() => integrationToolkits.slug),
    composioConnectedAccountId: text("composio_connected_account_id"),
    composioConnectionRequestId: text("composio_connection_request_id"),
    status: text("status").notNull(),
    accountLabel: text("account_label"),
    scopesJson: text("scopes_json"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("integration_connections_user_id_idx").on(table.userId),
    index("integration_connections_toolkit_slug_idx").on(table.toolkitSlug),
  ]
)

export const agentPromotionDrafts = sqliteTable(
  "agent_promotion_drafts",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    sourceThreadTitle: text("source_thread_title").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    model: text("model").notNull(),
    toolGrantsJson: text("tool_grants_json").notNull().default("[]"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("agent_promotion_drafts_thread_id_idx").on(table.threadId),
    index("agent_promotion_drafts_updated_at_idx").on(table.updatedAt),
  ]
)

export const toolAccessGrants = sqliteTable(
  "tool_access_grants",
  {
    id: text("id").primaryKey(),
    scopeType: text("scope_type").notNull(),
    scopeId: text("scope_id").notNull(),
    toolkitSlug: text("toolkit_slug")
      .notNull()
      .references(() => integrationToolkits.slug),
    connectionId: text("connection_id")
      .notNull()
      .references(() => integrationConnections.id),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("tool_access_grants_scope_idx").on(table.scopeType, table.scopeId),
    index("tool_access_grants_connection_id_idx").on(table.connectionId),
    uniqueIndex("tool_access_grants_scope_toolkit_unique").on(
      table.scopeType,
      table.scopeId,
      table.toolkitSlug
    ),
  ]
)

export const runSteps = sqliteTable(
  "run_steps",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull(),
    title: text("title").notNull(),
    payloadJson: text("payload_json"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("run_steps_run_id_created_at_idx").on(table.runId, table.createdAt),
  ]
)

export const artifacts = sqliteTable(
  "artifacts",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    previewText: text("preview_text"),
    metadataJson: text("metadata_json"),
    projectId: text("project_id").references(() => projects.id),
    projectNameSnapshot: text("project_name_snapshot"),
    threadId: text("thread_id").references(() => threads.id),
    threadTitleSnapshot: text("thread_title_snapshot"),
    runId: text("run_id").references(() => runs.id),
    agentId: text("agent_id"),
    agentNameSnapshot: text("agent_name_snapshot"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("artifacts_type_idx").on(table.type),
    index("artifacts_project_id_idx").on(table.projectId),
    index("artifacts_thread_id_idx").on(table.threadId),
    index("artifacts_run_id_idx").on(table.runId),
    index("artifacts_created_at_idx").on(table.createdAt),
  ]
)
