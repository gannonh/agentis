import type {
  AgentDetailResponse,
  AgentPromotionDraft,
  CreateAgentRequest,
  Message,
  Thread,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { buildAgentDetail } from "./agent-detail-service.js"
import {
  resolveRequestedAgentGrants,
  toolkitGrantRemediation,
} from "./tool-grant-resolution.js"
import type { Repositories } from "../repositories/index.js"
import { toSourceWorkflowSnapshot } from "../lib/source-workflow-snapshot.js"

type ServiceError = {
  status: 400 | 404 | 500
  body: {
    error: string
    code: string
    remediation?: string
  }
}

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError }

function threadNotFound(): ServiceError {
  return {
    status: 404,
    body: { error: "Thread not found", code: "thread_not_found" },
  }
}

function promotionDraftNotFound(): ServiceError {
  return {
    status: 404,
    body: {
      error: "Promotion draft not found",
      code: "promotion_draft_not_found",
    },
  }
}

function threadAlreadyHasAgent(): ServiceError {
  return {
    status: 400,
    body: {
      error:
        "Threads already associated with an agent cannot create another agent.",
      code: "thread_already_has_agent",
    },
  }
}

function agentCreationFailed(): ServiceError {
  return {
    status: 500,
    body: {
      error: "Created agent could not be loaded.",
      code: "agent_creation_failed",
    },
  }
}

function grantResolutionFailed(error: string): ServiceError {
  return {
    status: 400,
    body: {
      error,
      code: error,
      remediation: toolkitGrantRemediation(error),
    },
  }
}

function firstUserText(messages: Message[]): string | null {
  const user = messages.find((message) => message.role === "user")
  const text = user?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim()
  return text || null
}

function cleanTitle(title: string): string | null {
  const cleaned = title.trim().replace(/\s+/g, " ")
  return cleaned || null
}

function buildDescription(title: string | null): string {
  if (!title) return "Created from a thread."
  return `Created from thread: ${title}`
}

function buildSystemPrompt(sourceText: string | null): string {
  if (!sourceText) return "Use the context from this thread."
  return `Use the context from this thread: ${sourceText}`
}

function buildSourceWorkflow(sourceThreadTitle: string, messages: Message[]) {
  const title = cleanTitle(sourceThreadTitle)
  const sourceText = firstUserText(messages)

  return {
    summary: title ?? sourceText ?? "Created from thread.",
    firstUserPrompt: sourceText ?? undefined,
  }
}

function buildDraftDefaults(thread: Thread, messages: Message[]) {
  const title = cleanTitle(thread.title)
  const sourceText = firstUserText(messages)

  return {
    name: title ? `${title} Agent` : "New Agent",
    description: buildDescription(title),
    systemPrompt: buildSystemPrompt(sourceText),
  }
}

export class AgentPromotionService {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {}

  createDraftFromThread(
    threadId: string
  ): ServiceResult<{ draft: AgentPromotionDraft; created: boolean }> {
    const thread = this.repos.threads.getById(threadId)
    if (!thread) return { ok: false, error: threadNotFound() }
    if (thread.agentId) return { ok: false, error: threadAlreadyHasAgent() }

    const existing = this.repos.agentPromotionDrafts.getLatestByThreadId(
      thread.id
    )
    if (existing) return { ok: true, data: { draft: existing, created: false } }

    const messages = this.repos.messages.listByThreadId(thread.id)
    const defaults = buildDraftDefaults(thread, messages)
    const draft = this.repos.agentPromotionDrafts.create({
      threadId: thread.id,
      sourceThreadTitle: thread.title,
      name: defaults.name,
      description: defaults.description,
      systemPrompt: defaults.systemPrompt,
      model: thread.model,
      sourceWorkflow: buildSourceWorkflow(thread.title, messages),
      toolGrants: this.repos.toolAccessGrants
        .listByScope("thread", thread.id)
        .map(({ toolkitSlug, connectionId }) => ({
          toolkitSlug,
          connectionId,
        })),
    })
    return { ok: true, data: { draft, created: true } }
  }

  createAgentFromDraft(
    draftId: string,
    input: CreateAgentRequest
  ): ServiceResult<AgentDetailResponse> {
    const draft = this.repos.agentPromotionDrafts.getById(draftId)
    if (!draft) return { ok: false, error: promotionDraftNotFound() }

    const requestedGrants = input.toolGrants ?? draft.toolGrants
    const resolvedGrants = resolveRequestedAgentGrants(
      this.repos,
      requestedGrants
    )
    if ("error" in resolvedGrants) {
      return { ok: false, error: grantResolutionFailed(resolvedGrants.error) }
    }

    const sourceWorkflow =
      draft.sourceWorkflow ??
      buildSourceWorkflow(
        draft.sourceThreadTitle,
        this.repos.messages.listByThreadId(draft.threadId)
      )
    const sourceSnapshot = toSourceWorkflowSnapshot({
      sourceThread: {
        id: draft.threadId,
        title: draft.sourceThreadTitle,
      },
      sourceWorkflow,
    })
    const created = this.repos.agents.createWithGrants(
      {
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        model: input.model ?? draft.model ?? this.config.defaultModel,
        ...sourceSnapshot,
      },
      resolvedGrants.grants
    )
    const detail = buildAgentDetail(this.repos, created.id)
    if (!detail) return { ok: false, error: agentCreationFailed() }

    return { ok: true, data: detail }
  }
}
