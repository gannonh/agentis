import { describe, expect, it } from "vitest"
import type { Message } from "@workspace/shared"
import {
  getDisplayTranscriptText,
  getTranscriptText,
  messageHasVisibleContent,
  shouldSuppressTextForToolResults,
} from "./message-text"

function assistantMessage(
  parts: Message["parts"],
  status: Message["status"] = "completed"
): Message {
  return {
    id: "msg_1",
    threadId: "thread_1",
    role: "assistant",
    status,
    createdAt: new Date().toISOString(),
    parts,
  }
}

describe("message-text", () => {
  it("joins text parts for transcript text", () => {
    const message = assistantMessage([
      { type: "text", text: "Hello " },
      { type: "text", text: "world" },
    ])

    expect(getTranscriptText(message)).toBe("Hello world")
  })

  it("suppresses provider JSON when tool-result parts exist", () => {
    const parts: Message["parts"] = [
      {
        type: "text",
        text: '{"query":"ai agents","provider":"tavily:keyless","results":[]}',
      },
      {
        type: "tool-result",
        toolCallId: "call_1",
        toolName: "searchWeb",
        output: {
          query: "ai agents",
          provider: "tavily:keyless",
          results: [],
          resultCount: 0,
          truncated: false,
        },
      },
    ]

    expect(shouldSuppressTextForToolResults(getTranscriptText(assistantMessage(parts)), parts)).toBe(
      true
    )
    expect(getDisplayTranscriptText(assistantMessage(parts))).toBe("")
  })

  it("keeps readable assistant prose with tool results", () => {
    const message = assistantMessage([
      {
        type: "text",
        text: "I found three useful sources and saved a brief.",
      },
      {
        type: "tool-result",
        toolCallId: "call_1",
        toolName: "searchWeb",
        output: {
          query: "ai agents",
          provider: "tavily:keyless",
          results: [],
          resultCount: 0,
          truncated: false,
        },
      },
    ])

    expect(getDisplayTranscriptText(message)).toBe(
      "I found three useful sources and saved a brief."
    )
  })

  it("treats failed and aborted messages as visible without parts", () => {
    expect(
      messageHasVisibleContent(
        assistantMessage([], "failed")
      )
    ).toBe(true)
    expect(
      messageHasVisibleContent(
        assistantMessage([], "aborted")
      )
    ).toBe(true)
  })

  it("treats tool-result-only messages as visible", () => {
    const message = assistantMessage([
      {
        type: "tool-result",
        toolCallId: "call_1",
        toolName: "createDocument",
        output: {
          documentId: "document_123",
          title: "Research brief",
          viewPath: "/documents/document_123",
          currentVersion: 1,
          visibilityScope: "thread",
        },
      },
    ])

    expect(messageHasVisibleContent(message)).toBe(true)
  })
})
