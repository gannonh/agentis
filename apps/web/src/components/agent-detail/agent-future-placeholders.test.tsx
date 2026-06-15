import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AgentInvocationsTab, AgentSkillsTab } from "./agent-edit-tabs"

vi.mock("@/components/agent-detail/agent-schedules-panel", () => ({
  AgentSchedulesPanel: () => (
    <section data-testid="agent-schedules-panel">Schedules panel</section>
  ),
}))

describe("agent future-surface placeholders", () => {
  it("keeps Thread available and disables later invocation channels", () => {
    render(<AgentInvocationsTab agentId="agent_test" />)

    expect(screen.getByTestId("agent-schedules-panel")).toBeInTheDocument()

    const thread = screen.getByRole("article", { name: "Thread" })
    expect(within(thread).getByText("Available now")).toBeInTheDocument()
    expect(
      within(thread).getByText(
        "Start a test thread to check this agent with real work."
      )
    ).toBeInTheDocument()

    for (const label of [
      "Live mode",
      "Slack",
      "Telegram",
      "Webhook",
      "Email",
    ]) {
      const option = screen.getByRole("article", { name: label })
      expect(
        within(option).getByText("Planned for a later milestone")
      ).toBeInTheDocument()
      expect(within(option).getByRole("button")).toBeDisabled()
    }

    expect(screen.getByTestId("agent-invocations-tab")).not.toHaveTextContent(
      /mock|fixture/i
    )
  })

  it("renders Skills as a disabled future placeholder without fake data", () => {
    render(<AgentSkillsTab />)

    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument()
    expect(
      screen.getByText("Planned for a later milestone")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Skill attachments will let this agent apply reusable workflows when that capability is available."
      )
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add skills" })).toBeDisabled()
    expect(screen.getByTestId("agent-skills-tab")).not.toHaveTextContent(
      /mock|fixture/i
    )
  })
})
