import { desc, eq, like, or } from "drizzle-orm"
import type {
  Message,
  Run,
  Thread,
  ThreadMode,
  ThreadStatus,
} from "@workspace/shared"
import type { AppDatabase } from "../db/client.js"
import {
  agents,
  messages,
  runs,
  runSteps,
  threads,
  toolAccessGrants,
  workspaces,
} from "../db/schema.js"
import { createId, nowIso } from "../lib/ids.js"
import { mapMessage, mapRun, mapThread } from "../lib/mappers.js"
import {
  sourceWorkflowColumns,
  type SourceWorkflowSnapshot,
} from "../lib/source-workflow-snapshot.js"
import {
  GENERIC_AGENTIS_AGENT_ID,
  GENERIC_AGENTIS_AGENT_NAME,
} from "../workspaces/constants.js"
import { WorkspaceRepository } from "./workspace-repository.js"

type ToolGrantSnapshot = {
  toolkitSlug: string
  connectionId: string
}

type ThreadCreateInput = {
  title: string
  model: string
  mode: ThreadMode
  projectId?: string
  agentId?: string
  workspaceId?: string
  agentNameSnapshot?: string
} & SourceWorkflowSnapshot

type InitialRunInput = ThreadCreateInput & {
  prompt: string
  agentConfigurationVersionId?: string
  toolGrants?: ToolGrantSnapshot[]
}

type InitialRunResult = {
  thread: Thread
  message: Message
  run: Run
}

type FollowUpRunResult = {
  message: Message
  run: Run
}

type MessageRow = typeof messages.$inferSelect
type RunRow = typeof runs.$inferSelect
type StepRow = typeof runSteps.$inferSelect

function createUserMessageRow(input: {
  threadId: string
  prompt: string
  createdAt: string
}): MessageRow {
  return {
    id: createId("msg"),
    threadId: input.threadId,
    role: "user",
    partsJson: JSON.stringify([{ type: "text", text: input.prompt }]),
    status: "completed",
    createdAt: input.createdAt,
  }
}

function createQueuedRunRow(input: {
  threadId: string
  model: string
  startedAt: string
  agentId?: string | null
  agentConfigurationVersionId?: string | null
}): RunRow {
  return {
    id: createId("run"),
    threadId: input.threadId,
    status: "queued",
    model: input.model,
    agentId: input.agentId ?? null,
    agentConfigurationVersionId: input.agentConfigurationVersionId ?? null,
    startedAt: input.startedAt,
    finishedAt: null,
    errorSummary: null,
    usageJson: null,
    cost: null,
    costBreakdownJson: null,
    evaluationJson: null,
  }
}

function resolveAgentNameSnapshot(
  agentId: string,
  agentNameSnapshot: string | undefined
): string | null {
  if (agentNameSnapshot) return agentNameSnapshot
  if (agentId === GENERIC_AGENTIS_AGENT_ID) return GENERIC_AGENTIS_AGENT_NAME
  return null
}

function createQueuedStepRow(runId: string, createdAt: string): StepRow {
  return {
    id: createId("step"),
    runId,
    type: "queued",
    status: "pending",
    title: "Queued",
    payloadJson: null,
    createdAt,
    updatedAt: createdAt,
  }
}

export class ThreadRepository {
  constructor(private readonly db: AppDatabase) {}

  create(input: ThreadCreateInput): Thread {
    const now = nowIso()
    const agentId = input.agentId ?? GENERIC_AGENTIS_AGENT_ID
    const row = {
      id: createId("thread"),
      title: input.title,
      status: "active" as ThreadStatus,
      model: input.model,
      mode: input.mode,
      projectId: input.projectId ?? null,
      agentId,
      workspaceId: input.workspaceId ?? this.resolveDefaultWorkspaceId(agentId),
      agentNameSnapshot: resolveAgentNameSnapshot(agentId, input.agentNameSnapshot),
      agentConfigurationVersionId: null,
      ...sourceWorkflowColumns(input),
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(threads).values(row).run()
    return mapThread(row)
  }

  createWithInitialRun(input: InitialRunInput): InitialRunResult {
    const now = nowIso()
    const agentId = input.agentId ?? GENERIC_AGENTIS_AGENT_ID
    const threadRow = {
      id: createId("thread"),
      title: input.title,
      status: "active" as ThreadStatus,
      model: input.model,
      mode: input.mode,
      projectId: input.projectId ?? null,
      agentId,
      workspaceId: input.workspaceId ?? this.resolveDefaultWorkspaceId(agentId),
      agentNameSnapshot: resolveAgentNameSnapshot(agentId, input.agentNameSnapshot),
      agentConfigurationVersionId: input.agentConfigurationVersionId ?? null,
      ...sourceWorkflowColumns(input),
      createdAt: now,
      updatedAt: now,
    }
    const messageRow = createUserMessageRow({
      threadId: threadRow.id,
      prompt: input.prompt,
      createdAt: now,
    })
    const runRow = createQueuedRunRow({
      threadId: threadRow.id,
      model: input.model,
      agentId,
      agentConfigurationVersionId: input.agentConfigurationVersionId,
      startedAt: now,
    })
    const stepRow = createQueuedStepRow(runRow.id, now)
    const grantRows = (input.toolGrants ?? []).map((grant) => ({
      id: createId("grant"),
      scopeType: "thread",
      scopeId: threadRow.id,
      toolkitSlug: grant.toolkitSlug,
      connectionId: grant.connectionId,
      createdAt: now,
    }))

    return this.db.transaction((tx) => {
      tx.insert(threads).values(threadRow).run()
      for (const grantRow of grantRows) {
        tx.insert(toolAccessGrants).values(grantRow).run()
      }
      tx.insert(messages).values(messageRow).run()
      tx.insert(runs).values(runRow).run()
      tx.insert(runSteps).values(stepRow).run()

      return {
        thread: mapThread(threadRow),
        message: mapMessage(messageRow),
        run: mapRun(runRow),
      }
    })
  }

  createFollowUpRun(input: {
    threadId: string
    prompt: string
    title: string
    mode?: ThreadMode
    model?: string
  }): FollowUpRunResult | null {
    const threadRow = this.db
      .select()
      .from(threads)
      .where(eq(threads.id, input.threadId))
      .get()
    if (!threadRow) return null

    const model = input.model ?? threadRow.model
    const now = nowIso()
    const messageRow = createUserMessageRow({
      threadId: threadRow.id,
      prompt: input.prompt,
      createdAt: now,
    })
    const runRow = createQueuedRunRow({
      threadId: threadRow.id,
      model,
      agentId: threadRow.agentId,
      agentConfigurationVersionId: threadRow.agentConfigurationVersionId,
      startedAt: now,
    })
    const stepRow = createQueuedStepRow(runRow.id, now)

    return this.db.transaction((tx) => {
      tx.insert(messages).values(messageRow).run()
      tx.insert(runs).values(runRow).run()
      tx.insert(runSteps).values(stepRow).run()
      tx.update(threads)
        .set({
          title: input.title,
          mode: input.mode ?? threadRow.mode,
          model,
          updatedAt: now,
        })
        .where(eq(threads.id, threadRow.id))
        .run()

      return {
        message: mapMessage(messageRow),
        run: mapRun(runRow),
      }
    })
  }

  private resolveDefaultWorkspaceId(agentId: string): string {
    const workspace = this.db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.agentId, agentId))
      .get()
    if (workspace) return workspace.id

    if (agentId === GENERIC_AGENTIS_AGENT_ID) {
      return new WorkspaceRepository(this.db).ensureGenericAgentisWorkspace().id
    }

    const agent = this.db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.id, agentId))
      .get()
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`)
    }

    return new WorkspaceRepository(this.db).createDefaultForAgent({
      agentId: agent.id,
      agentName: agent.name,
    }).id
  }

  getById(id: string): Thread | null {
    const row = this.db.select().from(threads).where(eq(threads.id, id)).get()
    return row ? mapThread(row) : null
  }

  list(): Thread[] {
    return this.db
      .select()
      .from(threads)
      .orderBy(desc(threads.updatedAt))
      .all()
      .map(mapThread)
  }

  search(query: string, limit: number): Thread[] {
    const pattern = `%${query.trim()}%`
    return this.db
      .select()
      .from(threads)
      .where(
        or(
          like(threads.title, pattern),
          like(threads.agentNameSnapshot, pattern)
        )!
      )
      .orderBy(desc(threads.updatedAt))
      .limit(limit)
      .all()
      .map(mapThread)
  }

  listByAgentId(agentId: string, options: { limit?: number } = {}): Thread[] {
    const query = this.db
      .select()
      .from(threads)
      .where(eq(threads.agentId, agentId))
      .orderBy(desc(threads.updatedAt), desc(threads.createdAt))

    const rows =
      options.limit === undefined
        ? query.all()
        : query.limit(options.limit).all()

    return rows.map(mapThread)
  }

  touch(
    id: string,
    patch?: {
      title?: string
      status?: ThreadStatus
      projectId?: string | null
    }
  ) {
    const existing = this.getById(id)
    if (!existing) return null
    const updatedAt = nowIso()
    this.db
      .update(threads)
      .set({
        title: patch?.title ?? existing.title,
        status: patch?.status ?? existing.status,
        projectId:
          patch?.projectId !== undefined ? patch.projectId : existing.projectId,
        updatedAt,
      })
      .where(eq(threads.id, id))
      .run()
    return this.getById(id)
  }
}
