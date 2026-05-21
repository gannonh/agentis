# M02 Threads and Run Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an API-backed thread surface where users create, stream, abort, and resume OpenAI-powered runs with persisted transcripts and timeline steps.

**Architecture:** Add a Hono `apps/api` service that owns SQLite persistence, run execution, runtime health, and streaming. Keep `apps/web` as the Vite React client, using AI Elements for the chat surface and the existing Agentis shell for navigation. Use the AI SDK as the provider and tool-loop layer while Agentis owns thread, run, message, and step state.

**Tech Stack:** Hono, Drizzle ORM, SQLite, Vercel AI SDK, `@ai-sdk/openai`, AI Elements, React 19, React Router, Vitest, Playwright, pnpm workspaces, Turbo.

---

## Scope check

The approved spec is one vertical slice: thread creation, local persistence, streaming execution, abort, resume, and thread UI. Chat SDK, Composio, worker queues, app-entered API keys, Docker Compose, and API-backed non-thread screens are outside this plan.

## File structure

Create and modify these files only unless a generated AI Elements component requires an additional support file:

### API service

- Create: `apps/api/package.json` - API package scripts and dependencies.
- Create: `apps/api/tsconfig.json` - Node TypeScript config.
- Create: `apps/api/vitest.config.ts` - API test config.
- Create: `apps/api/drizzle.config.ts` - Drizzle migration config.
- Create: `apps/api/.env.example` - documented server env variables without secrets.
- Create: `apps/api/src/index.ts` - Hono server entrypoint.
- Create: `apps/api/src/app.ts` - Hono app composition and CORS.
- Create: `apps/api/src/config/env.ts` - env parsing and runtime health.
- Create: `apps/api/src/db/schema.ts` - Drizzle tables and enums.
- Create: `apps/api/src/db/client.ts` - SQLite client factory.
- Create: `apps/api/src/db/repositories.ts` - thread, message, run, and step persistence.
- Create: `apps/api/src/domain/types.ts` - API-facing domain types.
- Create: `apps/api/src/domain/ids.ts` - stable id generation.
- Create: `apps/api/src/runtime/get-workspace-summary-tool.ts` - local demo tool.
- Create: `apps/api/src/runtime/run-executor.ts` - ToolLoopAgent execution and NDJSON stream events.
- Create: `apps/api/src/http/thread-routes.ts` - thread and run routes.
- Create: `apps/api/src/test/repositories.test.ts` - repository tests.
- Create: `apps/api/src/test/thread-routes.test.ts` - route tests.
- Create: `apps/api/src/test/run-executor.test.ts` - executor tests with a deterministic fake stream.

### Web client

- Modify: `apps/web/package.json` - add AI SDK React dependency if AI Elements does not add it.
- Modify: `apps/web/vite.config.ts` - proxy `/api` to the API dev server.
- Modify: `apps/web/src/router.tsx` - add `/threads/:threadId` route.
- Modify: `apps/web/src/components/shell/app-sidebar.tsx` - read real API thread list for the Threads section only.
- Modify: `apps/web/src/routes/new-thread.tsx` - use API-backed launch composer.
- Create: `apps/web/src/routes/thread-detail.tsx` - durable thread session route.
- Create: `apps/web/src/lib/api-client.ts` - typed fetch helpers and stream parser.
- Create: `apps/web/src/lib/thread-types.ts` - web-facing thread types matching API DTOs.
- Create: `apps/web/src/hooks/use-runtime-health.ts` - health fetch state.
- Create: `apps/web/src/hooks/use-thread-list.ts` - real thread list state.
- Create: `apps/web/src/hooks/use-thread-session.ts` - thread detail, streaming, and abort state.
- Create: `apps/web/src/components/thread/thread-launcher.tsx` - `/threads/new` composer.
- Create: `apps/web/src/components/thread/thread-session.tsx` - transcript, timeline, and follow-up composer.
- Create: `apps/web/src/components/thread/run-timeline.tsx` - visible lifecycle steps.
- Create: `apps/web/src/components/thread/runtime-disabled-callout.tsx` - runtime unavailable states.
- Create via AI Elements CLI: `apps/web/src/components/ai-elements/*` - conversation, message, prompt-input, reasoning, tool, loader.
- Test: `apps/web/src/routes/new-thread.test.tsx` - update launch route expectations.
- Test: `apps/web/src/routes/thread-detail.test.tsx` - add session route tests.
- Test: `apps/web/src/components/shell/app-sidebar.test.tsx` - update Threads navigation expectations.

### E2E

- Create or modify: `tests/e2e/m02-thread-lifecycle.spec.ts` - create, stream, abort, resume, and complete flows.

---

## Task 1: Create the API workspace skeleton

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/config/env.ts`
- Modify: `turbo.json`

- [ ] **Step 1: Create the API package manifest**

Write `apps/api/package.json`:

```json
{
  "name": "api",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@ai-sdk/openai": "latest",
    "@hono/node-server": "latest",
    "ai": "latest",
    "better-sqlite3": "latest",
    "dotenv": "latest",
    "drizzle-orm": "latest",
    "hono": "latest",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/better-sqlite3": "latest",
    "@types/node": "latest",
    "drizzle-kit": "latest",
    "tsx": "latest",
    "typescript": "5.9.3",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: Install API dependencies**

Run:

```bash
pnpm install
```

Expected: pnpm updates `pnpm-lock.yaml` and installs `ai`, `@ai-sdk/openai`, Hono, Drizzle, and SQLite packages.

- [ ] **Step 3: Add API TypeScript config**

Write `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "noEmit": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Add API Vitest config**

Write `apps/api/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
})
```

- [ ] **Step 5: Add Drizzle config**

Write `apps/api/drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ? process.env.DATABASE_URL : "./data/agentis.sqlite",
  },
})
```

- [ ] **Step 6: Add API env example**

Write `apps/api/.env.example`:

```dotenv
# Server-only values. Do not expose these through Vite env variables.
PORT=8787
DATABASE_URL=./data/agentis.sqlite
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
WEB_ORIGIN=http://localhost:5173
```

- [ ] **Step 7: Add env parser**

Write `apps/api/src/config/env.ts`:

```ts
import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().min(1).default("./data/agentis.sqlite"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5-mini"),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
})

export type Env = z.infer<typeof envSchema>

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source)
}

export function getRuntimeHealth(env: Env) {
  const hasOpenAIKey = Boolean(env.OPENAI_API_KEY?.trim())

  return {
    available: hasOpenAIKey,
    model: env.OPENAI_MODEL,
    reasons: hasOpenAIKey ? [] : ["OPENAI_API_KEY is missing"],
  }
}
```

- [ ] **Step 8: Add a minimal Hono app**

Write `apps/api/src/app.ts`:

```ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "./config/env.js"
import { getRuntimeHealth } from "./config/env.js"

export function createApp(env: Env) {
  const app = new Hono()

  app.use(
    "*",
    cors({
      origin: env.WEB_ORIGIN,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })
  )

  app.get("/api/health", (c) => {
    return c.json({
      ok: true,
      runtime: getRuntimeHealth(env),
    })
  })

  return app
}
```

Write `apps/api/src/index.ts`:

```ts
import { serve } from "@hono/node-server"
import { createApp } from "./app.js"
import { readEnv } from "./config/env.js"

const env = readEnv()
const app = createApp(env)

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Agentis API listening on http://localhost:${info.port}`)
  }
)
```

- [ ] **Step 9: Verify local API typecheck and health test manually**

Run:

```bash
pnpm --filter api typecheck
pnpm --filter api build
```

Expected: both commands exit 0.

Run:

```bash
pnpm --filter api dev
```

In a second terminal, run:

```bash
curl -s http://localhost:8787/api/health | jq .
```

Expected shape:

```json
{
  "ok": true,
  "runtime": {
    "available": false,
    "model": "gpt-5-mini",
    "reasons": ["OPENAI_API_KEY is missing"]
  }
}
```

Stop the dev server after this check.

- [ ] **Step 10: Commit API skeleton**

Run:

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/vitest.config.ts apps/api/drizzle.config.ts apps/api/.env.example apps/api/src/index.ts apps/api/src/app.ts apps/api/src/config/env.ts pnpm-lock.yaml
git commit -m "feat(api): add hono service skeleton"
```

---

## Task 2: Add SQLite schema and repositories

**Files:**
- Create: `apps/api/src/domain/types.ts`
- Create: `apps/api/src/domain/ids.ts`
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/repositories.ts`
- Create: `apps/api/src/test/repositories.test.ts`

- [ ] **Step 1: Write failing repository tests**

Write `apps/api/src/test/repositories.test.ts`:

```ts
import Database from "better-sqlite3"
import { beforeEach, describe, expect, it } from "vitest"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as schema from "../db/schema.js"
import { createRepositories } from "../db/repositories.js"

function createTestRepositories() {
  const sqlite = new Database(":memory:")
  const db = drizzle(sqlite, { schema })
  db.run(`
    CREATE TABLE threads (
      id text PRIMARY KEY NOT NULL,
      title text NOT NULL,
      status text NOT NULL,
      selected_model text NOT NULL,
      selected_mode text NOT NULL,
      project_id text,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE messages (
      id text PRIMARY KEY NOT NULL,
      thread_id text NOT NULL,
      role text NOT NULL,
      content text NOT NULL,
      status text NOT NULL,
      created_at integer NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE runs (
      id text PRIMARY KEY NOT NULL,
      thread_id text NOT NULL,
      status text NOT NULL,
      model text NOT NULL,
      error_summary text,
      usage_json text,
      started_at integer,
      finished_at integer,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE run_steps (
      id text PRIMARY KEY NOT NULL,
      run_id text NOT NULL,
      type text NOT NULL,
      status text NOT NULL,
      title text NOT NULL,
      payload_json text NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL
    );
  `)
  return createRepositories(db)
}

describe("thread repositories", () => {
  let repos: ReturnType<typeof createTestRepositories>

  beforeEach(() => {
    repos = createTestRepositories()
  })

  it("creates a thread with an initial user message", async () => {
    const thread = await repos.createThread({
      title: "Summarize the workspace",
      selectedModel: "gpt-5-mini",
      selectedMode: "plan",
      initialMessage: "Summarize the workspace",
    })

    const loaded = await repos.getThread(thread.id)

    expect(loaded?.thread.title).toBe("Summarize the workspace")
    expect(loaded?.messages).toHaveLength(1)
    expect(loaded?.messages[0]).toMatchObject({
      role: "user",
      content: "Summarize the workspace",
      status: "completed",
    })
  })

  it("stores run status transitions and timeline steps", async () => {
    const thread = await repos.createThread({
      title: "Use the tool",
      selectedModel: "gpt-5-mini",
      selectedMode: "plan",
      initialMessage: "Use the tool",
    })
    const run = await repos.createRun({ threadId: thread.id, model: "gpt-5-mini" })

    await repos.updateRunStatus(run.id, "running")
    await repos.createRunStep({
      runId: run.id,
      type: "tool-call",
      status: "running",
      title: "getWorkspaceSummary",
      payload: { toolName: "getWorkspaceSummary" },
    })
    await repos.updateRunStatus(run.id, "completed")

    const loaded = await repos.getThread(thread.id)

    expect(loaded?.runs[0].status).toBe("completed")
    expect(loaded?.steps[0]).toMatchObject({
      type: "tool-call",
      title: "getWorkspaceSummary",
      status: "running",
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter api test -- src/test/repositories.test.ts
```

Expected: FAIL because `../db/schema.js` and `../db/repositories.js` do not exist.

- [ ] **Step 3: Add domain types**

Write `apps/api/src/domain/types.ts`:

```ts
export type ThreadStatus = "active" | "finished" | "failed"
export type MessageRole = "user" | "assistant" | "system"
export type MessageStatus = "streaming" | "completed" | "failed" | "aborted"
export type RunStatus =
  | "queued"
  | "running"
  | "tool-calling"
  | "completed"
  | "failed"
  | "aborted"
export type RunStepType =
  | "reasoning"
  | "tool-call"
  | "tool-result"
  | "output"
  | "warning"
  | "error"
  | "abort"
export type RunStepStatus = "queued" | "running" | "completed" | "failed" | "aborted"

export interface ThreadRecord {
  id: string
  title: string
  status: ThreadStatus
  selectedModel: string
  selectedMode: string
  projectId: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageRecord {
  id: string
  threadId: string
  role: MessageRole
  content: string
  status: MessageStatus
  createdAt: string
}

export interface RunRecord {
  id: string
  threadId: string
  status: RunStatus
  model: string
  errorSummary: string | null
  usage: Record<string, unknown> | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RunStepRecord {
  id: string
  runId: string
  type: RunStepType
  status: RunStepStatus
  title: string
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ThreadDetail {
  thread: ThreadRecord
  messages: MessageRecord[]
  runs: RunRecord[]
  steps: RunStepRecord[]
}
```

Write `apps/api/src/domain/ids.ts`:

```ts
import { randomUUID } from "node:crypto"

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`
}
```

- [ ] **Step 4: Add Drizzle schema**

Write `apps/api/src/db/schema.ts`:

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const threads = sqliteTable("threads", {
  id: text("id").primaryKey().notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  selectedModel: text("selected_model").notNull(),
  selectedMode: text("selected_mode").notNull(),
  projectId: text("project_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().notNull(),
  threadId: text("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
})

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey().notNull(),
  threadId: text("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  model: text("model").notNull(),
  errorSummary: text("error_summary"),
  usageJson: text("usage_json"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

export const runSteps = sqliteTable("run_steps", {
  id: text("id").primaryKey().notNull(),
  runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull(),
  title: text("title").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})
```

- [ ] **Step 5: Add database client**

Write `apps/api/src/db/client.ts`:

```ts
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as schema from "./schema.js"

export type DatabaseClient = ReturnType<typeof createDatabaseClient>

export function createDatabaseClient(databaseUrl: string) {
  if (databaseUrl !== ":memory:") {
    mkdirSync(dirname(databaseUrl), { recursive: true })
  }

  const sqlite = new Database(databaseUrl)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")

  return drizzle(sqlite, { schema })
}
```

- [ ] **Step 6: Add repositories**

Write `apps/api/src/db/repositories.ts`:

```ts
import { asc, desc, eq } from "drizzle-orm"
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import type * as schema from "./schema.js"
import { messages, runs, runSteps, threads } from "./schema.js"
import { createId } from "../domain/ids.js"
import type {
  MessageRecord,
  MessageStatus,
  RunRecord,
  RunStatus,
  RunStepRecord,
  RunStepStatus,
  RunStepType,
  ThreadDetail,
  ThreadRecord,
  ThreadStatus,
} from "../domain/types.js"

type Db = BetterSQLite3Database<typeof schema>

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function mapThread(row: typeof threads.$inferSelect): ThreadRecord {
  return {
    id: row.id,
    title: row.title,
    status: row.status as ThreadStatus,
    selectedModel: row.selectedModel,
    selectedMode: row.selectedMode,
    projectId: row.projectId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapMessage(row: typeof messages.$inferSelect): MessageRecord {
  return {
    id: row.id,
    threadId: row.threadId,
    role: row.role as MessageRecord["role"],
    content: row.content,
    status: row.status as MessageStatus,
    createdAt: row.createdAt.toISOString(),
  }
}

function mapRun(row: typeof runs.$inferSelect): RunRecord {
  return {
    id: row.id,
    threadId: row.threadId,
    status: row.status as RunStatus,
    model: row.model,
    errorSummary: row.errorSummary,
    usage: row.usageJson ? (JSON.parse(row.usageJson) as Record<string, unknown>) : null,
    startedAt: toIso(row.startedAt),
    finishedAt: toIso(row.finishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapStep(row: typeof runSteps.$inferSelect): RunStepRecord {
  return {
    id: row.id,
    runId: row.runId,
    type: row.type as RunStepType,
    status: row.status as RunStepStatus,
    title: row.title,
    payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function createRepositories(db: Db) {
  return {
    async listThreads(): Promise<ThreadRecord[]> {
      const rows = await db.select().from(threads).orderBy(desc(threads.updatedAt))
      return rows.map(mapThread)
    },

    async getThread(threadId: string): Promise<ThreadDetail | null> {
      const [thread] = await db.select().from(threads).where(eq(threads.id, threadId))
      if (!thread) return null

      const threadMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, threadId))
        .orderBy(asc(messages.createdAt))
      const threadRuns = await db
        .select()
        .from(runs)
        .where(eq(runs.threadId, threadId))
        .orderBy(asc(runs.createdAt))
      const steps = threadRuns.length
        ? await db.select().from(runSteps).orderBy(asc(runSteps.createdAt))
        : []
      const runIds = new Set(threadRuns.map((run) => run.id))

      return {
        thread: mapThread(thread),
        messages: threadMessages.map(mapMessage),
        runs: threadRuns.map(mapRun),
        steps: steps.filter((step) => runIds.has(step.runId)).map(mapStep),
      }
    },

    async createThread(input: {
      title: string
      selectedModel: string
      selectedMode: string
      initialMessage: string
      projectId?: string | null
    }): Promise<ThreadRecord> {
      const now = new Date()
      const threadId = createId("thread")
      await db.insert(threads).values({
        id: threadId,
        title: input.title,
        status: "active",
        selectedModel: input.selectedModel,
        selectedMode: input.selectedMode,
        projectId: input.projectId ? input.projectId : null,
        createdAt: now,
        updatedAt: now,
      })
      await db.insert(messages).values({
        id: createId("msg"),
        threadId,
        role: "user",
        content: input.initialMessage,
        status: "completed",
        createdAt: now,
      })
      return (await this.getThread(threadId))!.thread
    },

    async appendMessage(input: {
      threadId: string
      role: "user" | "assistant" | "system"
      content: string
      status: MessageStatus
    }): Promise<MessageRecord> {
      const now = new Date()
      const id = createId("msg")
      await db.insert(messages).values({
        id,
        threadId: input.threadId,
        role: input.role,
        content: input.content,
        status: input.status,
        createdAt: now,
      })
      await db.update(threads).set({ updatedAt: now }).where(eq(threads.id, input.threadId))
      const [row] = await db.select().from(messages).where(eq(messages.id, id))
      return mapMessage(row)
    },

    async updateMessage(input: {
      messageId: string
      content: string
      status: MessageStatus
    }): Promise<void> {
      await db.update(messages).set({ content: input.content, status: input.status }).where(eq(messages.id, input.messageId))
    },

    async createRun(input: { threadId: string; model: string }): Promise<RunRecord> {
      const now = new Date()
      const id = createId("run")
      await db.insert(runs).values({
        id,
        threadId: input.threadId,
        status: "queued",
        model: input.model,
        errorSummary: null,
        usageJson: null,
        startedAt: null,
        finishedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      const [row] = await db.select().from(runs).where(eq(runs.id, id))
      return mapRun(row)
    },

    async updateRunStatus(runId: string, status: RunStatus, errorSummary?: string): Promise<void> {
      const now = new Date()
      await db
        .update(runs)
        .set({
          status,
          errorSummary: errorSummary ? errorSummary : null,
          startedAt: status === "running" ? now : undefined,
          finishedAt: ["completed", "failed", "aborted"].includes(status) ? now : undefined,
          updatedAt: now,
        })
        .where(eq(runs.id, runId))
    },

    async createRunStep(input: {
      runId: string
      type: RunStepType
      status: RunStepStatus
      title: string
      payload: Record<string, unknown>
    }): Promise<RunStepRecord> {
      const now = new Date()
      const id = createId("step")
      await db.insert(runSteps).values({
        id,
        runId: input.runId,
        type: input.type,
        status: input.status,
        title: input.title,
        payloadJson: JSON.stringify(input.payload),
        createdAt: now,
        updatedAt: now,
      })
      const [row] = await db.select().from(runSteps).where(eq(runSteps.id, id))
      return mapStep(row)
    },

    async updateRunStep(input: {
      stepId: string
      status: RunStepStatus
      payload: Record<string, unknown>
    }): Promise<void> {
      await db
        .update(runSteps)
        .set({ status: input.status, payloadJson: JSON.stringify(input.payload), updatedAt: new Date() })
        .where(eq(runSteps.id, input.stepId))
    },
  }
}
```

- [ ] **Step 7: Run repository tests**

Run:

```bash
pnpm --filter api test -- src/test/repositories.test.ts
```

Expected: PASS.

- [ ] **Step 8: Generate migration**

Run:

```bash
pnpm --filter api db:generate
```

Expected: Drizzle creates SQL files under `apps/api/drizzle/`.

- [ ] **Step 9: Commit schema and repositories**

Run:

```bash
git add apps/api/src/domain/types.ts apps/api/src/domain/ids.ts apps/api/src/db/schema.ts apps/api/src/db/client.ts apps/api/src/db/repositories.ts apps/api/src/test/repositories.test.ts apps/api/drizzle
git commit -m "feat(api): persist thread run records"
```

---

## Task 3: Add thread and runtime health routes

**Files:**
- Create: `apps/api/src/http/thread-routes.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/test/thread-routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Write `apps/api/src/test/thread-routes.test.ts`:

```ts
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { describe, expect, it } from "vitest"
import { createApp } from "../app.js"
import { createRepositories } from "../db/repositories.js"
import * as schema from "../db/schema.js"

function createDb() {
  const sqlite = new Database(":memory:")
  const db = drizzle(sqlite, { schema })
  db.run(`CREATE TABLE threads (id text PRIMARY KEY NOT NULL, title text NOT NULL, status text NOT NULL, selected_model text NOT NULL, selected_mode text NOT NULL, project_id text, created_at integer NOT NULL, updated_at integer NOT NULL);`)
  db.run(`CREATE TABLE messages (id text PRIMARY KEY NOT NULL, thread_id text NOT NULL, role text NOT NULL, content text NOT NULL, status text NOT NULL, created_at integer NOT NULL);`)
  db.run(`CREATE TABLE runs (id text PRIMARY KEY NOT NULL, thread_id text NOT NULL, status text NOT NULL, model text NOT NULL, error_summary text, usage_json text, started_at integer, finished_at integer, created_at integer NOT NULL, updated_at integer NOT NULL);`)
  db.run(`CREATE TABLE run_steps (id text PRIMARY KEY NOT NULL, run_id text NOT NULL, type text NOT NULL, status text NOT NULL, title text NOT NULL, payload_json text NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL);`)
  return db
}

describe("thread routes", () => {
  it("creates and loads a thread", async () => {
    const repos = createRepositories(createDb())
    const app = createApp(
      {
        PORT: 8787,
        DATABASE_URL: ":memory:",
        OPENAI_API_KEY: undefined,
        OPENAI_MODEL: "gpt-5-mini",
        WEB_ORIGIN: "http://localhost:5173",
      },
      repos
    )

    const createResponse = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Plan a launch", selectedModel: "gpt-5-mini", selectedMode: "plan" }),
    })
    expect(createResponse.status).toBe(201)
    const created = await createResponse.json()

    const getResponse = await app.request(`/api/threads/${created.thread.id}`)
    expect(getResponse.status).toBe(200)
    const detail = await getResponse.json()

    expect(detail.thread.title).toBe("Plan a launch")
    expect(detail.messages[0].content).toBe("Plan a launch")
  })

  it("returns 400 for an empty thread prompt", async () => {
    const repos = createRepositories(createDb())
    const app = createApp(
      {
        PORT: 8787,
        DATABASE_URL: ":memory:",
        OPENAI_API_KEY: "test-key",
        OPENAI_MODEL: "gpt-5-mini",
        WEB_ORIGIN: "http://localhost:5173",
      },
      repos
    )

    const response = await app.request("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "", selectedModel: "gpt-5-mini", selectedMode: "plan" }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Thread text is required" })
  })
})
```

- [ ] **Step 2: Run route tests to verify they fail**

Run:

```bash
pnpm --filter api test -- src/test/thread-routes.test.ts
```

Expected: FAIL because `createApp` does not accept repositories and `/api/threads` routes do not exist.

- [ ] **Step 3: Add thread routes**

Write `apps/api/src/http/thread-routes.ts`:

```ts
import { Hono } from "hono"
import { z } from "zod"
import type { createRepositories } from "../db/repositories.js"

type Repositories = ReturnType<typeof createRepositories>

const createThreadSchema = z.object({
  text: z.string().trim().min(1),
  selectedModel: z.string().trim().min(1),
  selectedMode: z.string().trim().min(1).default("plan"),
  projectId: z.string().trim().min(1).optional(),
})

function titleFromText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized
}

export function createThreadRoutes(repos: Repositories) {
  const routes = new Hono()

  routes.get("/threads", async (c) => {
    return c.json({ threads: await repos.listThreads() })
  })

  routes.post("/threads", async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = createThreadSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: "Thread text is required" }, 400)
    }

    const thread = await repos.createThread({
      title: titleFromText(parsed.data.text),
      selectedModel: parsed.data.selectedModel,
      selectedMode: parsed.data.selectedMode,
      initialMessage: parsed.data.text,
      projectId: parsed.data.projectId ? parsed.data.projectId : null,
    })

    const detail = await repos.getThread(thread.id)
    return c.json(detail, 201)
  })

  routes.get("/threads/:threadId", async (c) => {
    const detail = await repos.getThread(c.req.param("threadId"))
    if (!detail) {
      return c.json({ error: "Thread not found" }, 404)
    }
    return c.json(detail)
  })

  return routes
}
```

- [ ] **Step 4: Wire repositories into the app**

Replace `apps/api/src/app.ts` with:

```ts
import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "./config/env.js"
import { getRuntimeHealth } from "./config/env.js"
import { createDatabaseClient } from "./db/client.js"
import { createRepositories } from "./db/repositories.js"
import { createThreadRoutes } from "./http/thread-routes.js"

export function createApp(
  env: Env,
  repos = createRepositories(createDatabaseClient(env.DATABASE_URL))
) {
  const app = new Hono()

  app.use(
    "*",
    cors({
      origin: env.WEB_ORIGIN,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    })
  )

  app.get("/api/health", (c) => {
    return c.json({
      ok: true,
      runtime: getRuntimeHealth(env),
    })
  })

  app.route("/api", createThreadRoutes(repos))

  return app
}
```

- [ ] **Step 5: Run route tests**

Run:

```bash
pnpm --filter api test -- src/test/thread-routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit routes**

Run:

```bash
git add apps/api/src/http/thread-routes.ts apps/api/src/app.ts apps/api/src/test/thread-routes.test.ts
git commit -m "feat(api): add thread routes"
```

---

## Task 4: Add ToolLoopAgent run streaming and abort

**Files:**
- Create: `apps/api/src/runtime/get-workspace-summary-tool.ts`
- Create: `apps/api/src/runtime/run-executor.ts`
- Modify: `apps/api/src/http/thread-routes.ts`
- Create: `apps/api/src/test/run-executor.test.ts`

- [ ] **Step 1: Verify current AI SDK APIs before coding**

Run:

```bash
test -d node_modules/ai/docs && grep -R "ToolLoopAgent" node_modules/ai/docs node_modules/ai/src | head -20
grep -R "inputSchema" node_modules/ai/docs node_modules/ai/src | head -20
grep -R "fullStream" node_modules/ai/docs node_modules/ai/src | head -20
```

Expected: output confirms `ToolLoopAgent`, `tool({ inputSchema })`, and stream result iteration are available. If any command prints no matching lines, stop and inspect `node_modules/ai/dist/index.d.ts` before editing runtime files.

Run:

```bash
curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '.data[] | select(.id | startswith("openai/gpt-5")) | .id' | tail -20
```

Expected: output includes current OpenAI GPT-5 model ids. Keep `OPENAI_MODEL` configurable even if the default remains `gpt-5-mini`.

- [ ] **Step 2: Write failing executor tests**

Write `apps/api/src/test/run-executor.test.ts`:

```ts
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { describe, expect, it } from "vitest"
import { createRepositories } from "../db/repositories.js"
import * as schema from "../db/schema.js"
import { executeDeterministicRun } from "../runtime/run-executor.js"

function createRepos() {
  const sqlite = new Database(":memory:")
  const db = drizzle(sqlite, { schema })
  db.run(`CREATE TABLE threads (id text PRIMARY KEY NOT NULL, title text NOT NULL, status text NOT NULL, selected_model text NOT NULL, selected_mode text NOT NULL, project_id text, created_at integer NOT NULL, updated_at integer NOT NULL);`)
  db.run(`CREATE TABLE messages (id text PRIMARY KEY NOT NULL, thread_id text NOT NULL, role text NOT NULL, content text NOT NULL, status text NOT NULL, created_at integer NOT NULL);`)
  db.run(`CREATE TABLE runs (id text PRIMARY KEY NOT NULL, thread_id text NOT NULL, status text NOT NULL, model text NOT NULL, error_summary text, usage_json text, started_at integer, finished_at integer, created_at integer NOT NULL, updated_at integer NOT NULL);`)
  db.run(`CREATE TABLE run_steps (id text PRIMARY KEY NOT NULL, run_id text NOT NULL, type text NOT NULL, status text NOT NULL, title text NOT NULL, payload_json text NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL);`)
  return createRepositories(db)
}

describe("run executor", () => {
  it("persists streamed text and a completed run", async () => {
    const repos = createRepos()
    const thread = await repos.createThread({
      title: "Hello",
      selectedModel: "gpt-5-mini",
      selectedMode: "plan",
      initialMessage: "Hello",
    })
    const run = await repos.createRun({ threadId: thread.id, model: "gpt-5-mini" })

    const events = []
    for await (const event of executeDeterministicRun({ repos, threadId: thread.id, runId: run.id, text: "Hello world" })) {
      events.push(event)
    }

    const detail = await repos.getThread(thread.id)
    expect(events.some((event) => event.type === "run-status" && event.status === "completed")).toBe(true)
    expect(detail?.messages.find((message) => message.role === "assistant")?.content).toBe("Hello world")
    expect(detail?.runs[0].status).toBe("completed")
  })

  it("persists aborted partial text", async () => {
    const repos = createRepos()
    const thread = await repos.createThread({
      title: "Abort",
      selectedModel: "gpt-5-mini",
      selectedMode: "plan",
      initialMessage: "Abort",
    })
    const run = await repos.createRun({ threadId: thread.id, model: "gpt-5-mini" })
    const abortController = new AbortController()

    const events = []
    for await (const event of executeDeterministicRun({ repos, threadId: thread.id, runId: run.id, text: "Partial response", abortSignal: abortController.signal, abortAfterCharacters: 7 })) {
      events.push(event)
      if (event.type === "text-delta") abortController.abort()
    }

    const detail = await repos.getThread(thread.id)
    expect(detail?.messages.find((message) => message.role === "assistant")?.content).toBe("Partial")
    expect(detail?.runs[0].status).toBe("aborted")
    expect(detail?.steps.some((step) => step.type === "abort")).toBe(true)
  })
})
```

- [ ] **Step 3: Run executor tests to verify they fail**

Run:

```bash
pnpm --filter api test -- src/test/run-executor.test.ts
```

Expected: FAIL because `../runtime/run-executor.js` does not exist.

- [ ] **Step 4: Add the local demo tool**

Write `apps/api/src/runtime/get-workspace-summary-tool.ts`:

```ts
import { tool } from "ai"
import { z } from "zod"

export const getWorkspaceSummaryTool = tool({
  description: "Return a small summary of the local Agentis demo workspace.",
  inputSchema: z.object({
    focus: z.enum(["agents", "threads", "runs", "all"]).default("all"),
  }),
  execute: async ({ focus }) => {
    const summary = {
      workspaceName: "Agentis Demo Workspace",
      agents: 3,
      recentThreads: 1,
      recentRuns: 1,
      focus,
    }

    return summary
  },
})
```

- [ ] **Step 5: Add run executor and NDJSON event helpers**

Write `apps/api/src/runtime/run-executor.ts`:

```ts
import { openai } from "@ai-sdk/openai"
import { stepCountIs, ToolLoopAgent } from "ai"
import type { createRepositories } from "../db/repositories.js"
import type { RunStatus } from "../domain/types.js"
import { getWorkspaceSummaryTool } from "./get-workspace-summary-tool.js"

type Repositories = ReturnType<typeof createRepositories>

export type RunStreamEvent =
  | { type: "run-created"; runId: string }
  | { type: "run-status"; runId: string; status: RunStatus }
  | { type: "message-created"; messageId: string }
  | { type: "text-delta"; messageId: string; delta: string; content: string }
  | { type: "step"; stepId: string; title: string; status: string }
  | { type: "error"; message: string }

export function encodeNdjson(event: RunStreamEvent): string {
  return `${JSON.stringify(event)}\n`
}

export async function* executeDeterministicRun(input: {
  repos: Repositories
  threadId: string
  runId: string
  text: string
  abortSignal?: AbortSignal
  abortAfterCharacters?: number
}): AsyncGenerator<RunStreamEvent> {
  yield { type: "run-created", runId: input.runId }
  await input.repos.updateRunStatus(input.runId, "running")
  yield { type: "run-status", runId: input.runId, status: "running" }

  const assistant = await input.repos.appendMessage({
    threadId: input.threadId,
    role: "assistant",
    content: "",
    status: "streaming",
  })
  yield { type: "message-created", messageId: assistant.id }

  let content = ""
  for (const char of input.text) {
    if (input.abortSignal?.aborted || (input.abortAfterCharacters && content.length >= input.abortAfterCharacters)) {
      await input.repos.updateMessage({ messageId: assistant.id, content, status: "aborted" })
      await input.repos.createRunStep({
        runId: input.runId,
        type: "abort",
        status: "aborted",
        title: "Run aborted",
        payload: { preservedCharacters: content.length },
      })
      await input.repos.updateRunStatus(input.runId, "aborted")
      yield { type: "run-status", runId: input.runId, status: "aborted" }
      return
    }
    content += char
    await input.repos.updateMessage({ messageId: assistant.id, content, status: "streaming" })
    yield { type: "text-delta", messageId: assistant.id, delta: char, content }
  }

  await input.repos.updateMessage({ messageId: assistant.id, content, status: "completed" })
  await input.repos.updateRunStatus(input.runId, "completed")
  yield { type: "run-status", runId: input.runId, status: "completed" }
}

export async function* executeOpenAIRun(input: {
  repos: Repositories
  threadId: string
  runId: string
  prompt: string
  model: string
  abortSignal: AbortSignal
}): AsyncGenerator<RunStreamEvent> {
  yield { type: "run-created", runId: input.runId }
  await input.repos.updateRunStatus(input.runId, "running")
  yield { type: "run-status", runId: input.runId, status: "running" }

  const assistant = await input.repos.appendMessage({
    threadId: input.threadId,
    role: "assistant",
    content: "",
    status: "streaming",
  })
  yield { type: "message-created", messageId: assistant.id }

  const agent = new ToolLoopAgent({
    model: openai(input.model),
    instructions: "You are Agentis, a precise operator assistant. Use getWorkspaceSummary when a user asks about the local workspace, available demo agents, threads, or runs.",
    stopWhen: stepCountIs(4),
    tools: {
      getWorkspaceSummary: getWorkspaceSummaryTool,
    },
  })

  let content = ""

  try {
    const result = await agent.stream({
      prompt: input.prompt,
      abortSignal: input.abortSignal,
    })

    for await (const part of result.fullStream) {
      if (input.abortSignal.aborted) {
        await input.repos.updateMessage({ messageId: assistant.id, content, status: "aborted" })
        await input.repos.createRunStep({
          runId: input.runId,
          type: "abort",
          status: "aborted",
          title: "Run aborted",
          payload: { preservedCharacters: content.length },
        })
        await input.repos.updateRunStatus(input.runId, "aborted")
        yield { type: "run-status", runId: input.runId, status: "aborted" }
        return
      }

      if (part.type === "text-delta") {
        content += part.textDelta
        await input.repos.updateMessage({ messageId: assistant.id, content, status: "streaming" })
        yield { type: "text-delta", messageId: assistant.id, delta: part.textDelta, content }
      }

      if (part.type === "tool-call") {
        await input.repos.updateRunStatus(input.runId, "tool-calling")
        const step = await input.repos.createRunStep({
          runId: input.runId,
          type: "tool-call",
          status: "running",
          title: part.toolName,
          payload: { toolCallId: part.toolCallId, input: part.input },
        })
        yield { type: "step", stepId: step.id, title: step.title, status: step.status }
      }

      if (part.type === "tool-result") {
        await input.repos.updateRunStatus(input.runId, "running")
        const step = await input.repos.createRunStep({
          runId: input.runId,
          type: "tool-result",
          status: "completed",
          title: part.toolName,
          payload: { toolCallId: part.toolCallId, output: part.output },
        })
        yield { type: "step", stepId: step.id, title: step.title, status: step.status }
      }
    }

    await input.repos.updateMessage({ messageId: assistant.id, content, status: "completed" })
    await input.repos.updateRunStatus(input.runId, "completed")
    yield { type: "run-status", runId: input.runId, status: "completed" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown provider error"
    const status = input.abortSignal.aborted ? "aborted" : "failed"
    await input.repos.updateMessage({ messageId: assistant.id, content, status })
    await input.repos.createRunStep({
      runId: input.runId,
      type: status === "aborted" ? "abort" : "error",
      status,
      title: status === "aborted" ? "Run aborted" : "Run failed",
      payload: { message },
    })
    await input.repos.updateRunStatus(input.runId, status, status === "failed" ? message : undefined)
    yield status === "failed" ? { type: "error", message } : { type: "run-status", runId: input.runId, status }
  }
}
```

- [ ] **Step 6: Run executor tests**

Run:

```bash
pnpm --filter api test -- src/test/run-executor.test.ts
```

Expected: PASS.

- [ ] **Step 7: Add stream and abort routes**

Modify `apps/api/src/http/thread-routes.ts` so it includes these additions:

```ts
import type { Env } from "../config/env.js"
import { getRuntimeHealth } from "../config/env.js"
import { encodeNdjson, executeOpenAIRun } from "../runtime/run-executor.js"
```

Change the function signature:

```ts
export function createThreadRoutes(repos: Repositories, env: Env) {
```

Add module-level abort storage above `createThreadRoutes`:

```ts
const activeRuns = new Map<string, AbortController>()

const streamRunSchema = z.object({
  text: z.string().trim().min(1),
  selectedModel: z.string().trim().min(1),
})
```

Add these routes before `return routes`:

```ts
  routes.post("/threads/:threadId/runs/stream", async (c) => {
    const runtime = getRuntimeHealth(env)
    if (!runtime.available) {
      return c.json({ error: runtime.reasons[0] ? runtime.reasons[0] : "Runtime unavailable" }, 503)
    }

    const threadId = c.req.param("threadId")
    const detail = await repos.getThread(threadId)
    if (!detail) {
      return c.json({ error: "Thread not found" }, 404)
    }

    const body = await c.req.json().catch(() => null)
    const parsed = streamRunSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: "Run text is required" }, 400)
    }

    await repos.appendMessage({
      threadId,
      role: "user",
      content: parsed.data.text,
      status: "completed",
    })
    const run = await repos.createRun({ threadId, model: parsed.data.selectedModel })
    const abortController = new AbortController()
    activeRuns.set(run.id, abortController)

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const event of executeOpenAIRun({
            repos,
            threadId,
            runId: run.id,
            prompt: parsed.data.text,
            model: parsed.data.selectedModel,
            abortSignal: abortController.signal,
          })) {
            controller.enqueue(encoder.encode(encodeNdjson(event)))
          }
        } finally {
          activeRuns.delete(run.id)
          controller.close()
        }
      },
      cancel() {
        abortController.abort()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  })

  routes.post("/runs/:runId/abort", async (c) => {
    const controller = activeRuns.get(c.req.param("runId"))
    if (!controller) {
      return c.json({ ok: false, reason: "Run is not active" }, 404)
    }
    controller.abort()
    return c.json({ ok: true })
  })
```

Modify `apps/api/src/app.ts` route wiring:

```ts
  app.route("/api", createThreadRoutes(repos, env))
```

- [ ] **Step 8: Run API typecheck**

Run:

```bash
pnpm --filter api typecheck
```

Expected: PASS. If TypeScript reports an AI SDK property name mismatch in `run-executor.ts`, inspect `node_modules/ai/dist/index.d.ts` and rename only the mismatched stream part property.

- [ ] **Step 9: Commit runtime streaming**

Run:

```bash
git add apps/api/src/runtime/get-workspace-summary-tool.ts apps/api/src/runtime/run-executor.ts apps/api/src/http/thread-routes.ts apps/api/src/app.ts apps/api/src/test/run-executor.test.ts
git commit -m "feat(api): stream runs with local tool calls"
```

---

## Task 5: Add web API client and Vite proxy

**Files:**
- Modify: `apps/web/vite.config.ts`
- Create: `apps/web/src/lib/thread-types.ts`
- Create: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/hooks/use-runtime-health.ts`
- Create: `apps/web/src/hooks/use-thread-list.ts`

- [ ] **Step 1: Write client type files**

Write `apps/web/src/lib/thread-types.ts`:

```ts
export type ThreadStatus = "active" | "finished" | "failed"
export type MessageStatus = "streaming" | "completed" | "failed" | "aborted"
export type RunStatus = "queued" | "running" | "tool-calling" | "completed" | "failed" | "aborted"

export interface RuntimeHealth {
  available: boolean
  model: string
  reasons: string[]
}

export interface ThreadRecord {
  id: string
  title: string
  status: ThreadStatus
  selectedModel: string
  selectedMode: string
  projectId: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageRecord {
  id: string
  threadId: string
  role: "user" | "assistant" | "system"
  content: string
  status: MessageStatus
  createdAt: string
}

export interface RunRecord {
  id: string
  threadId: string
  status: RunStatus
  model: string
  errorSummary: string | null
  usage: Record<string, unknown> | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RunStepRecord {
  id: string
  runId: string
  type: "reasoning" | "tool-call" | "tool-result" | "output" | "warning" | "error" | "abort"
  status: "queued" | "running" | "completed" | "failed" | "aborted"
  title: string
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ThreadDetail {
  thread: ThreadRecord
  messages: MessageRecord[]
  runs: RunRecord[]
  steps: RunStepRecord[]
}

export type RunStreamEvent =
  | { type: "run-created"; runId: string }
  | { type: "run-status"; runId: string; status: RunStatus }
  | { type: "message-created"; messageId: string }
  | { type: "text-delta"; messageId: string; delta: string; content: string }
  | { type: "step"; stepId: string; title: string; status: string }
  | { type: "error"; message: string }
```

- [ ] **Step 2: Write API client**

Write `apps/web/src/lib/api-client.ts`:

```ts
import type { RuntimeHealth, RunStreamEvent, ThreadDetail, ThreadRecord } from "./thread-types"

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(typeof body.error === "string" ? body.error : response.statusText)
  }
  return response.json() as Promise<T>
}

export async function getRuntimeHealth(): Promise<RuntimeHealth> {
  const response = await fetch("/api/health")
  const body = await parseJson<{ runtime: RuntimeHealth }>(response)
  return body.runtime
}

export async function listThreads(): Promise<ThreadRecord[]> {
  const response = await fetch("/api/threads")
  const body = await parseJson<{ threads: ThreadRecord[] }>(response)
  return body.threads
}

export async function createThread(input: {
  text: string
  selectedModel: string
  selectedMode: string
}): Promise<ThreadDetail> {
  const response = await fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  return parseJson<ThreadDetail>(response)
}

export async function getThread(threadId: string): Promise<ThreadDetail> {
  const response = await fetch(`/api/threads/${threadId}`)
  return parseJson<ThreadDetail>(response)
}

export async function abortRun(runId: string): Promise<void> {
  const response = await fetch(`/api/runs/${runId}/abort`, { method: "POST" })
  await parseJson<{ ok: boolean }>(response)
}

export async function* streamRun(input: {
  threadId: string
  text: string
  selectedModel: string
  signal: AbortSignal
}): AsyncGenerator<RunStreamEvent> {
  const response = await fetch(`/api/threads/${input.threadId}/runs/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.text, selectedModel: input.selectedModel }),
    signal: input.signal,
  })

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(typeof body.error === "string" ? body.error : "Unable to stream run")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line) as RunStreamEvent
      }
    }
  }

  if (buffer.trim()) {
    yield JSON.parse(buffer) as RunStreamEvent
  }
}
```

- [ ] **Step 3: Add hooks**

Write `apps/web/src/hooks/use-runtime-health.ts`:

```ts
import { useEffect, useState } from "react"
import { getRuntimeHealth } from "@/lib/api-client"
import type { RuntimeHealth } from "@/lib/thread-types"

export function useRuntimeHealth() {
  const [runtime, setRuntime] = useState<RuntimeHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getRuntimeHealth()
      .then((value) => {
        if (active) setRuntime(value)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "API server unavailable")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { runtime, error, loading }
}
```

Write `apps/web/src/hooks/use-thread-list.ts`:

```ts
import { useEffect, useState } from "react"
import { listThreads } from "@/lib/api-client"
import type { ThreadRecord } from "@/lib/thread-types"

export function useThreadList() {
  const [threads, setThreads] = useState<ThreadRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try {
      setThreads(await listThreads())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load threads")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return { threads, error, loading, refresh }
}
```

- [ ] **Step 4: Add Vite API proxy**

Modify `apps/web/vite.config.ts`:

```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
})
```

- [ ] **Step 5: Run web typecheck**

Run:

```bash
pnpm --filter web typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit web client foundation**

Run:

```bash
git add apps/web/vite.config.ts apps/web/src/lib/thread-types.ts apps/web/src/lib/api-client.ts apps/web/src/hooks/use-runtime-health.ts apps/web/src/hooks/use-thread-list.ts
git commit -m "feat(web): add thread api client"
```

---

## Task 6: Install AI Elements and build thread UI components

**Files:**
- Create via CLI: `apps/web/src/components/ai-elements/*`
- Create: `apps/web/src/components/thread/runtime-disabled-callout.tsx`
- Create: `apps/web/src/components/thread/run-timeline.tsx`
- Create: `apps/web/src/components/thread/thread-launcher.tsx`
- Create: `apps/web/src/components/thread/thread-session.tsx`
- Create: `apps/web/src/hooks/use-thread-session.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install AI Elements components**

Run from repo root:

```bash
pnpm dlx ai-elements@latest add conversation
pnpm dlx ai-elements@latest add message
pnpm dlx ai-elements@latest add prompt-input
pnpm dlx ai-elements@latest add reasoning
pnpm dlx ai-elements@latest add tool
pnpm dlx ai-elements@latest add loader
```

Expected: files are added under `apps/web/src/components/ai-elements/` or the CLI reports their actual destination. If files are added to a different package because of monorepo detection, move them under `apps/web/src/components/ai-elements/` and fix imports to use `@/components/ai-elements/*` and `@workspace/ui/*`.

- [ ] **Step 2: Add React AI SDK dependency if missing**

Run:

```bash
pnpm --filter web add @ai-sdk/react ai
```

Expected: `apps/web/package.json` includes `@ai-sdk/react` and `ai`.

- [ ] **Step 3: Review generated components**

Run:

```bash
rg "@/components/ui|lucide-react|FIXME|HACK" apps/web/src/components/ai-elements || true
pnpm --filter web typecheck
```

Expected: no unresolved `@/components/ui` imports remain. If `lucide-react` appears, keep it only if the generated component declares it in `apps/web/package.json`; otherwise replace icons at usage sites with Hugeicons and do not edit generated internals unless typecheck fails.

- [ ] **Step 4: Add runtime disabled callout**

Write `apps/web/src/components/thread/runtime-disabled-callout.tsx`:

```tsx
import { Badge } from "@workspace/ui/components/badge"
import type { RuntimeHealth } from "@/lib/thread-types"

export function RuntimeDisabledCallout({
  runtime,
  error,
}: {
  runtime: RuntimeHealth | null
  error: string | null
}) {
  const reason = error ? error : runtime?.reasons[0] ? runtime.reasons[0] : "Runtime unavailable"

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3 text-left">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Runtime disabled</p>
        <p className="text-muted-foreground text-xs">{reason}</p>
      </div>
      <Badge variant="secondary">Setup required</Badge>
    </div>
  )
}
```

- [ ] **Step 5: Add run timeline**

Write `apps/web/src/components/thread/run-timeline.tsx`:

```tsx
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import type { RunRecord, RunStepRecord } from "@/lib/thread-types"

const statusLabels: Record<RunRecord["status"], string> = {
  queued: "Queued",
  running: "Running",
  "tool-calling": "Tool calling",
  completed: "Completed",
  failed: "Failed",
  aborted: "Aborted",
}

export function RunTimeline({ runs, steps }: { runs: RunRecord[]; steps: RunStepRecord[] }) {
  const latestRun = runs.at(-1)

  if (!latestRun) {
    return null
  }

  return (
    <aside className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:max-w-xs">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Run timeline</h2>
        <Badge variant="secondary">{statusLabels[latestRun.status]}</Badge>
      </div>
      <ol className="flex flex-col gap-2">
        {steps.length === 0 ? (
          <li className="text-muted-foreground text-xs">Waiting for run events.</li>
        ) : (
          steps.map((step) => (
            <li key={step.id} className="flex items-start gap-2 text-xs">
              <span
                className={cn(
                  "mt-1 size-2 rounded-full bg-muted-foreground",
                  step.status === "running" && "bg-agent-blue",
                  step.status === "completed" && "bg-foreground",
                  step.status === "failed" && "bg-destructive",
                  step.status === "aborted" && "bg-muted-foreground"
                )}
                aria-hidden
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">{step.title}</span>
                <span className="text-muted-foreground capitalize">{step.type.replace("-", " ")} · {step.status}</span>
              </div>
            </li>
          ))
        )}
      </ol>
    </aside>
  )
}
```

- [ ] **Step 6: Add thread session hook**

Write `apps/web/src/hooks/use-thread-session.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react"
import { abortRun, getThread, streamRun } from "@/lib/api-client"
import type { RunStatus, ThreadDetail } from "@/lib/thread-types"

export function useThreadSession(threadId: string) {
  const [detail, setDetail] = useState<ThreadDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [status, setStatus] = useState<RunStatus | "idle">("idle")
  const abortControllerRef = useRef<AbortController | null>(null)

  const reload = useCallback(async () => {
    setDetail(await getThread(threadId))
  }, [threadId])

  useEffect(() => {
    let active = true
    getThread(threadId)
      .then((value) => {
        if (active) setDetail(value)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load thread")
      })
    return () => {
      active = false
    }
  }, [threadId])

  const send = useCallback(
    async (text: string, selectedModel: string) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setError(null)
      setStatus("queued")

      try {
        for await (const event of streamRun({ threadId, text, selectedModel, signal: controller.signal })) {
          if (event.type === "run-created") setActiveRunId(event.runId)
          if (event.type === "run-status") setStatus(event.status)
          await reload()
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Unable to stream run")
          setStatus("failed")
        }
      } finally {
        abortControllerRef.current = null
        await reload()
      }
    },
    [reload, threadId]
  )

  const abort = useCallback(async () => {
    if (!activeRunId) return
    await abortRun(activeRunId).catch(() => undefined)
    abortControllerRef.current?.abort()
    setStatus("aborted")
    await reload()
  }, [activeRunId, reload])

  return { detail, error, status, activeRunId, send, abort, reload }
}
```

- [ ] **Step 7: Add thread launcher component**

Write `apps/web/src/components/thread/thread-launcher.tsx`:

```tsx
import { useState } from "react"
import { useNavigate } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { createThread } from "@/lib/api-client"
import type { RuntimeHealth } from "@/lib/thread-types"
import { RuntimeDisabledCallout } from "./runtime-disabled-callout"

export function ThreadLauncher({
  runtime,
  runtimeError,
}: {
  runtime: RuntimeHealth | null
  runtimeError: string | null
}) {
  const navigate = useNavigate()
  const [text, setText] = useState("")
  const [mode, setMode] = useState("plan")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const disabled = submitting || !runtime?.available || !text.trim()

  async function submit() {
    if (disabled) return
    setSubmitting(true)
    setError(null)
    try {
      const detail = await createThread({ text, selectedModel: runtime.model, selectedMode: mode })
      navigate(`/threads/${detail.thread.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create thread")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {(!runtime?.available || runtimeError) && (
        <RuntimeDisabledCallout runtime={runtime} error={runtimeError} />
      )}
      <PromptInput onSubmit={submit} className="w-full overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm">
        <PromptInputTextarea
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder="What's the task?"
          className="min-h-28"
        />
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" disabled>
            Add attachment
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setMode(mode === "plan" ? "act" : "plan")}> 
              {mode === "plan" ? "Plan" : "Act"}
            </Button>
            <PromptInputSubmit status={submitting ? "submitted" : "ready"} disabled={disabled} />
          </div>
        </div>
      </PromptInput>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 8: Add thread session component**

Write `apps/web/src/components/thread/thread-session.tsx`:

```tsx
import { Fragment, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { useRuntimeHealth } from "@/hooks/use-runtime-health"
import { useThreadSession } from "@/hooks/use-thread-session"
import { RuntimeDisabledCallout } from "./runtime-disabled-callout"
import { RunTimeline } from "./run-timeline"

export function ThreadSession({ threadId }: { threadId: string }) {
  const { runtime, error: runtimeError } = useRuntimeHealth()
  const { detail, error, status, send, abort } = useThreadSession(threadId)
  const [text, setText] = useState("")
  const active = status === "queued" || status === "running" || status === "tool-calling"
  const disabled = active || !runtime?.available || !text.trim()

  async function submit() {
    if (disabled || !runtime) return
    const prompt = text
    setText("")
    await send(prompt, runtime.model)
  }

  if (!detail) {
    return <p className="text-muted-foreground text-sm">Loading thread...</p>
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        {(!runtime?.available || runtimeError) && <RuntimeDisabledCallout runtime={runtime} error={runtimeError} />}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Conversation className="min-h-[48vh] rounded-xl border border-border bg-card">
          <ConversationContent>
            {detail.messages.map((message) => (
              <Fragment key={message.id}>
                <Message from={message.role === "assistant" ? "assistant" : "user"}>
                  <MessageContent>
                    <MessageResponse>{message.content}</MessageResponse>
                    {message.status === "aborted" && (
                      <p className="text-muted-foreground mt-2 text-xs">Run aborted. Partial response preserved.</p>
                    )}
                  </MessageContent>
                </Message>
              </Fragment>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <PromptInput onSubmit={submit} className="rounded-xl border border-border bg-card">
          <PromptInputTextarea
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            placeholder="Follow up..."
          />
          <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
            {active && (
              <Button type="button" variant="outline" size="sm" onClick={abort}>
                Abort
              </Button>
            )}
            <PromptInputSubmit status={active ? "streaming" : "ready"} disabled={disabled} />
          </div>
        </PromptInput>
      </section>
      <RunTimeline runs={detail.runs} steps={detail.steps} />
    </div>
  )
}
```

- [ ] **Step 9: Run web typecheck**

Run:

```bash
pnpm --filter web typecheck
```

Expected: PASS. If AI Elements `PromptInputSubmit` uses a different status union, open `apps/web/src/components/ai-elements/prompt-input.tsx`, use its exported prop type, and map `active` to the nearest built-in active status.

- [ ] **Step 10: Commit AI Elements thread UI components**

Run:

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/components/ai-elements apps/web/src/components/thread apps/web/src/hooks/use-thread-session.ts
git commit -m "feat(web): add ai elements thread surface"
```

---

## Task 7: Wire routes, sidebar, and launch page

**Files:**
- Modify: `apps/web/src/router.tsx`
- Create: `apps/web/src/routes/thread-detail.tsx`
- Modify: `apps/web/src/routes/new-thread.tsx`
- Modify: `apps/web/src/components/shell/app-sidebar.tsx`
- Modify: `apps/web/src/routes/new-thread.test.tsx`
- Create: `apps/web/src/routes/thread-detail.test.tsx`
- Modify: `apps/web/src/components/shell/app-sidebar.test.tsx`

- [ ] **Step 1: Add thread detail route**

Write `apps/web/src/routes/thread-detail.tsx`:

```tsx
import { useParams } from "react-router"
import { ThreadSession } from "@/components/thread/thread-session"
import { PageLayout } from "@/components/shell/page-layout"

export function ThreadDetailPage() {
  const { threadId } = useParams()

  if (!threadId) {
    return <PageLayout><p className="text-sm">Thread not found.</p></PageLayout>
  }

  return (
    <PageLayout className="gap-6">
      <ThreadSession threadId={threadId} />
    </PageLayout>
  )
}
```

Modify `apps/web/src/router.tsx` imports and route list:

```tsx
import { ThreadDetailPage } from "@/routes/thread-detail"
```

Add below the `/threads/new` route:

```tsx
{ path: "threads/:threadId", element: <ThreadDetailPage /> },
```

- [ ] **Step 2: Update new thread page**

Replace `apps/web/src/routes/new-thread.tsx` with:

```tsx
import { AgentPicker } from "@/components/new-thread/agent-picker"
import { DEFAULT_AGENT_PICKER_ID } from "@/components/new-thread/agent-picker-options"
import { QuickActions } from "@/components/new-thread/quick-actions"
import { RecentThreadsSection } from "@/components/new-thread/recent-threads-section"
import { PageLayout } from "@/components/shell/page-layout"
import { ThreadLauncher } from "@/components/thread/thread-launcher"
import { useRuntimeHealth } from "@/hooks/use-runtime-health"
import { useThreadList } from "@/hooks/use-thread-list"
import { useState } from "react"

export function NewThreadPage() {
  const [selectedAgentId, setSelectedAgentId] = useState(DEFAULT_AGENT_PICKER_ID)
  const { runtime, error: runtimeError } = useRuntimeHealth()
  const { threads } = useThreadList()
  const recentThreads = threads.slice(0, 3).map((thread) => ({
    id: thread.id,
    title: thread.title,
    status: thread.status === "active" ? "active" : thread.status === "failed" ? "failed" : "finished",
    updatedAt: thread.updatedAt,
  }))

  return (
    <PageLayout variant="focused" className="gap-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-3xl font-medium tracking-tight">Let&apos;s get to work.</h1>
        <AgentPicker value={selectedAgentId} onChange={setSelectedAgentId} />
        <ThreadLauncher runtime={runtime} runtimeError={runtimeError} />
        <QuickActions />
      </div>

      <RecentThreadsSection threads={recentThreads} />
    </PageLayout>
  )
}
```

- [ ] **Step 3: Update sidebar thread navigation**

In `apps/web/src/components/shell/app-sidebar.tsx`, replace fixture thread usage with `useThreadList()`:

```tsx
import { useThreadList } from "@/hooks/use-thread-list"
import type { ThreadRecord } from "@/lib/thread-types"
```

Replace `ThreadSidebarItem` with:

```tsx
function ThreadSidebarItem({ thread }: { thread: ThreadRecord }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<NavLink to={`/threads/${thread.id}`} end className={navLinkClass} />}
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            thread.status === "finished" ? "bg-muted-foreground" : "bg-sidebar-primary"
          )}
          aria-hidden
        />
        <span>{thread.title}</span>
      </SidebarMenuButton>
      <SidebarMenuBadge>{thread.status === "finished" ? "Finished" : thread.status}</SidebarMenuBadge>
    </SidebarMenuItem>
  )
}
```

Inside `AppSidebar`, keep `workspace` for user and agents, and add:

```tsx
const { threads } = useThreadList()
```

The Threads section should map `threads` instead of `workspace.threads`.

- [ ] **Step 4: Update tests for new thread**

Replace `apps/web/src/routes/new-thread.test.tsx` with:

```tsx
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NewThreadPage } from "./new-thread"

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockImplementation((url: string) => {
    if (url === "/api/health") {
      return Promise.resolve(new Response(JSON.stringify({ runtime: { available: false, model: "gpt-5-mini", reasons: ["OPENAI_API_KEY is missing"] } })))
    }
    if (url === "/api/threads") {
      return Promise.resolve(new Response(JSON.stringify({ threads: [] })))
    }
    return Promise.resolve(new Response("{}", { status: 404 }))
  })
})

describe("NewThreadPage", () => {
  it("shows runtime disabled reason and launch composer", async () => {
    render(
      <MemoryRouter>
        <NewThreadPage />
      </MemoryRouter>
    )

    expect(screen.getByRole("heading", { name: "Let's get to work." })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("What's the task?")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText("OPENAI_API_KEY is missing")).toBeInTheDocument())
  })
})
```

- [ ] **Step 5: Add thread detail test**

Write `apps/web/src/routes/thread-detail.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ThreadDetailPage } from "./thread-detail"

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  fetchMock.mockImplementation((url: string) => {
    if (url === "/api/health") {
      return Promise.resolve(new Response(JSON.stringify({ runtime: { available: true, model: "gpt-5-mini", reasons: [] } })))
    }
    if (url === "/api/threads/thread_demo") {
      return Promise.resolve(new Response(JSON.stringify({
        thread: { id: "thread_demo", title: "Demo", status: "active", selectedModel: "gpt-5-mini", selectedMode: "plan", projectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        messages: [{ id: "msg_1", threadId: "thread_demo", role: "user", content: "Hello", status: "completed", createdAt: new Date().toISOString() }],
        runs: [],
        steps: [],
      })))
    }
    return Promise.resolve(new Response("{}", { status: 404 }))
  })
})

describe("ThreadDetailPage", () => {
  it("renders persisted thread messages", async () => {
    render(
      <MemoryRouter initialEntries={["/threads/thread_demo"]}>
        <Routes>
          <Route path="/threads/:threadId" element={<ThreadDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => expect(screen.getByText("Hello")).toBeInTheDocument())
  })
})
```

- [ ] **Step 6: Run route tests**

Run:

```bash
pnpm --filter web test -- src/routes/new-thread.test.tsx src/routes/thread-detail.test.tsx src/components/shell/app-sidebar.test.tsx
```

Expected: PASS. If sidebar tests need fetch stubs, add the same `/api/threads` mock used in `new-thread.test.tsx`.

- [ ] **Step 7: Commit route wiring**

Run:

```bash
git add apps/web/src/router.tsx apps/web/src/routes/thread-detail.tsx apps/web/src/routes/new-thread.tsx apps/web/src/components/shell/app-sidebar.tsx apps/web/src/routes/new-thread.test.tsx apps/web/src/routes/thread-detail.test.tsx apps/web/src/components/shell/app-sidebar.test.tsx
git commit -m "feat(web): wire durable thread routes"
```

---

## Task 8: Add end-to-end lifecycle coverage and docs updates

**Files:**
- Create: `tests/e2e/m02-thread-lifecycle.spec.ts`
- Modify: `README.md`
- Modify: `docs/agentis-prd-roadmap.md` only if M02 status or development notes need to be updated after implementation succeeds.

- [ ] **Step 1: Add E2E lifecycle test**

Write `tests/e2e/m02-thread-lifecycle.spec.ts`:

```ts
import { expect, test } from "@playwright/test"

test.describe("M02 thread lifecycle", () => {
  test("shows runtime disabled state without server credentials", async ({ page }) => {
    await page.goto("/threads/new")
    await expect(page.getByRole("heading", { name: "Let's get to work." })).toBeVisible()
    await expect(page.getByText(/Runtime disabled|Runtime unavailable|OPENAI_API_KEY is missing/)).toBeVisible()
  })
})
```

- [ ] **Step 2: Add README M02 development commands**

Open `README.md` and add this section near local development commands:

```md
### M02 local runtime

The web app can run against a local API runtime for threads and streaming runs.

```bash
cp apps/api/.env.example apps/api/.env
pnpm --filter api db:migrate
pnpm --filter api dev
pnpm --filter web dev
```

Set `OPENAI_API_KEY` in `apps/api/.env` to enable real model execution. Without the key, the thread composer stays visible and explains that runtime execution is disabled.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm typecheck
pnpm build
pnpm lint
pnpm test:coverage
pnpm test:e2e
```

Expected: all commands exit 0. If `pnpm test:e2e` fails because the API server is not part of the existing Playwright webServer setup, update the Playwright config so it starts both `pnpm --filter api dev` and `pnpm --filter web dev:e2e` for E2E runs, then rerun `pnpm test:e2e`.

- [ ] **Step 4: Manual acceptance check with real OpenAI key**

Run:

```bash
cp apps/api/.env.example apps/api/.env
printf '\n# edit apps/api/.env and set OPENAI_API_KEY before continuing\n'
pnpm --filter api db:migrate
pnpm --filter api dev
pnpm --filter web dev
```

In the browser:

1. Open `http://localhost:5173/threads/new`.
2. Enter `Use the workspace summary tool, then summarize what you found.`
3. Submit the prompt.
4. Confirm the app navigates to `/threads/<id>`.
5. Confirm assistant text streams into the transcript.
6. Confirm the run timeline shows `getWorkspaceSummary` tool-call or tool-result steps.
7. Submit another prompt and click Abort while it streams.
8. Reload the page and confirm the partial assistant response remains visible with an aborted marker.

Expected: all eight checks pass.

- [ ] **Step 5: Commit E2E and docs**

Run:

```bash
git add tests/e2e/m02-thread-lifecycle.spec.ts README.md docs/agentis-prd-roadmap.md playwright.config.ts
git commit -m "test(m02): cover thread lifecycle acceptance"
```

If `docs/agentis-prd-roadmap.md` or `playwright.config.ts` did not change, omit it from `git add`.

---

## Task 9: Final review and integration verification

**Files:**
- No planned source edits unless verification finds a defect.

- [ ] **Step 1: Inspect git status**

Run:

```bash
git status --short
```

Expected: no uncommitted implementation files. Existing user-owned files that were dirty before implementation should remain untouched or be explicitly called out.

- [ ] **Step 2: Run final verification**

Run:

```bash
pnpm typecheck && pnpm build && pnpm lint && pnpm test:coverage && pnpm test:e2e
```

Expected: all commands exit 0.

- [ ] **Step 3: Produce acceptance evidence**

Record these outputs in the implementation summary:

```bash
curl -s http://localhost:8787/api/health | jq .
git log --oneline -5
```

Also include:

- The final thread URL used for manual testing.
- Whether `OPENAI_API_KEY` was present during manual acceptance.
- Whether abort preserved partial assistant text after reload.
- Whether the local tool appeared in the run timeline.

- [ ] **Step 4: Final commit if verification fixes were needed**

If any fix was required during Task 9, commit only those files:

```bash
git add <fixed-files>
git commit -m "fix(m02): stabilize thread lifecycle verification"
```

If no fixes were required, do not create an empty commit.

---

## Self-review notes

- Spec coverage: API service, Hono, OpenAI through AI SDK, AI Elements UI, SQLite with Drizzle, direct API execution, server `.env`, abort partial preservation, local demo tool, `/threads/new` plus `/threads/:threadId`, and fixture separation are covered.
- Dependency risk: AI SDK stream part names must be verified from installed docs before runtime implementation. Task 4 includes required verification before editing runtime code.
- Scope: This is one implementation plan for one vertical M02 slice. Chat SDK and Composio remain out of scope.
- Testing: API, web, E2E, and manual acceptance checks are included.
