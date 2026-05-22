import {
  index,
  integer,
  sqliteTable,
  text,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const threads = sqliteTable("threads", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  model: text("model").notNull(),
  mode: text("mode").notNull(),
  projectId: text("project_id"),
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
