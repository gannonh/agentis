import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { Message } from "@workspace/shared"
import { groupThreadTurns, isTranscriptMessage } from "./thread-transcript-turns"
import { ThreadTranscript } from "./thread-transcript"

function message(
  overrides: Partial<Message> & Pick<Message, "id" | "role">
): Message {
  return {
    threadId: "thread_1",
    status: "completed",
    createdAt: new Date().toISOString(),
    parts: [{ type: "text", text: `${overrides.role} copy` }],
    ...overrides,
  }
}

describe("thread-transcript", () => {
  it("groups each user message with following assistant replies", () => {
    const turns = groupThreadTurns([
      message({ id: "user_1", role: "user", parts: [{ type: "text", text: "First" }] }),
      message({
        id: "assistant_1",
        role: "assistant",
        parts: [{ type: "text", text: "Reply one" }],
      }),
      message({ id: "user_2", role: "user", parts: [{ type: "text", text: "Second" }] }),
      message({
        id: "assistant_2",
        role: "assistant",
        parts: [{ type: "text", text: "Reply two" }],
      }),
    ])

    expect(turns).toHaveLength(2)
    expect(turns[0]?.user.id).toBe("user_1")
    expect(turns[0]?.replies.map((reply) => reply.id)).toEqual(["assistant_1"])
    expect(turns[1]?.user.id).toBe("user_2")
    expect(turns[1]?.replies.map((reply) => reply.id)).toEqual(["assistant_2"])
  })

  it("drops completed assistant messages with no visible content", () => {
    expect(
      isTranscriptMessage(
        message({
          id: "assistant_empty",
          role: "assistant",
          parts: [],
        })
      )
    ).toBe(false)

    const turns = groupThreadTurns([
      message({ id: "user_1", role: "user", parts: [{ type: "text", text: "Hi" }] }),
      message({ id: "assistant_empty", role: "assistant", parts: [] }),
      message({
        id: "assistant_1",
        role: "assistant",
        parts: [{ type: "text", text: "Visible reply" }],
      }),
    ])

    expect(turns).toHaveLength(1)
    expect(turns[0]?.replies.map((reply) => reply.id)).toEqual(["assistant_1"])
  })

  it("renders user prompts in a shared-width workbench layout", () => {
    render(
      <ThreadTranscript
        messages={[
          message({ id: "user_1", role: "user", parts: [{ type: "text", text: "Build a deck" }] }),
          message({
            id: "assistant_1",
            role: "assistant",
            parts: [{ type: "text", text: "Done — deck created." }],
          }),
        ]}
      />
    )

    expect(screen.getByText("Build a deck")).toBeInTheDocument()
    expect(screen.getByText("Done — deck created.")).toBeInTheDocument()
    expect(screen.getByText("Build a deck").closest(".sticky")).toBeTruthy()
  })
})
