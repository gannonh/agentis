import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetNeedsAttentionDismissLocksForTests } from "./needs-attention-dismiss-lock"
import { NeedsAttentionPanel } from "./needs-attention-panel"

const pendingSuggestion = {
  id: "attention_learning_suggestion_1",
  type: "pending_learning_suggestion" as const,
  title: "Remember citation preference",
  description: "User prefers source-backed answers.",
  tag: "Pending memory",
  severity: "warning" as const,
  createdAt: "2026-06-09T12:05:00.000Z",
  href: "/learning?status=pending&suggestionId=suggestion_1",
  dismissible: true,
  suggestionId: "suggestion_1",
}

describe("NeedsAttentionPanel", () => {
  beforeEach(() => {
    resetNeedsAttentionDismissLocksForTests()
  })

  it("ignores duplicate dismiss clicks while a suggestion is dismissing", () => {
    const onDismiss = vi.fn(() => new Promise<void>(() => {}))

    render(
      <MemoryRouter>
        <NeedsAttentionPanel
          items={[pendingSuggestion]}
          pendingCount={1}
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    )

    const dismissButton = screen.getByRole("button", { name: "Dismiss" })
    fireEvent.click(dismissButton)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
