import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import type { Message } from "@workspace/shared"
import { ThreadMessageContent } from "./thread-message-content"

function assistantMessage(parts: Message["parts"]): Message {
  return {
    id: "msg_1",
    threadId: "thread_1",
    role: "assistant",
    status: "completed",
    createdAt: new Date().toISOString(),
    parts,
  }
}

function renderMessage(message: Message) {
  return render(
    <MemoryRouter>
      <ThreadMessageContent message={message} />
    </MemoryRouter>
  )
}

describe("ThreadMessageContent", () => {
  it("renders searchWeb evidence instead of raw JSON text", () => {
    renderMessage(
      assistantMessage([
        {
          type: "text",
          text: '{"query":"Agentis launch news","provider":"mock","results":[]}',
        },
        {
          type: "tool-result",
          toolCallId: "call_1",
          toolName: "searchWeb",
          output: {
            query: "Agentis launch news",
            provider: "mock",
            resultCount: 1,
            truncated: false,
            results: [
              {
                title: "Agentis launch update",
                url: "https://example.com/agentis-launch",
                source: "example.com",
              },
            ],
          },
        },
      ])
    )

    expect(screen.queryByText(/\{"query":"Agentis launch news"/)).not.toBeInTheDocument()
    expect(screen.getByText("searchWeb")).toBeInTheDocument()
    expect(screen.getByText("Query: Agentis launch news")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Agentis launch update/ })).toHaveAttribute(
      "href",
      "https://example.com/agentis-launch"
    )
  })

  it("labels updateDocument results as updated", () => {
    renderMessage(
      assistantMessage([
        {
          type: "tool-result",
          toolCallId: "call_3",
          toolName: "updateDocument",
          output: {
            documentId: "document_123",
            title: "Research brief",
            viewPath: "/documents/document_123",
            currentVersion: 2,
            visibilityScope: "thread",
          },
        },
      ])
    )

    expect(screen.getByText("Document updated")).toBeInTheDocument()
    expect(screen.queryByText("Document created")).not.toBeInTheDocument()
  })

  it("renders createDocument with an open document link", () => {
    renderMessage(
      assistantMessage([
        {
          type: "text",
          text: "Saved the research brief to the Library.",
        },
        {
          type: "tool-result",
          toolCallId: "call_2",
          toolName: "createDocument",
          output: {
            documentId: "document_123",
            title: "Research brief: AI agents",
            viewPath: "/documents/document_123",
            currentVersion: 1,
            visibilityScope: "thread",
          },
        },
      ])
    )

    expect(screen.getByText("Saved the research brief to the Library.")).toBeInTheDocument()
    expect(screen.getByText("Document created")).toBeInTheDocument()
    expect(screen.getByText("Research brief: AI agents")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open document" })).toHaveAttribute(
      "href",
      "/documents/document_123"
    )
  })

  it("renders streaming status for empty in-flight messages", () => {
    renderMessage({
      ...assistantMessage([]),
      status: "streaming",
    })

    expect(screen.getByText("Streaming…")).toBeInTheDocument()
  })

  it("renders failed status for empty assistant messages", () => {
    renderMessage({
      ...assistantMessage([]),
      status: "failed",
    })

    expect(screen.getByText("Failed")).toBeInTheDocument()
  })

  it("renders readable markdown when text is not provider JSON", () => {
    renderMessage(
      assistantMessage([
        {
          type: "text",
          text: "Here is a **short summary** of what I found.",
        },
      ])
    )

    expect(screen.getByText(/short summary/)).toBeInTheDocument()
  })
})
