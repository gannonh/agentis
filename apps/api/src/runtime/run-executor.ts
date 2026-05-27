import { createOpenAI } from "@ai-sdk/openai"
import {
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type UIMessage,
} from "ai"
import { MockLanguageModelV2 } from "ai/test"
import type { Message, MessagePart, Run } from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import { ComposioRemediationError } from "../composio/tool-execution-service.js"
import {
  CURATED_COMPOSIO_TOOLS,
  SUPPORTED_TOOLKIT_NAMES,
} from "../composio/tool-catalog.js"
import { summarizeToolOutput } from "../composio/sanitize.js"
import type { Repositories } from "../repositories/index.js"
import type { AppConfig } from "../config.js"
import { ArtifactService } from "../artifacts/artifact-service.js"
import { createArtifactTool } from "../artifacts/artifact-tool.js"
import { ProjectContextService } from "../projects/project-context-service.js"
import {
  abortRun as signalAbort,
  clearAbortController,
  getAbortSignal,
  registerAbortController,
} from "./abort-registry.js"
import { getWorkspaceSummaryTool } from "./get-workspace-summary.js"
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
  sourceWorkflowBlock?: string
  projectContextBlock?: string
}): string {
  if (
    !input.agentPrompt?.trim() &&
    !input.sourceWorkflowBlock?.trim() &&
    !input.projectContextBlock?.trim()
  ) {
    return PLATFORM_SYSTEM_PROMPT
  }

  return [
    formatSystemPromptSection("Agent instructions", input.agentPrompt),
    formatSystemPromptSection("Platform requirements", PLATFORM_SYSTEM_PROMPT),
    formatSystemPromptSection(
      "Source workflow context",
      input.sourceWorkflowBlock
    ),
    formatSystemPromptSection("Project context", input.projectContextBlock),
  ]
    .filter((section): section is string => Boolean(section))
    .join("\n\n")
}

function formatSourceWorkflowBlock(thread: {
  sourceThread?: { id: string; title: string }
  sourceWorkflow?: { summary: string; firstUserPrompt?: string }
}): string | undefined {
  if (!thread.sourceWorkflow) return undefined

  return [
    thread.sourceThread
      ? `Source thread: ${thread.sourceThread.title} (${thread.sourceThread.id})`
      : null,
    `Workflow summary: ${thread.sourceWorkflow.summary}`,
    thread.sourceWorkflow.firstUserPrompt
      ? `First user prompt: ${thread.sourceWorkflow.firstUserPrompt}`
      : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
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

function toModelMessages(messages: Message[]): ModelMessage[] {
  return messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role,
      content: getTextFromParts(message.parts),
    }))
    .filter((message) => message.content.length > 0) as ModelMessage[]
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

  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig,
    private readonly services: ComposioServices,
    private readonly artifactService: ArtifactService
  ) {
    this.contextService = new ProjectContextService(repos, config)
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
    const sourceWorkflow = thread.sourceWorkflow
    const sourceWorkflowBlock = formatSourceWorkflowBlock(thread)
    const systemPrompt = buildRunSystemPrompt({
      agentPrompt: agentConfiguration?.systemPrompt,
      sourceWorkflowBlock,
      projectContextBlock,
    })

    const composioTools = this.services.toolExecution.buildRuntimeTools(
      run.threadId
    )
    const runtimeTools = {
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
    if (sourceWorkflow) {
      this.repos.steps.create({
        runId,
        type: "reasoning",
        status: "completed",
        title: "Source workflow context loaded",
        payload: {
          sourceThreadId: thread.sourceThread?.id,
          sourceThreadTitle: thread.sourceThread?.title,
          summary: sourceWorkflow.summary,
          firstUserPrompt: sourceWorkflow.firstUserPrompt,
        },
      })
    }
    if (projectContext) {
      this.repos.steps.create({
        runId,
        type: "reasoning",
        status: "completed",
        title: "Project context loaded",
        payload: {
          projectId: projectContext.project.id,
          projectName: projectContext.project.name,
          projectStatus: projectContext.project.status,
          goalChars: projectContext.goals?.length ?? 0,
          memoryCount: projectContext.enabledMemoryCount,
          truncated: projectContext.truncated ?? false,
          empty: projectContext.empty ?? false,
        },
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
      }
    ) => {
      const toolkitSlug = composioToolNameToToolkit(toolName)
      const curated = toolkitSlug
        ? CURATED_COMPOSIO_TOOLS[toolkitSlug]
        : undefined
      const stepId = toolStepIds.get(toolCallId)
      if (!stepId) return

      const status = input.error ? "failed" : "completed"
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
            : {
                toolCallId,
                toolName,
                input: input.toolInput,
                output: input.toolOutput,
                error: input.error,
              },
      })
      toolStepIds.delete(toolCallId)
    }

    const modelMessages = toModelMessages(threadMessages)
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
      system: systemPrompt,
      messages: modelMessages,
      tools: runtimeTools,
      stopWhen: stepCountIs(5),
      abortSignal: controller.signal,
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta") {
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
          assistantParts = [
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
          ]
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
            assistantParts = [
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
            ]
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
        for (const stepId of toolStepIds.values()) {
          this.repos.steps.update(stepId, { status: "failed" })
        }
        toolStepIds.clear()
        if (!getTextFromParts(assistantParts).trim()) {
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
        this.repos.runs.updateStatus(runId, "completed", {
          finishedAt: nowIso(),
          usage: {
            promptTokens: totalUsage.inputTokens,
            completionTokens: totalUsage.outputTokens,
            totalTokens: totalUsage.totalTokens,
          },
        })
        this.repos.steps.create({
          runId,
          type: "completed",
          status: "completed",
          title: "Completed",
        })
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
    this.repos.runs.updateStatus(runId, "completed", {
      finishedAt: nowIso(),
      usage: { totalTokens: 0 },
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
