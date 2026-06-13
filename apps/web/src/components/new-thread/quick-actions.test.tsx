import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { QuickActions } from "./quick-actions"
import { RESEARCH_TOPIC_PROMPT } from "./research-prompt"

describe("QuickActions", () => {
  it("calls onSelectChip for enabled suggestion chips", async () => {
    const user = userEvent.setup()
    const onSelectChip = vi.fn()

    render(<QuickActions agents={[]} onSelectChip={onSelectChip} />)

    await user.click(
      screen.getByRole("button", { name: /research a topic/i })
    )
    await user.click(
      screen.getByRole("button", { name: /launch readiness update/i })
    )

    expect(onSelectChip).toHaveBeenCalledTimes(2)
    expect(onSelectChip.mock.calls[0]?.[0]?.prompt).toBe(RESEARCH_TOPIC_PROMPT)
    expect(onSelectChip.mock.calls[1]?.[0]?.label).toBe("Launch readiness update")
  })

  it("renders at least four enabled chips", () => {
    render(<QuickActions agents={[]} onSelectChip={vi.fn()} />)

    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(4)
    for (const button of buttons) {
      expect(button).not.toBeDisabled()
    }
  })
})
