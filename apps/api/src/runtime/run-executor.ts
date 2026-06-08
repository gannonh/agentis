import { stepCountIs, streamText, type LanguageModel, type ToolSet } from "ai"
import {
  GENERIC_AGENTIS_AGENT_ID,
  type MessagePart,
  type Run,
} from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import { ComposioRemediationError } from "../composio/tool-execution-service.js"
import { CURATED_COMPOSIO_TOOLS } from "../composio/tool-catalog.js"
import type { Repositories } from "../repositories/index.js"
import {
  formatMissingEnvVarsMessage,
  getRuntimeMissingEnvVars,
  isRunTimelineDebugEnabled,
  type AppConfig,
} from "../config.js"
import { DocumentService } from "../documents/document-service.js"
import { buildDocumentTools } from "../documents/document-tool.js"
import { StaticArtifactService } from "../static-artifacts/static-artifact-service.js"
import { buildStaticArtifactTools } from "../static-artifacts/static-artifact-tool.js"
import { AppService } from "../artifact-apps/app-service.js"
import { buildAppTools } from "../artifact-apps/app-tool.js"
import { buildWorkspaceNativeTools } from "../native-tools/index.js"
import { formatNativeToolRunStepPayload } from "../native-tools/native-tool-payload.js"
import { resolveNativeToolsForRun } from "../native-tools/native-tool-permissions.js"
import {
  looksLikeResearchBriefIntent,
  resolveNativeRuntimeCapabilities,
} from "../native-tools/native-tool-capability-catalog.js"
import { finalizeResearchBriefIfNeeded } from "./research-brief-finalizer.js"
import { buildWebSearchTools } from "../native-tools/web-search-tools.js"
import { WebSearchError } from "../research/web-search-provider.js"
import { WebSearchService } from "../research/web-search-service.js"
import { WorkspaceEditService } from "../workspaces/workspace-edit-service.js"
import { WorkspaceExecutionService } from "../workspaces/workspace-execution-service.js"
import { isPendingApprovalOutput } from "../workspaces/workspace-mutation-output.js"
import { WorkspaceToolApprovalCoordinator } from "../workspaces/workspace-tool-approval.js"
import { ProjectContextService } from "../projects/project-context-service.js"
import {
  abortRun as signalAbort,
  clearAbortController,
  getAbortSignal,
  registerAbortController,
} from "./abort-registry.js"
import {
  WorkspaceError,
  type WorkspaceHandle,
  WorkspaceService,
} from "../workspaces/workspace-service.js"
import { getWorkspaceSummaryTool } from "./get-workspace-summary.js"
import {
  buildAgentMemoriesContribution,
  buildProjectContextContribution,
  buildSourceWorkflowContribution,
  type RunPromptSection,
} from "./run-context.js"
import { nowIso } from "../lib/ids.js"
import {
  createDefaultMockLanguageModel,
  executeMockComposioStream,
  executeMockNativeStaticArtifactStream,
  executeMockResearchBriefStream,
  executeMockNativeWebSearchStream,
  executeMockNativeWorkspaceExecutionStream,
  executeMockNativeWorkspaceMutationStream,
  executeMockNativeWorkspaceStream,
} from "./run-executor-mocks.js"
import {
  formatToolResultFallback,
  getTextFromParts,
  hasPendingApprovalInParts,
  setTextPart,
  stripRedundantToolJsonText,
  suppressTextForPendingApproval,
  toModelMessages,
  toUiMessages,
} from "./run-message-adapters.js"
import { createGatewayLanguageModel } from "./gateway-model.js"
import { createMockDocumentRunSuffix } from "./mock-document-run.js"
import {
  composioToolNameToToolkit,
  formatToolStepTitle,
} from "./run-tool-labels.js"

export { formatToolStepTitle } from "./run-tool-labels.js"
export { suppressTextForPendingApproval } from "./run-message-adapters.js"

const PLATFORM_SYSTEM_PROMPT =
  "You are Agentis, a helpful workspace assistant. Be concise. Use getWorkspaceSummary when the user asks about workspace status, agents, or integrations. After calling a Composio tool, summarize the results for the user in plain language."

function formatSystemPromptSection(title: string, body?: string | null) {
  const trimmed = body?.trim()
  return trimmed ? `## ${title}\n${trimmed}` : null
}

export function buildRunSystemPrompt(input: {
  agentPrompt?: string | null
  contextSections?: RunPromptSection[]
}): string {
  const hasContext = input.contextSections?.some((section) =>
    section.body?.trim()
  )
  if (!input.agentPrompt?.trim() && !hasContext) {
    return PLATFORM_SYSTEM_PROMPT
  }

  const sections = [
    { title: "Agent instructions", body: input.agentPrompt },
    { title: "Platform requirements", body: PLATFORM_SYSTEM_PROMPT },
    ...(input.contextSections ?? []),
  ]

  return sections
    .map((section) => formatSystemPromptSection(section.title, section.body))
    .filter((section): section is string => Boolean(section))
    .join("\n\n")
}

function toolStepStatus(input: {
  error?: string
  pendingApproval: boolean
}): "failed" | "pending" | "completed" {
  if (input.error) return "failed"
  if (input.pendingApproval) return "pending"
  return "completed"
}

function toolErrorCode(error: unknown): string | undefined {
  if (error instanceof WorkspaceError) return error.code
  if (error instanceof WebSearchError) return error.code
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function zodTypeName(schema: unknown): string | undefined {
  if (!isRecord(schema)) return undefined
  const def = isRecord(schema._def) ? schema._def : null
  return typeof def?.typeName === "string" ? def.typeName : undefined
}

function sanitizeJsonValue(value: unknown, depth = 0): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value
  }
  if (depth > 8 || typeof value === "function" || typeof value === "symbol") {
    return undefined
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item, depth + 1))
  }
  if (!isRecord(value)) return undefined

  return Object.fromEntries(
    Object.entries(value)
      .map(
        ([key, entry]) => [key, sanitizeJsonValue(entry, depth + 1)] as const
      )
      .filter(([, entry]) => entry !== undefined)
  )
}

function serializeSchemaForDebug(schema: unknown, depth = 0): unknown {
  if (!isRecord(schema) || depth > 8) return sanitizeJsonValue(schema, depth)
  const def = isRecord(schema._def) ? schema._def : null
  if (!def || typeof def.typeName !== "string") return undefined

  const base: Record<string, unknown> = { typeName: def.typeName }
  if (typeof schema.description === "string") {
    base.description = schema.description
  }
  if (Array.isArray(def.checks)) {
    base.checks = def.checks
  }
  if (Array.isArray(def.values)) {
    base.values = def.values
  }

  if (def.typeName === "ZodObject") {
    const shape = typeof def.shape === "function" ? def.shape() : def.shape
    if (isRecord(shape)) {
      base.fields = Object.entries(shape).map(([name, fieldSchema]) => {
        const serialized = serializeSchemaForDebug(fieldSchema, depth + 1)
        return {
          name,
          ...(isRecord(serialized)
            ? serialized
            : { typeName: zodTypeName(fieldSchema) ?? "unknown" }),
        }
      })
    }
  }

  const innerType = def.innerType ?? def.schema ?? def.type
  if (innerType) {
    base.innerType = serializeSchemaForDebug(innerType, depth + 1)
  }

  return base
}

function formatToolDebugDetails(tools: ToolSet) {
  return Object.entries(tools).map(([name, definition]) => {
    const record = definition as Record<string, unknown>
    return {
      name,
      description:
        typeof record.description === "string" ? record.description : undefined,
      inputSchema: serializeSchemaForDebug(record.inputSchema),
      hasExecute: typeof record.execute === "function",
    }
  })
}

export class RunExecutor {
  private readonly contextService: ProjectContextService
  private readonly workspaceEditService: WorkspaceEditService
  private readonly workspaceExecutionService: WorkspaceExecutionService
  private readonly workspaceApproval: WorkspaceToolApprovalCoordinator
  private readonly webSearchService: WebSearchService
  private readonly staticArtifactService: StaticArtifactService
  private readonly appService: AppService

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly services: ComposioServices,
    private readonly documentService: DocumentService
  ) {
    this.webSearchService = new WebSearchService(config)
    this.staticArtifactService = new StaticArtifactService(repos, config)
    this.appService = new AppService(repos, config)
    this.contextService = new ProjectContextService(repos, config)
    this.workspaceEditService = new WorkspaceEditService(repos.workspaceEdits)
    this.workspaceExecutionService = new WorkspaceExecutionService(
      repos.workspaceExecutions,
      config
    )
    this.workspaceApproval = new WorkspaceToolApprovalCoordinator(
      repos,
      config,
      this.workspaceEditService,
      this.workspaceExecutionService
    )
  }

  private mockDeps() {
    return {
      repos: this.repos,
      config: this.config,
      services: this.services,
      editService: this.workspaceEditService,
      executionService: this.workspaceExecutionService,
      webSearchService: this.webSearchService,
      staticArtifactService: this.staticArtifactService,
      appService: this.appService,
      documentService: this.documentService,
    }
  }

  private createTimelineDebugStep(
    runId: string,
    input: {
      status: "completed" | "failed"
      title: string
      payload: Record<string, unknown>
    }
  ) {
    if (!isRunTimelineDebugEnabled(this.config)) return
    this.repos.steps.create({
      runId,
      type: "reasoning",
      status: input.status,
      title: input.title,
      payload: input.payload,
    })
  }

  async executeStream(runId: string) {
    const run = this.repos.runs.getById(runId)
    if (!run) {
      throw new Error("Run not found")
    }
    const missingRuntimeEnv = getRuntimeMissingEnvVars(this.config)
    if (missingRuntimeEnv.length > 0) {
      throw new Error(formatMissingEnvVarsMessage(missingRuntimeEnv))
    }
    if (run.status !== "queued") {
      throw new Error(`Run is not streamable: ${run.status}`)
    }
    if (getAbortSignal(runId)) {
      throw new Error("Stream already in progress")
    }

    const thread = this.repos.threads.getById(run.threadId)
    if (!thread) {
      throw new Error("Thread not found")
    }

    const threadMessages = this.repos.messages.listByThreadId(run.threadId)
    const latestUserPrompt =
      [...threadMessages]
        .reverse()
        .find((message) => message.role === "user")
        ?.parts.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("") ?? ""

    let workspaceHandle: WorkspaceHandle
    try {
      workspaceHandle = await new WorkspaceService(
        this.repos,
        this.config
      ).resolveForThread(run.threadId)
    } catch (error) {
      return this.failWithWorkspaceError(runId, run.threadId, error)
    }

    const remediation = this.services.toolExecution.checkPreflightRemediation(
      latestUserPrompt,
      run.threadId
    )
    if (remediation) {
      return this.failWithRemediation(runId, run.threadId, remediation)
    }

    const agentConfiguration = run.agentConfigurationVersionId
      ? this.repos.agents.getConfigurationVersionById(
          run.agentConfigurationVersionId
        )
      : run.agentId && run.agentId !== GENERIC_AGENTIS_AGENT_ID
        ? this.repos.agents.getCurrentConfigurationSnapshot(run.agentId)
        : null
    if (run.agentConfigurationVersionId && !agentConfiguration) {
      const message =
        "Agent configuration version not found: " +
        run.agentConfigurationVersionId
      this.repos.runs.updateStatus(runId, "failed", {
        finishedAt: nowIso(),
        errorSummary: message,
      })
      this.repos.steps.create({
        runId,
        type: "error",
        status: "failed",
        title: "Run failed",
        payload: { message },
      })
      this.repos.threads.touch(run.threadId, { status: "failed" })
      throw new Error(message)
    }
    const permittedNativeToolIds = resolveNativeToolsForRun({
      agentId: run.agentId,
      agentConfiguration,
    })
    const nativeRuntimeCapabilities = resolveNativeRuntimeCapabilities({
      permittedNativeToolIds,
      providerAvailability: { webSearch: this.webSearchService.isAvailable() },
      latestUserPrompt,
      buildTools: {
        webSearch: () => buildWebSearchTools(this.webSearchService),
        documents: () =>
          buildDocumentTools(this.documentService, {
            runId,
            threadId: run.threadId,
            projectId: thread.projectId ?? undefined,
            onEvidence: (title, payload) => {
              this.repos.steps.create({
                runId,
                type: "tool-result",
                status: "completed",
                title,
                payload,
              })
            },
          }),
        staticArtifacts: () =>
          buildStaticArtifactTools(this.staticArtifactService, {
            runId,
            threadId: run.threadId,
            projectId: thread.projectId ?? undefined,
            onEvidence: (title, payload) => {
              this.repos.steps.create({
                runId,
                type: "tool-result",
                status: "completed",
                title,
                payload,
              })
            },
          }),
        apps: () =>
          buildAppTools(this.appService, {
            runId,
            threadId: run.threadId,
            projectId: thread.projectId ?? undefined,
            onEvidence: (title, payload) => {
              this.repos.steps.create({
                runId,
                type: "tool-result",
                status: "completed",
                title,
                payload,
              })
            },
          }),
      },
    })
    if (nativeRuntimeCapabilities.webSearch.unavailableError) {
      return this.failWithWebSearchError(
        runId,
        run.threadId,
        nativeRuntimeCapabilities.webSearch.unavailableError
      )
    }
    if (nativeRuntimeCapabilities.staticArtifacts.permissionDeniedError) {
      return this.failWithStaticArtifactPermissionDenied(
        runId,
        run.threadId,
        nativeRuntimeCapabilities.staticArtifacts.permissionDeniedError
      )
    }
    if (nativeRuntimeCapabilities.apps.permissionDeniedError) {
      return this.failWithAppPermissionDenied(
        runId,
        run.threadId,
        nativeRuntimeCapabilities.apps.permissionDeniedError
      )
    }

    const projectContext = this.contextService.assemble(thread.projectId)
    const projectContextBlock =
      this.contextService.buildSystemPromptBlock(projectContext)
    const agentMemories = run.agentId
      ? this.repos.savedMemories.listPinnedForAgent(run.agentId)
      : null
    const sourceWorkflowContribution = buildSourceWorkflowContribution(thread)
    const projectContextContribution = buildProjectContextContribution({
      projectContext,
      projectContextBlock,
    })
    const memoryContribution = buildAgentMemoriesContribution(agentMemories)
    const contextContributions = [
      sourceWorkflowContribution,
      projectContextContribution,
      memoryContribution,
    ].filter((contribution): contribution is NonNullable<typeof contribution> =>
      Boolean(contribution)
    )
    const systemPrompt = buildRunSystemPrompt({
      agentPrompt: agentConfiguration?.systemPrompt,
      contextSections: [sourceWorkflowContribution, projectContextContribution]
        .map((contribution) => contribution?.promptSection)
        .filter((section): section is RunPromptSection => Boolean(section)),
    })
    const memoryPrompt = memoryContribution?.promptSection
      ? formatSystemPromptSection(
          memoryContribution.promptSection.title,
          memoryContribution.promptSection.body
        )
      : null
    const runtimeSystemPrompt = [
      systemPrompt,
      ...nativeRuntimeCapabilities.systemPromptSections,
      memoryPrompt,
    ]
      .filter((section): section is string => Boolean(section))
      .join("\n\n")

    const workspaceNativeTools = buildWorkspaceNativeTools({
      handle: workspaceHandle,
      editService: this.workspaceEditService,
      executionService: this.workspaceExecutionService,
      threadId: run.threadId,
      runId,
      threadMode: thread.mode,
    })
    const composioTools = this.services.toolExecution.buildRuntimeTools(
      run.threadId
    )
    const runtimeTools = {
      ...workspaceNativeTools,
      ...nativeRuntimeCapabilities.runtimeTools,
      getWorkspaceSummary: getWorkspaceSummaryTool,
      ...composioTools,
    }
    const modelMessages = toModelMessages(threadMessages)
    const liveModel = this.config.mockRuntime
      ? null
      : createGatewayLanguageModel(this.config, run.model)
    this.createTimelineDebugStep(runId, {
      status: "completed",
      title: "Debug: model input",
      payload: {
        provider: "debug",
        kind: "model-input",
        systemPrompt,
        messages: modelMessages,
        memoryPrompt,
        memories: agentMemories,
        tools: Object.keys(runtimeTools),
        toolDetails: formatToolDebugDetails(runtimeTools),
        workspace: {
          id: workspaceHandle.id,
          name: workspaceHandle.rootLabel,
        },
        agentConfigurationVersionId: run.agentConfigurationVersionId,
      },
    })

    if (
      this.config.mockRuntime &&
      /\b(mock sandbox|run echo|run .*command|sandbox command)\b/i.test(
        latestUserPrompt
      )
    ) {
      return executeMockNativeWorkspaceExecutionStream(
        this.mockDeps(),
        runId,
        run,
        thread,
        threadMessages,
        workspaceHandle,
        latestUserPrompt
      )
    }

    if (
      this.config.mockRuntime &&
      nativeRuntimeCapabilities.webSearch.enabled &&
      nativeRuntimeCapabilities.documents.enabled &&
      looksLikeResearchBriefIntent(latestUserPrompt)
    ) {
      return executeMockResearchBriefStream(
        this.mockDeps(),
        runId,
        run,
        threadMessages,
        latestUserPrompt
      )
    }

    if (
      this.config.mockRuntime &&
      nativeRuntimeCapabilities.webSearch.enabled &&
      nativeRuntimeCapabilities.webSearch.requested
    ) {
      return executeMockNativeWebSearchStream(
        this.mockDeps(),
        runId,
        run,
        threadMessages,
        latestUserPrompt
      )
    }

    if (
      this.config.mockRuntime &&
      nativeRuntimeCapabilities.staticArtifacts.enabled &&
      nativeRuntimeCapabilities.staticArtifacts.requested
    ) {
      return executeMockNativeStaticArtifactStream(
        this.mockDeps(),
        runId,
        run,
        threadMessages,
        latestUserPrompt
      )
    }

    if (
      this.config.mockRuntime &&
      /\b(write|create|edit|patch|replace)\b.*\b(file|workspace)\b|\b(file|workspace)\b.*\b(write|create|edit|patch|replace)\b/i.test(
        latestUserPrompt
      )
    ) {
      return executeMockNativeWorkspaceMutationStream(
        this.mockDeps(),
        runId,
        run,
        thread,
        threadMessages,
        workspaceHandle,
        latestUserPrompt
      )
    }

    if (
      this.config.mockRuntime &&
      /\bfiles?\b|workspace file|read .*file|search .*file/i.test(
        latestUserPrompt
      )
    ) {
      return executeMockNativeWorkspaceStream(
        this.mockDeps(),
        runId,
        run,
        threadMessages,
        workspaceHandle,
        latestUserPrompt
      )
    }

    if (
      this.config.mockRuntime &&
      Object.keys(composioTools).length > 0 &&
      /github|repo/i.test(latestUserPrompt)
    ) {
      return executeMockComposioStream(
        this.mockDeps(),
        runId,
        run,
        threadMessages,
        composioTools,
        latestUserPrompt
      )
    }

    const assistantMessage = this.repos.messages.create({
      threadId: run.threadId,
      role: "assistant",
      parts: [{ type: "text", text: "" }],
      status: "streaming",
    })

    this.repos.runs.updateStatus(runId, "running")
    this.repos.steps.create({
      runId,
      type: "running",
      status: "running",
      title: "Running",
    })
    if (agentConfiguration) {
      this.repos.steps.create({
        runId,
        type: "reasoning",
        status: "completed",
        title: "Agent configuration loaded",
        payload: {
          agentId: agentConfiguration.agentId,
          agentConfigurationVersionId: agentConfiguration.id,
          model: agentConfiguration.model,
        },
      })
    }
    for (const contribution of contextContributions) {
      if (!contribution.step) continue
      this.repos.steps.create({
        runId,
        type: "reasoning",
        status: "completed",
        title: contribution.step.title,
        payload: contribution.step.payload,
      })
    }
    this.repos.threads.touch(run.threadId)

    const controller = new AbortController()
    registerAbortController(runId, controller)

    let assistantParts: MessagePart[] = [{ type: "text", text: "" }]
    const toolStepIds = new Map<string, string>()

    const finalizeToolStep = (
      toolCallId: string,
      toolName: string,
      input: {
        toolInput?: unknown
        toolOutput?: unknown
        error?: string
        errorCode?: string
      }
    ) => {
      const toolkitSlug = composioToolNameToToolkit(toolName)
      const curated = toolkitSlug
        ? CURATED_COMPOSIO_TOOLS[toolkitSlug]
        : undefined
      const stepId = toolStepIds.get(toolCallId)
      if (!stepId) return

      const pendingApproval = isPendingApprovalOutput(input.toolOutput)
      const status = toolStepStatus({
        error: input.error,
        pendingApproval,
      })
      this.repos.steps.update(stepId, {
        status,
        title: formatToolStepTitle({
          toolName,
          toolkitSlug,
          curated: Boolean(curated),
        }),
        payload:
          toolkitSlug && curated
            ? this.services.toolExecution.formatRunStepPayload({
                toolkitSlug,
                toolSlug: curated.toolSlug,
                toolInput: input.toolInput,
                toolOutput: input.toolOutput,
                error: input.error,
              })
            : (formatNativeToolRunStepPayload({
                toolCallId,
                toolName,
                workspaceId: workspaceHandle.id,
                input: input.toolInput,
                output: input.toolOutput,
                error: input.error,
                code: input.errorCode,
              }) ?? {
                toolCallId,
                toolName,
                input: input.toolInput,
                output: input.toolOutput,
                error: input.error,
              }),
      })
      toolStepIds.delete(toolCallId)
    }

    const mockDocumentSuffix = this.config.mockRuntime
      ? createMockDocumentRunSuffix({
          documentService: this.documentService,
          repos: this.repos,
          thread,
          runId,
          latestUserPrompt,
        })
      : ""

    const model: LanguageModel =
      liveModel ?? createDefaultMockLanguageModel(mockDocumentSuffix)

    const maxToolSteps = looksLikeResearchBriefIntent(latestUserPrompt) ? 8 : 5

    const result = streamText({
      model,
      system: runtimeSystemPrompt,
      messages: modelMessages,
      tools: runtimeTools,
      stopWhen: stepCountIs(maxToolSteps),
      abortSignal: controller.signal,
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          if (hasPendingApprovalInParts(assistantParts)) return

          const currentText = getTextFromParts(assistantParts)
          assistantParts = setTextPart(assistantParts, currentText + chunk.text)
          this.repos.messages.updatePartsAndStatus(
            assistantMessage.id,
            assistantParts,
            "streaming"
          )
          return
        }

        if (chunk.type === "tool-call") {
          this.repos.runs.updateStatus(runId, "tool-calling")
          const toolkitSlug = composioToolNameToToolkit(chunk.toolName)
          const curated = toolkitSlug
            ? CURATED_COMPOSIO_TOOLS[toolkitSlug]
            : undefined
          const title = formatToolStepTitle({
            toolName: chunk.toolName,
            toolkitSlug,
            curated: Boolean(curated),
          })

          const step = this.repos.steps.create({
            runId,
            type: "tool-call",
            status: "running",
            title,
            payload:
              toolkitSlug && curated
                ? this.services.toolExecution.formatRunStepPayload({
                    toolkitSlug,
                    toolSlug: curated.toolSlug,
                    toolInput: chunk.input,
                  })
                : (formatNativeToolRunStepPayload({
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    workspaceId: workspaceHandle.id,
                    input: chunk.input,
                  }) ?? {
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    input: chunk.input,
                  }),
          })
          toolStepIds.set(chunk.toolCallId, step.id)
          assistantParts = [
            ...assistantParts,
            {
              type: "tool-call",
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              input: chunk.input,
            },
          ]
          this.repos.messages.updatePartsAndStatus(
            assistantMessage.id,
            assistantParts,
            "streaming"
          )
          return
        }

        if (chunk.type === "tool-result") {
          finalizeToolStep(chunk.toolCallId, chunk.toolName, {
            toolInput: chunk.input,
            toolOutput: chunk.output,
          })
          this.repos.runs.updateStatus(runId, "running")
          assistantParts = suppressTextForPendingApproval([
            ...assistantParts.filter(
              (part) =>
                !(
                  part.type === "tool-call" &&
                  part.toolCallId === chunk.toolCallId
                )
            ),
            {
              type: "tool-result",
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              output: chunk.output,
            },
          ])
          this.repos.messages.updatePartsAndStatus(
            assistantMessage.id,
            assistantParts,
            "streaming"
          )
        }
      },
      onStepFinish: async (stepResult) => {
        for (const result of stepResult.toolResults) {
          finalizeToolStep(result.toolCallId, result.toolName, {
            toolInput: result.input,
            toolOutput: result.output,
          })
          if (
            !assistantParts.some(
              (part) =>
                part.type === "tool-result" &&
                part.toolCallId === result.toolCallId
            )
          ) {
            assistantParts = suppressTextForPendingApproval([
              ...assistantParts.filter(
                (part) =>
                  !(
                    part.type === "tool-call" &&
                    part.toolCallId === result.toolCallId
                  )
              ),
              {
                type: "tool-result",
                toolCallId: result.toolCallId,
                toolName: result.toolName,
                output: result.output,
              },
            ])
          }
        }
        for (const part of stepResult.content) {
          if (part.type !== "tool-error") continue
          const message =
            part.error instanceof Error
              ? part.error.message
              : typeof part.error === "string"
                ? part.error
                : "Tool execution failed"
          const code = toolErrorCode(part.error)
          const details =
            part.error instanceof WorkspaceError
              ? part.error.details
              : undefined
          finalizeToolStep(part.toolCallId, part.toolName, {
            toolInput: part.input,
            error: message,
            errorCode: code,
          })
          assistantParts = [
            ...assistantParts.filter(
              (assistantPart) =>
                !(
                  assistantPart.type === "tool-call" &&
                  assistantPart.toolCallId === part.toolCallId
                )
            ),
            {
              type: "tool-error",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              error: message,
              code,
              details,
            },
          ]
        }
        this.repos.messages.updatePartsAndStatus(
          assistantMessage.id,
          assistantParts,
          "streaming"
        )
      },
      onFinish: async ({ totalUsage }) => {
        clearAbortController(runId)
        const hasPendingApproval = hasPendingApprovalInParts(assistantParts)
        for (const stepId of toolStepIds.values()) {
          this.repos.steps.update(stepId, {
            status: hasPendingApproval ? "pending" : "failed",
          })
        }
        toolStepIds.clear()
        if (hasPendingApproval) {
          assistantParts = suppressTextForPendingApproval(assistantParts)
        } else {
          assistantParts = stripRedundantToolJsonText(assistantParts)
          if (!getTextFromParts(assistantParts).trim()) {
            const fallback = formatToolResultFallback(assistantParts)
            if (fallback) {
              assistantParts = setTextPart(assistantParts, fallback)
            }
          }
        }
        if (!hasPendingApproval && !this.config.mockRuntime) {
          const finalized = finalizeResearchBriefIfNeeded({
            repos: this.repos,
            documentService: this.documentService,
            thread,
            runId,
            latestUserPrompt,
            assistantParts,
            documentsPermitted: nativeRuntimeCapabilities.documents.permitted,
          })
          assistantParts = finalized.assistantParts
        }
        this.repos.messages.updatePartsAndStatus(
          assistantMessage.id,
          assistantParts,
          "completed"
        )
        const usage = {
          promptTokens: totalUsage.inputTokens,
          completionTokens: totalUsage.outputTokens,
          totalTokens: totalUsage.totalTokens,
        }
        this.repos.runs.updateStatus(
          runId,
          hasPendingApproval ? "tool-calling" : "completed",
          {
            finishedAt: hasPendingApproval ? undefined : nowIso(),
            usage,
          }
        )
        this.createTimelineDebugStep(runId, {
          status: "completed",
          title: "Debug: model output",
          payload: {
            provider: "debug",
            kind: "model-output",
            assistantParts,
            usage,
          },
        })
        if (!hasPendingApproval) {
          this.repos.steps.create({
            runId,
            type: "completed",
            status: "completed",
            title: "Completed",
          })
        }
        this.repos.threads.touch(run.threadId, { status: "active" })
      },
      onAbort: async () => {
        clearAbortController(runId)
        const partialText = getTextFromParts(assistantParts)
        assistantParts = setTextPart(assistantParts, partialText)
        this.persistAbortedRun(runId, run.threadId, {
          assistantMessageId: assistantMessage.id,
          parts: assistantParts,
          partialText,
        })
      },
      onError: async ({ error }) => {
        clearAbortController(runId)
        const message =
          error instanceof Error ? error.message : "Unknown provider error"
        this.repos.messages.updatePartsAndStatus(
          assistantMessage.id,
          assistantParts,
          "failed"
        )
        this.repos.runs.updateStatus(runId, "failed", {
          finishedAt: nowIso(),
          errorSummary: message,
        })
        this.createTimelineDebugStep(runId, {
          status: "failed",
          title: "Debug: model output",
          payload: {
            provider: "debug",
            kind: "model-output",
            assistantParts,
            error: message,
          },
        })
        this.repos.steps.create({
          runId,
          type: "error",
          status: "failed",
          title: "Run failed",
          payload: { message },
        })
        this.repos.threads.touch(run.threadId, { status: "failed" })
      },
    })

    return result.toUIMessageStreamResponse({
      originalMessages: toUiMessages(threadMessages),
    })
  }

  abort(runId: string): Run | null {
    const run = this.repos.runs.getById(runId)
    if (!run) return null

    signalAbort(runId)

    if (
      run.status === "queued" ||
      run.status === "running" ||
      run.status === "tool-calling"
    ) {
      const messages = this.repos.messages.listByThreadId(run.threadId)
      const streamingMessage = messages.find(
        (message) => message.status === "streaming"
      )
      this.persistAbortedRun(runId, run.threadId, {
        assistantMessageId: streamingMessage?.id,
        parts: streamingMessage?.parts,
        partialText: streamingMessage
          ? getTextFromParts(streamingMessage.parts)
          : "",
      })
    }

    return this.repos.runs.getById(runId)
  }

  async decideWorkspaceToolApproval(
    runId: string,
    toolCallId: string,
    decision: "approve" | "deny"
  ) {
    return this.workspaceApproval.decide(runId, toolCallId, decision)
  }

  private failWithWorkspaceError(
    runId: string,
    threadId: string,
    error: unknown
  ): never {
    const message =
      error instanceof Error
        ? error.message
        : "Workspace could not be resolved."
    const code =
      error instanceof WorkspaceError ? error.code : "workspace_error"
    this.repos.messages.create({
      threadId,
      role: "assistant",
      parts: [{ type: "text", text: message }],
      status: "failed",
    })
    this.repos.runs.updateStatus(runId, "failed", {
      finishedAt: nowIso(),
      errorSummary: message,
    })
    this.repos.steps.create({
      runId,
      type: "error",
      status: "failed",
      title: "Run failed",
      payload: {
        provider: "native",
        code,
        error: message,
      },
    })
    this.repos.threads.touch(threadId, { status: "failed" })
    throw new Error(message)
  }

  private failWithAppPermissionDenied(
    runId: string,
    threadId: string,
    error: { code: string; message: string }
  ): never {
    this.repos.messages.create({
      threadId,
      role: "assistant",
      parts: [{ type: "text", text: error.message }],
      status: "failed",
    })
    this.repos.runs.updateStatus(runId, "failed", {
      finishedAt: nowIso(),
      errorSummary: error.message,
    })
    this.repos.steps.create({
      runId,
      type: "error",
      status: "failed",
      title: "App permission denied",
      payload: {
        provider: "native",
        toolName: "createApp",
        code: error.code,
        error: error.message,
        remediation: "Enable the apps native tool permission for this agent.",
      },
    })
    this.repos.threads.touch(threadId, { status: "failed" })
    throw new Error(error.message)
  }

  private failWithStaticArtifactPermissionDenied(
    runId: string,
    threadId: string,
    error: { code: string; message: string }
  ): never {
    this.repos.messages.create({
      threadId,
      role: "assistant",
      parts: [{ type: "text", text: error.message }],
      status: "failed",
    })
    this.repos.runs.updateStatus(runId, "failed", {
      finishedAt: nowIso(),
      errorSummary: error.message,
    })
    this.repos.steps.create({
      runId,
      type: "error",
      status: "failed",
      title: "Static artifact permission denied",
      payload: {
        provider: "native",
        toolName: "createStaticArtifact",
        code: error.code,
        error: error.message,
        remediation: "Enable the staticArtifacts native tool permission for this agent.",
      },
    })
    this.repos.threads.touch(threadId, { status: "failed" })
    throw new Error(error.message)
  }

  private failWithWebSearchError(
    runId: string,
    threadId: string,
    error: WebSearchError
  ): never {
    this.repos.messages.create({
      threadId,
      role: "assistant",
      parts: [{ type: "text", text: error.message }],
      status: "failed",
    })
    this.repos.runs.updateStatus(runId, "failed", {
      finishedAt: nowIso(),
      errorSummary: error.message,
    })
    this.repos.steps.create({
      runId,
      type: "error",
      status: "failed",
      title: "Web search unavailable",
      payload: {
        provider: "native",
        toolName: "searchWeb",
        code: error.code,
        error: error.message,
      },
    })
    this.repos.threads.touch(threadId, { status: "failed" })
    throw new Error(error.message)
  }

  private failWithRemediation(
    runId: string,
    threadId: string,
    error: ComposioRemediationError
  ) {
    this.repos.messages.create({
      threadId,
      role: "assistant",
      parts: [{ type: "text", text: error.message }],
      status: "failed",
    })
    this.repos.runs.updateStatus(runId, "failed", {
      finishedAt: nowIso(),
      errorSummary: error.message,
    })
    this.repos.steps.create({
      runId,
      type: "error",
      status: "failed",
      title: "Integration required",
      payload: this.services.toolExecution.formatRunStepPayload({
        toolkitSlug: error.toolkitSlug ?? "unknown",
        toolSlug: "preflight",
        error: error.message,
        remediation: error.code,
      }),
    })
    this.repos.threads.touch(threadId, { status: "failed" })
    throw new Error(error.message)
  }

  private persistAbortedRun(
    runId: string,
    threadId: string,
    input?: {
      assistantMessageId?: string
      parts?: MessagePart[]
      partialText?: string
    }
  ) {
    const run = this.repos.runs.getById(runId)
    if (
      !run ||
      run.status === "aborted" ||
      run.status === "completed" ||
      run.status === "failed"
    ) {
      return
    }

    if (input?.assistantMessageId && input.parts) {
      this.repos.messages.updatePartsAndStatus(
        input.assistantMessageId,
        input.parts,
        "aborted"
      )
    }

    this.repos.runs.updateStatus(runId, "aborted", {
      finishedAt: nowIso(),
    })
    this.repos.steps.create({
      runId,
      type: "aborted",
      status: "completed",
      title: "Aborted",
      payload: { partialText: input?.partialText ?? "" },
    })
    this.repos.threads.touch(threadId)
  }
}
