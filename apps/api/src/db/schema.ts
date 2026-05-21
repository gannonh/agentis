import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"

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

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  partsJson: text("parts_json").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
})

export const runs = sqliteTable("runs", {
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
})

export const runSteps = sqliteTable("run_steps", {
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
})
