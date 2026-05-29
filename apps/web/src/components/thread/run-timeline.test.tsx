import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Run, RunStep } from "@workspace/shared"
import { RunTimeline } from "./run-timeline"

const run: Run = {
  id: "run_1",
  threadId: "thread_1",
  status: "completed",
  model: "gpt-4o-mini",
  startedAt: new Date().toISOString(),
}

function step(payload: Record<string, unknown>): RunStep {
  return {
    id: "step_1",
    runId: run.id,
    type: "tool-result",
    status: "completed",
    title: "Native: listWorkspaceFiles",
    payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe("RunTimeline", () => {
  it("keeps debug I/O hidden until debug mode is enabled", async () => {
    const user = userEvent.setup()
    render(
      <RunTimeline
        run={run}
        steps={[
          {
            id: "step_debug",
            runId: run.id,
            type: "reasoning",
            status: "completed",
            title: "Debug: model input",
            payload: {
              provider: "debug",
              kind: "model-input",
              systemPrompt: "## Agent instructions\nAnswer with full debug detail.",
              messages: [{ role: "user", content: "Inspect this run." }],
              tools: ["listWorkspaceFiles", "readWorkspaceFile"],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]}
      />
    )

    expect(screen.getByRole("button", { name: "Debug mode" })).toBeInTheDocument()
    expect(screen.queryByText("Debug: model input")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Debug mode" }))

    expect(screen.getByText("Debug: model input")).toBeInTheDocument()
    const systemPromptSummary = screen.getByText("System prompt")
    expect(systemPromptSummary.closest("details")).not.toHaveAttribute("open")

    await user.click(systemPromptSummary)

    expect(systemPromptSummary.closest("details")).toHaveAttribute("open")
    expect(screen.getByText(/Answer with full debug detail/)).toBeInTheDocument()
    expect(screen.getByText(/listWorkspaceFiles/)).toBeInTheDocument()
  })

  it("renders native workspace tool evidence without full file contents", () => {
    render(
      <RunTimeline
        run={run}
        steps={[
          step({
            provider: "native",
            toolName: "readWorkspaceFile",
            workspaceId: "workspace_agentis",
            input: { path: "notes.md" },
            output: {
              path: "notes.md",
              content: "This full content should stay out of the timeline.",
              bytesReturned: 42,
              totalBytes: 120,
              truncated: true,
            },
          }),
        ]}
      />
    )

    expect(screen.getByText("Native")).toBeInTheDocument()
    expect(screen.getByText(/readWorkspaceFile/)).toBeInTheDocument()
    expect(screen.getByText(/workspace_agentis/)).toBeInTheDocument()
    expect(screen.getByText(/notes.md/)).toBeInTheDocument()
    expect(screen.getByText(/truncated/)).toBeInTheDocument()
    expect(
      screen.queryByText(/This full content should stay out/)
    ).not.toBeInTheDocument()
  })
})
