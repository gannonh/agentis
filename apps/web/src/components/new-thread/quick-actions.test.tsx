import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { QuickActions } from "./quick-actions"

describe("QuickActions", () => {
  it("fills the research topic prompt when selected", async () => {
    const user = userEvent.setup()
    const onResearchTopic = vi.fn()

    render(<QuickActions onResearchTopic={onResearchTopic} />)

    await user.click(
      screen.getByRole("button", { name: /research a topic/i })
    )

    expect(onResearchTopic).toHaveBeenCalledTimes(1)
  })
})
