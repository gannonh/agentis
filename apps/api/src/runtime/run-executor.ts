import { createOpenAI } from "@ai-sdk/openai"
import { streamText, type LanguageModel, type ModelMessage, type UIMessage } from "ai"
import { MockLanguageModelV2 } from "ai/test"
import type { Message, MessagePart, Run } from "@workspace/shared"
import type { Repositories } from "../repositories/index.js"
import type { AppConfig } from "../config.js"
import {
  abortRun as signalAbort,
  clearAbortController,
  getAbortSignal,
  registerAbortController,
} from "./abort-registry.js"
import { getWorkspaceSummaryTool } from "./get-workspace-summary.js"
import { nowIso } from "../lib/ids.js"

const tools = {
  getWorkspaceSummary: getWorkspaceSummaryTool,
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

function toModelMessages(messages: Message[]): ModelMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
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
  constructor(
    private readonly repos: Repositories,
    private readonly config: AppConfig
  ) {}

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
    this.repos.threads.touch(run.threadId)

    const controller = new AbortController()
    registerAbortController(runId, controller)

    let assistantParts: MessagePart[] = [{ type: "text", text: "" }]
    const toolStepIds = new Map<string, string>()

    const modelMessages = toModelMessages(threadMessages)
    const model: LanguageModel = this.config.mockRuntime
      ? new MockLanguageModelV2({
          doStream: async () => ({
            stream: new ReadableStream({
              start(controller) {
                const chunks = ["Hello ", "from ", "Agentis ", "mock ", "runtime."]
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
                    usage: { inputTokens: 1, outputTokens: 5, totalTokens: 6 },
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
      system:
        "You are Agentis, a helpful workspace assistant. Be concise. Use getWorkspaceSummary when the user asks about workspace status, agents, or integrations.",
      messages: modelMessages,
      tools,
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
          const step = this.repos.steps.create({
            runId,
            type: "tool-call",
            status: "running",
            title: `Tool: ${chunk.toolName}`,
            payload: {
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
          const stepId = toolStepIds.get(chunk.toolCallId)
          if (stepId) {
            this.repos.steps.update(stepId, {
              status: "completed",
              title: `Tool: ${chunk.toolName}`,
              payload: {
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName,
                output: chunk.output,
              },
            })
          }
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
      onFinish: async ({ totalUsage }) => {
        clearAbortController(runId)
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
        this.repos.messages.updatePartsAndStatus(
          assistantMessage.id,
          assistantParts,
          "aborted"
        )
        this.repos.runs.updateStatus(runId, "aborted", {
          finishedAt: nowIso(),
        })
        this.repos.steps.create({
          runId,
          type: "aborted",
          status: "completed",
          title: "Aborted",
          payload: { partialText },
        })
        this.repos.threads.touch(run.threadId)
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

    const hadActiveStream = signalAbort(runId)

    if (
      !hadActiveStream &&
      (run.status === "queued" ||
        run.status === "running" ||
        run.status === "tool-calling")
    ) {
      const messages = this.repos.messages.listByThreadId(run.threadId)
      const streamingMessage = messages.find(
        (message) => message.status === "streaming"
      )
      if (streamingMessage) {
        this.repos.messages.updatePartsAndStatus(
          streamingMessage.id,
          streamingMessage.parts,
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
        payload: {
          partialText: streamingMessage
            ? getTextFromParts(streamingMessage.parts)
            : "",
        },
      })
      this.repos.threads.touch(run.threadId)
    }

    return this.repos.runs.getById(runId)
  }
}
