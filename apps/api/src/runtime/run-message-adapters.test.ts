import { describe, expect, it } from "vitest"
import type { Message } from "@workspace/shared"
import {
  normalizeAssistantText,
  toModelMessages,
} from "./run-message-adapters.js"

describe("run message adapters", () => {
  it("normalizes placeholder document links in assistant text", () => {
    expect(
      normalizeAssistantText(
        "Download [the document](https://yourworkspaceurl/library?documentId=document_123) or view https://yourworkspaceurl/library?documentId=document_123"
      )
    ).toBe(
      "Download [the document](/api/documents/document_123/download) or view /api/documents/document_123/download"
    )
  })

  it("includes tool errors in model messages for retry context", () => {
    const messages: Message[] = [
      {
        id: "msg_1",
        threadId: "thread_1",
        role: "assistant",
        status: "completed",
        createdAt: "2026-05-31T00:00:00.000Z",
        parts: [
          {
            type: "tool-error",
            toolCallId: "tool_call_1",
            toolName: "replaceInWorkspaceFile",
            error: "Workspace replace input is invalid.",
            code: "workspace_mutation_input_invalid",
            details: [{ path: "oldText", message: "Required" }],
          },
        ],
      },
    ]

    expect(toModelMessages(messages)).toEqual([
      {
        role: "assistant",
        content: expect.stringContaining("Tool replaceInWorkspaceFile error"),
      },
    ])
    expect(toModelMessages(messages)[0]?.content).toContain("oldText")
  })
})
