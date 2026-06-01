import { streamText, type LanguageModel } from "ai"
import { MockLanguageModelV2 } from "ai/test"
import type {
  Message,
  MessagePart,
  Run,
  SearchWebOutput,
  Thread,
} from "@workspace/shared"
import type { ComposioServices } from "../composio/index.js"
import {
  CURATED_COMPOSIO_TOOLS,
  SUPPORTED_TOOLKIT_NAMES,
} from "../composio/tool-catalog.js"
import { isRunTimelineDebugEnabled, type AppConfig } from "../config.js"
import { formatNativeToolRunStepPayload } from "../native-tools/native-tool-payload.js"
import type { WebSearchService } from "../research/web-search-service.js"
import type { Repositories } from "../repositories/index.js"
import { nowIso } from "../lib/ids.js"
import type { WorkspaceEditService } from "../workspaces/workspace-edit-service.js"
import type { WorkspaceExecutionService } from "../workspaces/workspace-execution-service.js"
import { isPendingApprovalOutput } from "../workspaces/workspace-mutation-output.js"
import type { WorkspaceHandle } from "../workspaces/workspace-service.js"
import {
  composioToolNameToToolkit,
  formatToolStepTitle,
} from "./run-tool-labels.js"
import { toModelMessages, toUiMessages } from "./run-message-adapters.js"

export type RunExecutorMocksDeps = {
  repos: Repositories
  config: AppConfig
  services: ComposioServices
  editService: WorkspaceEditService
  executionService: WorkspaceExecutionService
  webSearchService: WebSearchService
}

function createTimelineDebugStep(
  deps: RunExecutorMocksDeps,
  runId: string,
  input: {
    status: "completed" | "failed"
    title: string
    payload: Record<string, unknown>
  }
) {
  if (!isRunTimelineDebugEnabled(deps.config)) return
  deps.repos.steps.create({
    runId,
    type: "reasoning",
    status: input.status,
    title: input.title,
    payload: input.payload,
  })
}

function mockTextStream(summaryText: string) {
  return new MockLanguageModelV2({
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
}

function inferSearchQuery(prompt: string): string {
  const normalized = prompt
    .replace(/\b(search|look up|find)\b/gi, " ")
    .replace(/\b(the )?web\b/gi, " ")
    .replace(/\b(for|about|current|latest)\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .trim()
    .replace(/\s+/g, " ")

  return normalized || prompt.trim()
}

function formatMockWebSearchSummary(toolOutput: SearchWebOutput): string {
  const firstResult = toolOutput.results[0]
  if (!firstResult) {
    return `Found ${toolOutput.resultCount} web results.`
  }

  return `Found ${toolOutput.resultCount} web results. Top source: [${firstResult.title}](${firstResult.url}).`
}

export async function executeMockNativeWebSearchStream(
  deps: RunExecutorMocksDeps,
  runId: string,
  run: Run,
  threadMessages: Message[],
  latestUserPrompt: string
) {
  const thread = deps.repos.threads.getById(run.threadId)
  if (!thread) throw new Error("Thread not found")

  const assistantMessage = deps.repos.messages.create({
    threadId: run.threadId,
    role: "assistant",
    parts: [{ type: "text", text: "" }],
    status: "streaming",
  })

  deps.repos.runs.updateStatus(runId, "running")
  deps.repos.steps.create({
    runId,
    type: "running",
    status: "running",
    title: "Running",
  })

  const toolName = "searchWeb" as const
  const toolCallId = `mock-native-search-${runId}`
  const toolInput = { query: inferSearchQuery(latestUserPrompt) }
  let toolOutput: SearchWebOutput
  try {
    toolOutput = await deps.webSearchService.search(toolInput)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Web search failed"
    deps.repos.messages.updatePartsAndStatus(
      assistantMessage.id,
      [{ type: "text", text: message }],
      "failed"
    )
    deps.repos.runs.updateStatus(runId, "failed", {
      finishedAt: nowIso(),
      errorSummary: message,
    })
    deps.repos.steps.create({
      runId,
      type: "error",
      status: "failed",
      title: "Web search failed",
      payload: { provider: "native", toolName, toolCallId, message },
    })
    deps.repos.threads.touch(run.threadId, { status: "failed" })
    throw error
  }
  const summaryText = formatMockWebSearchSummary(toolOutput)
  const assistantParts: MessagePart[] = [
    { type: "text", text: summaryText },
    { type: "tool-call", toolCallId, toolName, input: toolInput },
    { type: "tool-result", toolCallId, toolName, output: toolOutput },
  ]

  deps.repos.steps.create({
    runId,
    type: "tool-call",
    status: "completed",
    title: formatToolStepTitle({ toolName, curated: false }),
    payload:
      formatNativeToolRunStepPayload({
        toolCallId,
        toolName,
        input: toolInput,
      }) ?? undefined,
  })
  deps.repos.steps.create({
    runId,
    type: "tool-result",
    status: "completed",
    title: formatToolStepTitle({ toolName, curated: false }),
    payload:
      formatNativeToolRunStepPayload({
        toolCallId,
        toolName,
        input: toolInput,
        output: toolOutput,
      }) ?? undefined,
  })

  deps.repos.messages.updatePartsAndStatus(
    assistantMessage.id,
    assistantParts,
    "completed"
  )
  const usage = { totalTokens: 0 }
  deps.repos.runs.updateStatus(runId, "completed", {
    finishedAt: nowIso(),
    usage,
  })
  createTimelineDebugStep(deps, runId, {
    status: "completed",
    title: "Debug: model output",
    payload: {
      provider: "debug",
      kind: "model-output",
      assistantParts,
      usage,
    },
  })
  deps.repos.steps.create({
    runId,
    type: "completed",
    status: "completed",
    title: "Completed",
  })
  deps.repos.threads.touch(run.threadId)

  const result = streamText({
    model: mockTextStream(summaryText) as LanguageModel,
    messages: toModelMessages(threadMessages),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: toUiMessages(threadMessages),
  })
}

export async function executeMockNativeWorkspaceStream(
  deps: RunExecutorMocksDeps,
  runId: string,
  run: Run,
  threadMessages: Message[],
  workspaceHandle: WorkspaceHandle,
  latestUserPrompt: string
) {
  const thread = deps.repos.threads.getById(run.threadId)
  if (!thread) throw new Error("Thread not found")

  const assistantMessage = deps.repos.messages.create({
    threadId: run.threadId,
    role: "assistant",
    parts: [{ type: "text", text: "" }],
    status: "streaming",
  })

  deps.repos.runs.updateStatus(runId, "running")
  deps.repos.steps.create({
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
    latestUserPrompt
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .trim()
      .split(/\s+/)[0] ?? "workspace"
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
    { type: "tool-call", toolCallId, toolName, input: toolInput },
    { type: "tool-result", toolCallId, toolName, output: toolOutput },
  ]

  deps.repos.steps.create({
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
  deps.repos.steps.create({
    runId,
    type: "tool-result",
    status: "completed",
    title: `Native: ${toolName}`,
    payload: payload ?? undefined,
  })

  deps.repos.messages.updatePartsAndStatus(
    assistantMessage.id,
    assistantParts,
    "completed"
  )
  const usage = { totalTokens: 0 }
  deps.repos.runs.updateStatus(runId, "completed", {
    finishedAt: nowIso(),
    usage,
  })
  createTimelineDebugStep(deps, runId, {
    status: "completed",
    title: "Debug: model output",
    payload: {
      provider: "debug",
      kind: "model-output",
      assistantParts,
      usage,
    },
  })
  deps.repos.steps.create({
    runId,
    type: "completed",
    status: "completed",
    title: "Completed",
  })
  deps.repos.threads.touch(run.threadId)

  const result = streamText({
    model: mockTextStream(summaryText) as LanguageModel,
    messages: toModelMessages(threadMessages),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: toUiMessages(threadMessages),
  })
}

export async function executeMockNativeWorkspaceMutationStream(
  deps: RunExecutorMocksDeps,
  runId: string,
  run: Run,
  thread: Thread,
  threadMessages: Message[],
  workspaceHandle: WorkspaceHandle,
  latestUserPrompt: string
) {
  const assistantMessage = deps.repos.messages.create({
    threadId: run.threadId,
    role: "assistant",
    parts: [{ type: "text", text: "" }],
    status: "streaming",
  })

  deps.repos.runs.updateStatus(runId, "running")
  deps.repos.steps.create({
    runId,
    type: "running",
    status: "running",
    title: "Running",
  })

  const toolName = "createWorkspaceFile" as const
  const toolCallId = `mock-native-mutation-${runId}`
  const toolInput = {
    path: `mock-safe-edit-${runId}.txt`,
    content: `Created by Agentis mock runtime.\n\nPrompt: ${latestUserPrompt.trim()}\n`,
  }

  const appliedOutput = await deps.editService.executeWorkspaceMutation(
    workspaceHandle,
    {
      threadId: thread.id,
      runId,
      toolCallId,
      approvalMode: thread.mode,
      mutation: { toolName, input: toolInput },
    }
  )

  const stepPayload = formatNativeToolRunStepPayload({
    toolCallId,
    toolName,
    workspaceId: workspaceHandle.id,
    input: toolInput,
    output: appliedOutput,
  })
  const pending = isPendingApprovalOutput(appliedOutput)
  const summaryText = pending ? "" : `Created workspace file ${toolInput.path}.`
  const assistantParts: MessagePart[] = [
    { type: "text", text: summaryText },
    { type: "tool-call", toolCallId, toolName, input: toolInput },
    { type: "tool-result", toolCallId, toolName, output: appliedOutput },
  ]

  deps.repos.steps.create({
    runId,
    type: "tool-call",
    status: pending ? "pending" : "completed",
    title: formatToolStepTitle({ toolName, curated: false }),
    payload: stepPayload ?? undefined,
  })
  deps.repos.messages.updatePartsAndStatus(
    assistantMessage.id,
    assistantParts,
    "completed"
  )
  deps.repos.runs.updateStatus(runId, pending ? "tool-calling" : "completed", {
    finishedAt: pending ? undefined : nowIso(),
    usage: { totalTokens: 0 },
  })
  createTimelineDebugStep(deps, runId, {
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
    deps.repos.steps.create({
      runId,
      type: "completed",
      status: "completed",
      title: "Completed",
    })
  }
  deps.repos.threads.touch(run.threadId)

  const result = streamText({
    model: mockTextStream(summaryText) as LanguageModel,
    messages: toModelMessages(threadMessages),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: toUiMessages(threadMessages),
  })
}

export async function executeMockNativeWorkspaceExecutionStream(
  deps: RunExecutorMocksDeps,
  runId: string,
  run: Run,
  thread: Thread,
  threadMessages: Message[],
  workspaceHandle: WorkspaceHandle,
  latestUserPrompt: string
) {
  const assistantMessage = deps.repos.messages.create({
    threadId: run.threadId,
    role: "assistant",
    parts: [{ type: "text", text: "" }],
    status: "streaming",
  })

  deps.repos.runs.updateStatus(runId, "running")
  deps.repos.steps.create({
    runId,
    type: "running",
    status: "running",
    title: "Running",
  })

  const toolName = "runWorkspaceCommand" as const
  const toolCallId = `mock-native-execution-${runId}`
  const toolInput = { kind: "command" as const, command: "printf hello" }
  const toolOutput = await deps.executionService.executeWorkspaceCommand(
    workspaceHandle,
    {
      threadId: thread.id,
      runId,
      toolCallId,
      approvalMode: thread.mode,
      input: toolInput,
    }
  )
  const pending = isPendingApprovalOutput(toolOutput)
  const summaryText = pending
    ? ""
    : `Ran workspace command with exit code ${toolOutput.exitCode}.`
  const assistantParts: MessagePart[] = [
    { type: "text", text: summaryText },
    { type: "tool-call", toolCallId, toolName, input: toolInput },
    { type: "tool-result", toolCallId, toolName, output: toolOutput },
  ]

  deps.repos.steps.create({
    runId,
    type: "tool-call",
    status: pending ? "pending" : "completed",
    title: formatToolStepTitle({ toolName, curated: false }),
    payload:
      formatNativeToolRunStepPayload({
        toolCallId,
        toolName,
        workspaceId: workspaceHandle.id,
        input: toolInput,
        output: toolOutput,
      }) ?? undefined,
  })
  deps.repos.messages.updatePartsAndStatus(
    assistantMessage.id,
    assistantParts,
    "completed"
  )
  deps.repos.runs.updateStatus(runId, pending ? "tool-calling" : "completed", {
    finishedAt: pending ? undefined : nowIso(),
    usage: { totalTokens: 0 },
  })
  createTimelineDebugStep(deps, runId, {
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
    deps.repos.steps.create({
      runId,
      type: "completed",
      status: "completed",
      title: "Completed",
    })
  }
  deps.repos.threads.touch(run.threadId)

  const result = streamText({
    model: mockTextStream(summaryText) as LanguageModel,
    messages: toModelMessages(threadMessages),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: toUiMessages(threadMessages),
  })
}

export async function executeMockComposioStream(
  deps: RunExecutorMocksDeps,
  runId: string,
  run: Run,
  threadMessages: Message[],
  composioTools: Record<string, ReturnType<typeof import("ai").tool>>,
  latestUserPrompt: string
) {
  const thread = deps.repos.threads.getById(run.threadId)
  if (!thread) throw new Error("Thread not found")

  const assistantMessage = deps.repos.messages.create({
    threadId: run.threadId,
    role: "assistant",
    parts: [{ type: "text", text: "" }],
    status: "streaming",
  })

  deps.repos.runs.updateStatus(runId, "running")
  deps.repos.steps.create({
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
    deps.repos.messages.updatePartsAndStatus(
      assistantMessage.id,
      [{ type: "text", text: message }],
      "failed"
    )
    deps.repos.runs.updateStatus(runId, "failed", {
      finishedAt: nowIso(),
      errorSummary: message,
    })
    deps.repos.steps.create({
      runId,
      type: "error",
      status: "failed",
      title: "Composio tool failed",
      payload: { message },
    })
    deps.repos.threads.touch(run.threadId, { status: "failed" })
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
    { type: "tool-call", toolCallId, toolName, input: {} },
    { type: "tool-result", toolCallId, toolName, output: toolOutput },
  ]

  deps.repos.steps.create({
    runId,
    type: "tool-call",
    status: "completed",
    title: `Composio: ${toolkitSlug}`,
    payload: deps.services.toolExecution.formatRunStepPayload({
      toolkitSlug,
      toolSlug: curated.toolSlug,
      toolInput: {},
    }),
  })
  deps.repos.steps.create({
    runId,
    type: "tool-result",
    status: "completed",
    title: `Composio: ${toolkitSlug}`,
    payload: deps.services.toolExecution.formatRunStepPayload({
      toolkitSlug,
      toolSlug: curated.toolSlug,
      toolOutput,
    }),
  })

  deps.repos.messages.updatePartsAndStatus(
    assistantMessage.id,
    assistantParts,
    "completed"
  )
  const usage = { totalTokens: 0 }
  deps.repos.runs.updateStatus(runId, "completed", {
    finishedAt: nowIso(),
    usage,
  })
  createTimelineDebugStep(deps, runId, {
    status: "completed",
    title: "Debug: model output",
    payload: {
      provider: "debug",
      kind: "model-output",
      assistantParts,
      usage,
    },
  })
  deps.repos.steps.create({
    runId,
    type: "completed",
    status: "completed",
    title: "Completed",
  })
  deps.repos.threads.touch(run.threadId)

  const result = streamText({
    model: mockTextStream(summaryText) as LanguageModel,
    messages: toModelMessages(threadMessages),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: toUiMessages(threadMessages),
  })
}
