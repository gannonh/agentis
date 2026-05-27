import {
  hasBlockingProposedToolGrants,
  proposedToolGrantsToInputs,
  type AgentDetailResponse,
  type AgentPromotionDraft,
  type AgentToolGrantInput,
  type CreateAgentFromPromotionDraftRequest,
  type IntegrationConnection,
  type Message,
  type ProposedToolGrant,
  type Thread,
  type UpdateAgentPromotionDraftRequest,
} from "@workspace/shared"
import type { AppConfig } from "../config.js"
import { buildAgentDetail } from "./agent-detail-service.js"
import {
  buildDraftIntelligence,
  firstUserText,
} from "./agent-promotion-intelligence.js"
import { analyzeThreadToolUsage } from "./agent-promotion-tool-analysis.js"
import {
  resolveRequestedAgentGrants,
  toolkitGrantRemediation,
} from "./tool-grant-resolution.js"
import { SUPPORTED_TOOLKIT_NAMES } from "../composio/tool-catalog.js"
import { toSourceWorkflowSnapshot } from "../lib/source-workflow-snapshot.js"
import type { StoredAgentPromotionDraft } from "../repositories/agent-promotion-draft-repository.js"
import type { Repositories } from "../repositories/index.js"

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

function proposedGrantValidationFailed(grant: ProposedToolGrant): ServiceError {
  const toolkitName =
    SUPPORTED_TOOLKIT_NAMES[grant.toolkitSlug] ?? grant.toolkitSlug
  return {
    status: 400,
    body: {
      error: `${grant.toolkitSlug} access is required before creating this agent.`,
      code: grant.remediation?.code ?? "toolkit_not_connected",
      remediation:
        grant.remediation?.message ??
        `Connect ${toolkitName} before creating this agent.`,
    },
  }
}

function validationAnalysisPending(): ServiceError {
  return {
    status: 400,
    body: {
      error: "Draft validation analysis is pending.",
      code: "validation_analysis_pending",
      remediation: "Recreate the promotion draft to analyze source tool usage.",
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

function grantKey(grant: {
  toolkitSlug: string
  connectionId?: string | null
}) {
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

function firstInvalidRequiredGrant(
  draft: AgentPromotionDraft
): ProposedToolGrant | undefined {
  return draft.proposedToolGrants.find((grant) =>
    hasBlockingProposedToolGrants([grant])
  )
}

function mergeRequiredGrants(
  requestedGrants: AgentToolGrantInput[],
  requiredGrants: AgentToolGrantInput[]
): AgentToolGrantInput[] {
  const requestedToolkitSlugs = new Set(
    requestedGrants.map((grant) => grant.toolkitSlug)
  )
  return [
    ...requestedGrants,
    ...requiredGrants.filter(
      (grant) => !requestedToolkitSlugs.has(grant.toolkitSlug)
    ),
  ]
}

function defaultRequestedGrants(
  draft: AgentPromotionDraft
): AgentToolGrantInput[] {
  return mergeRequiredGrants(
    draft.toolGrants,
    proposedToolGrantsToInputs(draft.proposedToolGrants)
  )
}

function hasPendingValidationAnalysis(
  draft: StoredAgentPromotionDraft
): boolean {
  return (
    draft.proposedToolGrants === null || draft.unsupportedSourceSteps === null
  )
}

function connectedByToolkit(
  connections: IntegrationConnection[]
): Map<string, IntegrationConnection> {
  return new Map(
    connections.map((connection) => [connection.toolkitSlug, connection])
  )
}

function validateProposedToolGrant(
  grant: NonNullable<StoredAgentPromotionDraft["proposedToolGrants"]>[number],
  connections: Map<string, IntegrationConnection>
): ProposedToolGrant {
  const connection = connections.get(grant.toolkitSlug)
  if (connection) {
    return {
      ...grant,
      validationStatus: "valid",
      connectionId: connection.id,
    }
  }

  const toolkitName =
    SUPPORTED_TOOLKIT_NAMES[grant.toolkitSlug] ?? grant.toolkitSlug
  return {
    ...grant,
    validationStatus: "missing_access",
    remediation: {
      code: "toolkit_not_connected",
      message: `Connect ${toolkitName} before creating this agent.`,
    },
  }
}

export class AgentPromotionService {
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {}

  private enrichDraft(draft: StoredAgentPromotionDraft): AgentPromotionDraft {
    const connections = connectedByToolkit(
      this.repos.integrationConnections.listConnectedByUserId()
    )
    const proposedToolGrants = (draft.proposedToolGrants ?? []).map((grant) =>
      validateProposedToolGrant(grant, connections)
    )

    return {
      ...draft,
      toolGrants: mergeRequiredGrants(
        draft.toolGrants,
        proposedToolGrantsToInputs(proposedToolGrants)
      ),
      proposedToolGrants,
      unsupportedSourceSteps: draft.unsupportedSourceSteps ?? [],
    }
  }

  getDraft(draftId: string): AgentPromotionDraft | null {
    const draft = this.repos.agentPromotionDrafts.getById(draftId)
    return draft ? this.enrichDraft(draft) : null
  }

  updateDraft(
    draftId: string,
    input: UpdateAgentPromotionDraftRequest
  ): AgentPromotionDraft | null {
    const draft = this.repos.agentPromotionDrafts.update(draftId, input)
    return draft ? this.enrichDraft(draft) : null
  }

  createDraftFromThread(
    threadId: string
  ): ServiceResult<{ draft: AgentPromotionDraft; created: boolean }> {
    const thread = this.repos.threads.getById(threadId)
    if (!thread) return { ok: false, error: threadNotFound() }
    if (thread.agentId) return { ok: false, error: threadAlreadyHasAgent() }

    const existing = this.repos.agentPromotionDrafts.getLatestByThreadId(
      thread.id
    )
    if (existing) {
      return {
        ok: true,
        data: { draft: this.enrichDraft(existing), created: false },
      }
    }

    const messages = this.repos.messages.listByThreadId(thread.id)
    const defaults = buildDraftDefaults(thread, messages)
    const toolGrants = this.repos.toolAccessGrants
      .listByScope("thread", thread.id)
      .map(({ toolkitSlug, connectionId }) => ({ toolkitSlug, connectionId }))
    const runs = this.repos.runs.listByThreadId(thread.id)
    const toolAnalysis = analyzeThreadToolUsage({
      steps: this.repos.steps.listByRunIds(runs.map((run) => run.id)),
    })
    const draft = this.repos.agentPromotionDrafts.create({
      threadId: thread.id,
      sourceThreadTitle: thread.title,
      name: defaults.name,
      description: defaults.description,
      systemPrompt: defaults.systemPrompt,
      model: thread.model,
      sourceWorkflow: buildSourceWorkflow(thread.title, messages),
      toolGrants,
      intelligence: buildDraftIntelligence(thread, messages, toolGrants),
      proposedToolGrants: toolAnalysis.proposedToolGrants,
      unsupportedSourceSteps: toolAnalysis.unsupportedSourceSteps,
    })
    return { ok: true, data: { draft: this.enrichDraft(draft), created: true } }
  }

  createAgentFromDraft(
    draftId: string,
    input: CreateAgentFromPromotionDraftRequest
  ): ServiceResult<AgentDetailResponse> {
    const storedDraft = this.repos.agentPromotionDrafts.getById(draftId)
    if (!storedDraft) return { ok: false, error: promotionDraftNotFound() }
    if (hasPendingValidationAnalysis(storedDraft)) {
      return { ok: false, error: validationAnalysisPending() }
    }

    const draft = this.enrichDraft(storedDraft)
    const invalidRequiredGrant = firstInvalidRequiredGrant(draft)
    if (invalidRequiredGrant) {
      return {
        ok: false,
        error: proposedGrantValidationFailed(invalidRequiredGrant),
      }
    }

    if (
      input.toolGrants &&
      input.draftUpdates?.toolGrants &&
      !grantInputsMatch(input.toolGrants, input.draftUpdates.toolGrants)
    ) {
      return { ok: false, error: conflictingToolGrants() }
    }

    const requestedGrants = input.toolGrants
      ? mergeRequiredGrants(
          input.toolGrants,
          proposedToolGrantsToInputs(draft.proposedToolGrants)
        )
      : input.draftUpdates?.toolGrants
        ? mergeRequiredGrants(
            input.draftUpdates.toolGrants,
            proposedToolGrantsToInputs(draft.proposedToolGrants)
          )
        : defaultRequestedGrants(draft)
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
        model:
          input.model ??
          input.draftUpdates?.model ??
          draft.model ??
          this.config.defaultModel,
        ...sourceSnapshot,
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
