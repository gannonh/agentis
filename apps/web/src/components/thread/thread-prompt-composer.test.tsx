import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ThreadPromptComposer } from "./thread-prompt-composer"
import type { RuntimeHealth, ThreadMode } from "@workspace/shared"

const health: RuntimeHealth = { available: true, model: "gpt-4o-mini" }

function renderComposer(input?: {
  mode?: ThreadMode
  submitting?: boolean
  onModeChange?: (mode: ThreadMode) => void
}) {
  return render(
    <ThreadPromptComposer
      onSubmit={vi.fn()}
      health={health}
      mode={input?.mode ?? "plan"}
      onModeChange={input?.onModeChange ?? vi.fn()}
      submitting={input?.submitting}
    />
  )
}

describe("ThreadPromptComposer", () => {
  it("labels modes as Plan and Execute", () => {
    const { rerender } = render(
      <ThreadPromptComposer
        onSubmit={vi.fn()}
        health={health}
        mode="plan"
        onModeChange={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /plan/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /plan first/i })).not.toBeInTheDocument()

    rerender(
      <ThreadPromptComposer
        onSubmit={vi.fn()}
        health={health}
        mode="agent"
        onModeChange={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /execute/i })).toBeInTheDocument()
  })

  it("opens a mode menu with execute submodes and disabled action placeholders", async () => {
    const user = userEvent.setup()
    renderComposer({ mode: "agent" })

    await user.click(screen.getByRole("button", { name: /execute/i }))

    expect(screen.getByText("MODE")).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /plan/i })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /execute/i })).toBeInTheDocument()
    expect(screen.getByText("Auto")).toBeInTheDocument()
    expect(screen.getByText("Ask first")).toBeInTheDocument()
    expect(screen.getByText("ACTIONS")).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: /suggest learnings/i })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: /build skill/i })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: /give feedback/i })).toHaveAttribute("data-disabled")
    expect(screen.getByRole("menuitem", { name: /run evaluation/i })).toHaveAttribute("data-disabled")
  })

  it("keeps the mode menu available after a submitted turn settles", async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    renderComposer({ mode: "agent", submitting: false, onModeChange })

    await user.click(screen.getByRole("button", { name: /execute/i }))
    await user.click(screen.getByRole("menuitem", { name: /^plan/i }))

    expect(onModeChange).toHaveBeenCalledWith("plan")
  })
})
