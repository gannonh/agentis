import { createOpenAI } from "@ai-sdk/openai"
import {
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
  type UIMessage,
} from "ai"
import { MockLanguageModelV2 } from "ai/test"
import type { Message, MessagePart, Run, Thread } from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import { ComposioRemediationError } from "../composio/tool-execution-service.js"
import {
  CURATED_COMPOSIO_TOOLS,
  SUPPORTED_TOOLKIT_NAMES,
} from "../composio/tool-catalog.js"
import { summarizeToolOutput } from "../composio/sanitize.js"
import type { Repositories } from "../repositories/index.js"
import { isRunTimelineDebugEnabled, type AppConfig } from "../config.js"
import { ArtifactService } from "../artifacts/artifact-service.js"
import { createArtifactTool } from "../artifacts/artifact-tool.js"
import { buildWorkspaceNativeTools } from "../native-tools/index.js"
import {
  formatNativeToolRunStepPayload,
  isNativeWorkspaceToolName,
} from "../native-tools/native-tool-payload.js"
import { WorkspaceEditService } from "../workspaces/workspace-edit-service.js"
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

const ARTIFACT_PROMPT_PATTERN = /artifact|brief|document|report/i
const PLATFORM_SYSTEM_PROMPT =
  "You are Agentis, a helpful workspace assistant. Be concise. Use getWorkspaceSummary when the user asks about workspace status, agents, or integrations. After calling a Composio tool, summarize the results for the user in plain language. Use createArtifact when the user asks for a durable artifact, document, brief, report, or library item. If the request has enough context to create useful content, choose a concise title, filename, and content instead of asking for schema fields."

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

function wantsGeneratedArtifact(prompt: string) {
  return ARTIFACT_PROMPT_PATTERN.test(prompt)
}

function composioToolNameToToolkit(toolName: string): string | undefined {
  if (!toolName.startsWith("composio_")) return undefined
  return toolName.replace(/^composio_/, "").replace(/_/g, "-")
}

export function formatToolStepTitle(input: {
  toolName: string
  toolkitSlug?: string
  curated: boolean
}): string {
  if (input.toolName === "createArtifact") return "Create artifact"
  if (input.toolName === "createWorkspaceFile") return "Create workspace file"
  if (input.toolName === "replaceInWorkspaceFile") return "Replace in workspace file"
  if (input.toolName === "applyWorkspacePatch") return "Apply workspace patch"
  if (isNativeWorkspaceToolName(input.toolName)) {
    return `Native: ${input.toolName}`
  }
  if (input.toolkitSlug && input.curated) {
    return `Composio: ${input.toolkitSlug}`
  }
  return `Tool: ${input.toolName}`
}

function getTextFromParts(parts: MessagePart[]) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function setTextPart(parts: MessagePart[], text: string): MessagePart[] {
  const nonText = parts.filter((part) => part.type !== "text")
  return text ? [{ type: "text", text }, ...nonText] : nonText
}

function formatToolResultFallback(parts: MessagePart[]): string | null {
  const toolResult = [...parts]
    .reverse()
    .find((part) => part.type === "tool-result")
  if (!toolResult || toolResult.type !== "tool-result") return null
  const summary = summarizeToolOutput(toolResult.output)
  if (summary === undefined || summary === null) return null
  if (typeof summary === "string") return summary
  try {
    return JSON.stringify(summary, null, 2)
  } catch {
    return String(summary)
  }
}

function formatToolResultsForModel(parts: MessagePart[]) {
  return parts
    .filter((part) => part.type === "tool-result")
    .map((part) => {
      const summary = summarizeToolOutput(part.output)
      const rendered =
        typeof summary === "string"
          ? summary
          : summary === undefined
            ? ""
            : JSON.stringify(summary)
      return `Tool ${part.toolName} result: ${rendered}`
    })
    .filter((line) => line.length > 0)
    .join("\n")
}

function toModelMessages(messages: Message[]): ModelMessage[] {
  return messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => {
      const text = getTextFromParts(message.parts)
      const toolSummary = formatToolResultsForModel(message.parts)
      const content = [text, toolSummary].filter(Boolean).join("\n\n")
      return {
        role: message.role,
        content,
      }
    })
    .filter((message) => message.content.length > 0) as ModelMessage[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isPendingApprovalOutput(output: unknown) {
  return isRecord(output) && output.status === "pending_approval"
}

function hasPendingApprovalPart(parts: MessagePart[]) {
  return parts.some(
    (part) => part.type === "tool-result" && isPendingApprovalOutput(part.output)
  )
}

export function suppressTextForPendingApproval(parts: MessagePart[]) {
  return hasPendingApprovalPart(parts) ? setTextPart(parts, "") : parts
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
      .map(([key, entry]) => [key, sanitizeJsonValue(entry, depth + 1)] as const)
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

function toUiMessages(messages: Message[]): UIMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    parts: message.parts
      .filter((part) => part.type === "text")
      .map((part) => ({ type: "text" as const, text: part.text })),
  }))
}

export class RunExecutor {
  private readonly contextService: ProjectContextService
  private readonly workspaceEditService: WorkspaceEditService

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly services: ComposioServices,
    private readonly artifactService: ArtifactService
  ) {
    this.contextService = new ProjectContextService(repos, config)
    this.workspaceEditService = new WorkspaceEditService(repos.workspaceEdits)
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
    if (!this.config.openAiApiKey && !this.config.mockRuntime) {
      throw new Error("OPENAI_API_KEY is not configured")
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
    const runtimeSystemPrompt = [systemPrompt, memoryPrompt]
      .filter((section): section is string => Boolean(section))
      .join("\n\n")

    const nativeTools = buildWorkspaceNativeTools({
      handle: workspaceHandle,
      editService: this.workspaceEditService,
      threadId: run.threadId,
      runId,
      threadMode: thread.mode,
    })
    const composioTools = this.services.toolExecution.buildRuntimeTools(
      run.threadId
    )
    const runtimeTools = {
      ...nativeTools,
      getWorkspaceSummary: getWorkspaceSummaryTool,
      createArtifact: createArtifactTool(this.artifactService, {
        runId,
        threadId: run.threadId,
        projectId: thread.projectId ?? undefined,
        onCreated: (artifactId, title) => {
          this.repos.steps.create({
            runId,
            type: "tool-result",
            status: "completed",
            title: `Artifact created: ${title}`,
            payload: {
              artifactId,
              title,
            },
          })
        },
      }),
      ...composioTools,
    }
    const modelMessages = toModelMessages(threadMessages)
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
      /\b(write|create|edit|patch|replace)\b.*\b(file|workspace)\b|\b(file|workspace)\b.*\b(write|create|edit|patch|replace)\b/i.test(
        latestUserPrompt
      )
    ) {
      return this.executeMockNativeWorkspaceMutationStream(
        runId,
        run,
        thread,
        threadMessages,
        workspaceHandle,
        latestUserPrompt
      )
    }

    if (this.config.mockRuntime && /\bfiles?\b|workspace file|read .*file|search .*file/i.test(latestUserPrompt)) {
      return this.executeMockNativeWorkspaceStream(
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
      return this.executeMockComposioStream(
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
      const status = input.error ? "failed" : pendingApproval ? "pending" : "completed"
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

    let mockArtifactSuffix = ""
    if (this.config.mockRuntime && wantsGeneratedArtifact(latestUserPrompt)) {
      const generated = this.artifactService.registerGenerated({
        title: "Project report",
        description: "Generated by mock runtime",
        type: "document",
        filename: "project-report.md",
        content: `# Project report\n\n${latestUserPrompt.trim()}\n\nGenerated for ${thread.title}.`,
        projectId: thread.projectId ?? undefined,
        threadId: thread.id,
        runId,
      })
      if (generated.ok) {
        mockArtifactSuffix = `\n\nCreated artifact **${generated.artifact.title}** (id: ${generated.artifact.id}). View it in the Library.`
        this.repos.steps.create({
          runId,
          type: "tool-result",
          status: "completed",
          title: `Artifact created: ${generated.artifact.title}`,
          payload: {
            artifactId: generated.artifact.id,
            title: generated.artifact.title,
          },
        })
      }
    }

    const model: LanguageModel = this.config.mockRuntime
      ? new MockLanguageModelV2({
          doStream: async () => ({
            stream: new ReadableStream({
              start(controller) {
                const baseChunks = [
                  "Hello ",
                  "from ",
                  "Agentis ",
                  "mock ",
                  "runtime.",
                ]
                const suffixChunks = mockArtifactSuffix
                  ? (mockArtifactSuffix.match(/.{1,24}/g) ?? [])
                  : []
                const chunks = [...baseChunks, ...suffixChunks]
                let index = 0
                const timer = setInterval(() => {
                  if (index < chunks.length) {
                    controller.enqueue({
                      type: "text-delta",
                      id: "t1",
                      delta: chunks[index]!,
                    })
                    index += 1
                    return
                  }
                  clearInterval(timer)
                  controller.enqueue({
                    type: "finish",
                    finishReason: "stop",
                    usage: {
                      inputTokens: 1,
                      outputTokens: chunks.join("").length,
                      totalTokens: 1 + chunks.join("").length,
                    },
                  })
                  controller.close()
                }, 900)
              },
            }),
          }),
        })
      : createOpenAI({ apiKey: this.config.openAiApiKey! })(run.model)

    const result = streamText({
      model,
      system: runtimeSystemPrompt,
      messages: modelMessages,
      tools: runtimeTools,
      stopWhen: stepCountIs(5),
      abortSignal: controller.signal,
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
          if (hasPendingApprovalPart(assistantParts)) return

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
                : {
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    input: chunk.input,
                  },
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
          finalizeToolStep(part.toolCallId, part.toolName, {
            toolInput: part.input,
            error: message,
            errorCode:
              part.error instanceof WorkspaceError ? part.error.code : undefined,
          })
        }
        this.repos.messages.updatePartsAndStatus(
          assistantMessage.id,
          assistantParts,
          "streaming"
        )
      },
      onFinish: async ({ totalUsage }) => {
        clearAbortController(runId)
        const hasPendingApproval = hasPendingApprovalPart(assistantParts)
        for (const stepId of toolStepIds.values()) {
          this.repos.steps.update(stepId, { status: hasPendingApproval ? "pending" : "failed" })
        }
        toolStepIds.clear()
        if (hasPendingApproval) {
          assistantParts = suppressTextForPendingApproval(assistantParts)
        } else if (!getTextFromParts(assistantParts).trim()) {
          const fallback = formatToolResultFallback(assistantParts)
          if (fallback) {
            assistantParts = setTextPart(assistantParts, fallback)
          }
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
        this.repos.runs.updateStatus(runId, hasPendingApproval ? "tool-calling" : "completed", {
          finishedAt: hasPendingApproval ? undefined : nowIso(),
          usage,
        })
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
    const run = this.repos.runs.getById(runId)
    if (!run) throw new WorkspaceError("run_not_found", "Run not found.")
    const thread = this.repos.threads.getById(run.threadId)
    if (!thread) throw new WorkspaceError("thread_not_found", "Thread not found.")
    if (!thread.workspaceId) {
      throw new WorkspaceError("workspace_not_found", "Thread does not have a workspace.")
    }

    const handle = await new WorkspaceService(
      this.repos,
      this.config
    ).openWorkspace(thread.workspaceId)

    const result =
      decision === "approve"
        ? await this.workspaceEditService.approveByRunToolCall(
            handle,
            runId,
            toolCallId
          )
        : { editId: this.workspaceEditService.denyByRunToolCall(runId, toolCallId).id }

    const edit = this.repos.workspaceEdits.getById(result.editId)
    if (!edit) {
      throw new WorkspaceError("workspace_edit_not_found", "Workspace edit not found.")
    }

    const output =
      decision === "approve" && "summary" in result
        ? {
            workspaceId: handle.id,
            editId: result.editId,
            ...result.summary,
            changedFiles: [{
              path: result.summary.path,
              operation: result.summary.operation,
              bytesWritten: result.summary.bytesWritten,
            }],
          }
        : {
            workspaceId: handle.id,
            editId: result.editId,
            path: edit.path,
            operation: edit.operation,
            status: "denied",
            changedFiles: [{ path: edit.path, operation: edit.operation }],
          }

    const step = this.repos.steps
      .listByRunId(runId)
      .find((item) => {
        const payload = item.payload as Record<string, unknown> | null | undefined
        return (
          payload?.toolCallId === toolCallId ||
          (typeof payload?.approval === "object" &&
            payload.approval !== null &&
            (payload.approval as { editId?: string }).editId === result.editId)
        )
      })
    if (step) {
      this.repos.steps.update(step.id, {
        status: decision === "approve" ? "completed" : "failed",
        payload:
          formatNativeToolRunStepPayload({
            toolCallId,
            toolName: edit.toolName,
            workspaceId: handle.id,
            input: edit.input,
            output,
          }) ?? undefined,
      })
    }

    const messages = this.repos.messages.listByThreadId(run.threadId)
    const assistant = messages.find((message) =>
      message.parts.some(
        (part) =>
          (part.type === "tool-call" || part.type === "tool-result") &&
          part.toolCallId === toolCallId
      )
    )
    if (assistant) {
      const text = decision === "approve"
        ? "Workspace edit approved and applied."
        : "Workspace edit denied. No file was changed."
      const parts = setTextPart(
        assistant.parts.map((part) =>
          part.type === "tool-result" && part.toolCallId === toolCallId
            ? { ...part, output }
            : part
        ),
        text
      )
      this.repos.messages.updatePartsAndStatus(assistant.id, parts, "completed")
    }

    this.repos.runs.updateStatus(runId, "completed", { finishedAt: nowIso() })
    this.repos.steps.create({
      runId,
      type: "completed",
      status: "completed",
      title: "Completed",
    })
    this.repos.threads.touch(run.threadId, { status: "active" })

    return { edit, output }
  }

  private failWithWorkspaceError(
    runId: string,
    threadId: string,
    error: unknown
  ): never {
    const message =
      error instanceof Error ? error.message : "Workspace could not be resolved."
    const code = error instanceof WorkspaceError ? error.code : "workspace_error"
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

  private failWithRemediation(
    runId: string,
    threadId: string,
    error: ComposioRemediationError
  ) {
    const assistantMessage = this.repos.messages.create({
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

  private async executeMockNativeWorkspaceStream(
    runId: string,
    run: Run,
    threadMessages: Message[],
    workspaceHandle: WorkspaceHandle,
    latestUserPrompt: string
  ) {
    const thread = this.repos.threads.getById(run.threadId)
    if (!thread) throw new Error("Thread not found")

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

    const toolCallId = `mock-native-tool-${runId}`
    const shouldSearchWorkspace = /search|find/i.test(latestUserPrompt)
    const toolName = shouldSearchWorkspace
      ? "searchWorkspaceFiles"
      : "listWorkspaceFiles"
    const nativeQuery =
      latestUserPrompt.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/)[0] ??
      "workspace"
    const toolInput = shouldSearchWorkspace
      ? { query: nativeQuery }
      : { path: "", recursive: false }
    const toolOutput = shouldSearchWorkspace
      ? {
          workspaceId: workspaceHandle.id,
          ...(await workspaceHandle.search({ query: nativeQuery })),
        }
      : {
          workspaceId: workspaceHandle.id,
          ...(await workspaceHandle.list({ path: "", recursive: false })),
        }
    const payload = formatNativeToolRunStepPayload({
      toolName,
      workspaceId: workspaceHandle.id,
      input: toolInput,
      output: toolOutput,
    })
    const summaryText =
      toolName === "searchWorkspaceFiles"
        ? `Searched workspace ${workspaceHandle.id}.`
        : `Listed workspace ${workspaceHandle.id}.`

    const assistantParts: MessagePart[] = [
      { type: "text", text: summaryText },
      {
        type: "tool-call",
        toolCallId,
        toolName,
        input: toolInput,
      },
      {
        type: "tool-result",
        toolCallId,
        toolName,
        output: toolOutput,
      },
    ]

    this.repos.steps.create({
      runId,
      type: "tool-call",
      status: "completed",
      title: `Native: ${toolName}`,
      payload:
        formatNativeToolRunStepPayload({
          toolName,
          workspaceId: workspaceHandle.id,
          input: toolInput,
        }) ?? undefined,
    })
    this.repos.steps.create({
      runId,
      type: "tool-result",
      status: "completed",
      title: `Native: ${toolName}`,
      payload: payload ?? undefined,
    })

    this.repos.messages.updatePartsAndStatus(
      assistantMessage.id,
      assistantParts,
      "completed"
    )
    const usage = { totalTokens: 0 }
    this.repos.runs.updateStatus(runId, "completed", {
      finishedAt: nowIso(),
      usage,
    })
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
    this.repos.steps.create({
      runId,
      type: "completed",
      status: "completed",
      title: "Completed",
    })
    this.repos.threads.touch(run.threadId)

    const model: LanguageModel = new MockLanguageModelV2({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: summaryText,
            })
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 1, outputTokens: 10, totalTokens: 11 },
            })
            controller.close()
          },
        }),
      }),
    })

    const result = streamText({
      model,
      messages: toModelMessages(threadMessages),
    })

    return result.toUIMessageStreamResponse({
      originalMessages: toUiMessages(threadMessages),
    })
  }

  private async executeMockNativeWorkspaceMutationStream(
    runId: string,
    run: Run,
    thread: Thread,
    threadMessages: Message[],
    workspaceHandle: WorkspaceHandle,
    latestUserPrompt: string
  ) {
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

    const toolName = "createWorkspaceFile"
    const toolCallId = `mock-native-mutation-${runId}`
    const toolInput = {
      path: `mock-safe-edit-${runId}.txt`,
      content: `Created by Agentis mock runtime.\n\nPrompt: ${latestUserPrompt.trim()}\n`,
    }

    const output = thread.mode === "plan"
      ? (() => {
          const edit = this.workspaceEditService.createPending({
            workspaceId: workspaceHandle.id,
            threadId: thread.id,
            runId,
            toolCallId,
            toolName,
            operation: "create",
            path: toolInput.path,
            approvalMode: thread.mode,
            toolInput,
          })
          return {
            workspaceId: workspaceHandle.id,
            path: toolInput.path,
            operation: "create",
            status: "pending_approval" as const,
            editId: edit.id,
            changedFiles: [{ path: toolInput.path, operation: "create" }],
          }
        })()
      : (() => {
          return null
        })()

    const appliedOutput = output ?? await (async () => {
      const summary = await this.workspaceEditService.applyMutation(
        workspaceHandle,
        { toolName, input: toolInput }
      )
      const edit = this.workspaceEditService.recordApplied({
        workspaceId: workspaceHandle.id,
        threadId: thread.id,
        runId,
        toolCallId,
        toolName,
        approvalMode: thread.mode,
        toolInput,
        summary,
      })
      return {
        workspaceId: workspaceHandle.id,
        editId: edit.id,
        ...summary,
        changedFiles: [{
          path: summary.path,
          operation: summary.operation,
          bytesWritten: summary.bytesWritten,
        }],
      }
    })()

    const stepPayload = formatNativeToolRunStepPayload({
      toolCallId,
      toolName,
      workspaceId: workspaceHandle.id,
      input: toolInput,
      output: appliedOutput,
    })
    const pending = isPendingApprovalOutput(appliedOutput)
    const summaryText = pending
      ? ""
      : `Created workspace file ${toolInput.path}.`
    const assistantParts: MessagePart[] = [
      { type: "text", text: summaryText },
      { type: "tool-call", toolCallId, toolName, input: toolInput },
      { type: "tool-result", toolCallId, toolName, output: appliedOutput },
    ]

    this.repos.steps.create({
      runId,
      type: "tool-call",
      status: pending ? "pending" : "completed",
      title: formatToolStepTitle({ toolName, curated: false }),
      payload: stepPayload ?? undefined,
    })
    this.repos.messages.updatePartsAndStatus(
      assistantMessage.id,
      assistantParts,
      "completed"
    )
    this.repos.runs.updateStatus(runId, pending ? "tool-calling" : "completed", {
      finishedAt: pending ? undefined : nowIso(),
      usage: { totalTokens: 0 },
    })
    this.createTimelineDebugStep(runId, {
      status: "completed",
      title: "Debug: model output",
      payload: {
        provider: "debug",
        kind: "model-output",
        assistantParts,
        usage: { totalTokens: 0 },
      },
    })
    if (!pending) {
      this.repos.steps.create({
        runId,
        type: "completed",
        status: "completed",
        title: "Completed",
      })
    }
    this.repos.threads.touch(run.threadId)

    const model: LanguageModel = new MockLanguageModelV2({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-delta", id: "t1", delta: summaryText })
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 1, outputTokens: 10, totalTokens: 11 },
            })
            controller.close()
          },
        }),
      }),
    })

    const result = streamText({
      model,
      messages: toModelMessages(threadMessages),
    })

    return result.toUIMessageStreamResponse({
      originalMessages: toUiMessages(threadMessages),
    })
  }

  private async executeMockComposioStream(
    runId: string,
    run: Run,
    threadMessages: Message[],
    composioTools: Record<string, ReturnType<typeof import("ai").tool>>,
    latestUserPrompt: string
  ) {
    const thread = this.repos.threads.getById(run.threadId)
    if (!thread) throw new Error("Thread not found")

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

    const toolName = Object.keys(composioTools)[0]!
    const toolkitSlug = composioToolNameToToolkit(toolName) ?? "github"
    const curated = CURATED_COMPOSIO_TOOLS[toolkitSlug]!
    const toolCallId = `mock-tool-${runId}`

    let toolOutput: unknown = { note: "mock" }
    try {
      const toolDef = composioTools[toolName] as {
        execute?: (input: { note?: string }) => Promise<unknown>
      }
      if (toolDef.execute) {
        toolOutput = await toolDef.execute({ note: latestUserPrompt })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Composio tool failed"
      this.repos.messages.updatePartsAndStatus(
        assistantMessage.id,
        [{ type: "text", text: message }],
        "failed"
      )
      this.repos.runs.updateStatus(runId, "failed", {
        finishedAt: nowIso(),
        errorSummary: message,
      })
      this.repos.steps.create({
        runId,
        type: "error",
        status: "failed",
        title: "Composio tool failed",
        payload: { message },
      })
      this.repos.threads.touch(run.threadId, { status: "failed" })
      throw new Error(message)
    }

    const toolkitName = SUPPORTED_TOOLKIT_NAMES[toolkitSlug] ?? toolkitSlug
    const summaryText =
      toolkitSlug === "github" &&
      typeof toolOutput === "object" &&
      toolOutput !== null
        ? `GitHub tool completed. Found ${(toolOutput as { repositories?: unknown[] }).repositories?.length ?? 0} repositories (mock).`
        : `${toolkitName} tool completed (mock).`

    const assistantParts: MessagePart[] = [
      { type: "text", text: summaryText },
      {
        type: "tool-call",
        toolCallId,
        toolName,
        input: {},
      },
      {
        type: "tool-result",
        toolCallId,
        toolName,
        output: toolOutput,
      },
    ]

    this.repos.steps.create({
      runId,
      type: "tool-call",
      status: "completed",
      title: `Composio: ${toolkitSlug}`,
      payload: this.services.toolExecution.formatRunStepPayload({
        toolkitSlug,
        toolSlug: curated.toolSlug,
        toolInput: {},
      }),
    })
    this.repos.steps.create({
      runId,
      type: "tool-result",
      status: "completed",
      title: `Composio: ${toolkitSlug}`,
      payload: this.services.toolExecution.formatRunStepPayload({
        toolkitSlug,
        toolSlug: curated.toolSlug,
        toolOutput,
      }),
    })

    this.repos.messages.updatePartsAndStatus(
      assistantMessage.id,
      assistantParts,
      "completed"
    )
    const usage = { totalTokens: 0 }
    this.repos.runs.updateStatus(runId, "completed", {
      finishedAt: nowIso(),
      usage,
    })
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
    this.repos.steps.create({
      runId,
      type: "completed",
      status: "completed",
      title: "Completed",
    })
    this.repos.threads.touch(run.threadId)

    const model: LanguageModel = new MockLanguageModelV2({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: "text-delta",
              id: "t1",
              delta: summaryText,
            })
            controller.enqueue({
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 1, outputTokens: 10, totalTokens: 11 },
            })
            controller.close()
          },
        }),
      }),
    })

    const result = streamText({
      model,
      messages: toModelMessages(threadMessages),
    })

    return result.toUIMessageStreamResponse({
      originalMessages: toUiMessages(threadMessages),
    })
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
