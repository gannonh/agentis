import type {
  AgentDetailResponse,
  AgentPromotionDraft,
  CreateAgentFromPromotionDraftRequest,
  Message,
  Thread,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { buildAgentDetail } from "./agent-detail-service.js"
import {
  buildDraftIntelligence,
  firstUserText,
} from "./agent-promotion-intelligence.js"
import {
  resolveRequestedAgentGrants,
  toolkitGrantRemediation,
} from "./tool-grant-resolution.js"
import type { Repositories } from "../repositories/index.js"

type ServiceError = {
  status: 400 | 404 | 500
  body: {
    error: string
    code: string
    remediation?: string
  }
}

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError }

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
      error: "Threads already associated with an agent cannot create another agent.",
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

function conflictingToolGrants(): ServiceError {
  return {
    status: 400,
    body: {
      error:
        "toolGrants and draftUpdates.toolGrants must match when both are provided.",
      code: "conflicting_tool_grants",
    },
  }
}

function grantKey(grant: { toolkitSlug: string; connectionId?: string | null }) {
  return `${grant.toolkitSlug}:${grant.connectionId ?? ""}`
}

function normalizeGrantInputs(
  grants: CreateAgentFromPromotionDraftRequest["toolGrants"] = []
) {
  return grants
    .map((grant) => ({
      toolkitSlug: grant.toolkitSlug,
      connectionId: grant.connectionId ?? null,
    }))
    .sort((a, b) => grantKey(a).localeCompare(grantKey(b)))
}

function grantInputsMatch(
  left: CreateAgentFromPromotionDraftRequest["toolGrants"],
  right: CreateAgentFromPromotionDraftRequest["toolGrants"]
): boolean {
  return (
    JSON.stringify(normalizeGrantInputs(left)) ===
    JSON.stringify(normalizeGrantInputs(right))
  )
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

    const existing = this.repos.agentPromotionDrafts.getLatestByThreadId(thread.id)
    if (existing) return { ok: true, data: { draft: existing, created: false } }

    const messages = this.repos.messages.listByThreadId(thread.id)
    const defaults = buildDraftDefaults(thread, messages)
    const toolGrants = this.repos.toolAccessGrants
      .listByScope("thread", thread.id)
      .map(({ toolkitSlug, connectionId }) => ({ toolkitSlug, connectionId }))
    const draft = this.repos.agentPromotionDrafts.create({
      threadId: thread.id,
      sourceThreadTitle: thread.title,
      name: defaults.name,
      description: defaults.description,
      systemPrompt: defaults.systemPrompt,
      model: thread.model,
      toolGrants,
      intelligence: buildDraftIntelligence(thread, messages, toolGrants),
    })
    return { ok: true, data: { draft, created: true } }
  }

  createAgentFromDraft(
    draftId: string,
    input: CreateAgentFromPromotionDraftRequest
  ): ServiceResult<AgentDetailResponse> {
    const draft = this.repos.agentPromotionDrafts.getById(draftId)
    if (!draft) return { ok: false, error: promotionDraftNotFound() }

    if (
      input.toolGrants &&
      input.draftUpdates?.toolGrants &&
      !grantInputsMatch(input.toolGrants, input.draftUpdates.toolGrants)
    ) {
      return { ok: false, error: conflictingToolGrants() }
    }

    const requestedGrants =
      input.toolGrants ?? input.draftUpdates?.toolGrants ?? draft.toolGrants
    const resolvedGrants = resolveRequestedAgentGrants(
      this.repos,
      requestedGrants
    )
    if ("error" in resolvedGrants) {
      return { ok: false, error: grantResolutionFailed(resolvedGrants.error) }
    }

    const created = this.repos.agents.createWithGrants(
      {
        name: input.name,
        description: input.description,
        systemPrompt: input.systemPrompt,
        model:
          input.model ??
          input.draftUpdates?.model ??
          draft.model ??
          this.config.defaultModel,
      },
      resolvedGrants.grants
    )
    const detail = buildAgentDetail(this.repos, created.id)
    if (!detail) return { ok: false, error: agentCreationFailed() }

    if (input.draftUpdates) {
      const updatedDraft = this.repos.agentPromotionDrafts.update(
        draft.id,
        input.draftUpdates
      )
      if (!updatedDraft) return { ok: false, error: promotionDraftNotFound() }
    }

    return { ok: true, data: detail }
  }
}
