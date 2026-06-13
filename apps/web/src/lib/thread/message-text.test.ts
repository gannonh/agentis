import { describe, expect, it } from "vitest"
import type { Message } from "@workspace/shared"
import { shouldSuppressTextForToolResults } from "@workspace/shared"
import {
  getDisplayTranscriptText,
  getTranscriptText,
  messageHasVisibleContent,
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

  it("keeps user-requested JSON summaries with tool results", () => {
    const message = assistantMessage([
      {
        type: "text",
        text: '{"summary":"Adoption is rising","sources":["https://example.com"]}',
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
      '{"summary":"Adoption is rising","sources":["https://example.com"]}'
    )
  })

  it("treats streaming messages as visible before tool output arrives", () => {
    expect(messageHasVisibleContent(assistantMessage([], "streaming"))).toBe(
      true
    )
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

  it("strips redundant artifact path lines from display text", () => {
    const message = assistantMessage([
      {
        type: "text",
        text: [
          "Done — I created the document version.",
          "",
          "View it here: /documents/document_cab5727a-1950-4554-bea7-6dd46a933b01",
          "",
          "Download markdown: /api/documents/document_cab5727a-1950-4554-bea7-6dd46a933b01/download",
        ].join("\n"),
      },
      {
        type: "tool-result",
        toolCallId: "call_1",
        toolName: "createDocument",
        output: {
          documentId: "document_cab5727a-1950-4554-bea7-6dd46a933b01",
          title: "Working artifacts",
          viewPath:
            "/documents/document_cab5727a-1950-4554-bea7-6dd46a933b01",
          currentVersion: 1,
          visibilityScope: "thread",
        },
      },
    ])

    expect(getDisplayTranscriptText(message)).toBe(
      "Done — I created the document version."
    )
  })

  it("keeps user-authored path lines visible", () => {
    const userMessage: Message = {
      id: "msg_user_1",
      threadId: "thread_1",
      role: "user",
      status: "completed",
      createdAt: new Date().toISOString(),
      parts: [
        {
          type: "text",
          text: "Please keep this line: View it here: /documents/document_123",
        },
      ],
    }

    expect(getDisplayTranscriptText(userMessage)).toBe(
      "Please keep this line: View it here: /documents/document_123"
    )
  })
})
