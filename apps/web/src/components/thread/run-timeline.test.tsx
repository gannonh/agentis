import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
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

function renderTimeline(props: { run: Run | null; steps: RunStep[] }) {
  return render(
    <MemoryRouter>
      <RunTimeline {...props} />
    </MemoryRouter>
  )
}

describe("RunTimeline", () => {
  it("shows debug mode even when an older run has no debug payload", async () => {
    const user = userEvent.setup()
    renderTimeline({ run, steps: [step({ provider: "native" })] })

    await user.click(screen.getByRole("button", { name: "Debug mode" }))

    expect(screen.getByText("No debug events for this run."))
      .toBeInTheDocument()
  })

  it("keeps debug I/O hidden until debug mode is enabled", async () => {
    const user = userEvent.setup()
    renderTimeline({
      run,
      steps: [
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
              memories: {
                agent: [
                  {
                    content: "Preserve customer language in summaries.",
                    scope: "agent",
                  },
                ],
                global: [
                  {
                    content: "Use beta workspace positioning.",
                    scope: "global",
                  },
                ],
              },
              tools: [
                {
                  name: "listWorkspaceFiles",
                  description: "List files and directories under the workspace.",
                  inputSchema: {
                    typeName: "ZodObject",
                    fields: [{ name: "path", typeName: "ZodOptional" }],
                  },
                },
                "readWorkspaceFile",
              ],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
    })

    expect(screen.getByRole("button", { name: "Debug mode" })).toBeInTheDocument()
    expect(screen.queryByText("Debug: model input")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Debug mode" }))

    expect(screen.getByText("Debug: model input")).toBeInTheDocument()
    const systemPromptSummary = screen.getByText("System prompt")
    expect(systemPromptSummary.closest("details")).not.toHaveAttribute("open")

    await user.click(systemPromptSummary)

    expect(systemPromptSummary.closest("details")).toHaveAttribute("open")
    expect(screen.getByText(/Answer with full debug detail/)).toBeInTheDocument()
    expect(screen.getAllByText(/listWorkspaceFiles/).length).toBeGreaterThan(1)
    expect(screen.getByText(/readWorkspaceFile/)).toBeInTheDocument()
    expect(screen.getByText("Memories")).toBeInTheDocument()
    expect(screen.getByText(/Preserve customer language/)).toBeInTheDocument()
    expect(screen.getByText("Tool details")).toBeInTheDocument()
    expect(screen.getByText(/List files and directories/)).toBeInTheDocument()
    expect(screen.getByText(/ZodObject/)).toBeInTheDocument()
  })

  it("renders mutating workspace summaries and pending approval state", () => {
    renderTimeline({
      run,
      steps: [
          step({
            provider: "native",
            toolCallId: "tool_call_1",
            toolName: "createWorkspaceFile",
            workspaceId: "workspace_agentis",
            input: { path: "notes.md", content: "hidden body" },
            output: {
              path: "notes.md",
              operation: "create",
              status: "pending_approval",
              editId: "wedit_1",
            },
            changedFiles: [],
            approval: { status: "pending", editId: "wedit_1" },
          }),
        ],
    })

    expect(screen.getByText("Pending approval")).toBeInTheDocument()
    expect(screen.getByText("Path: notes.md")).toBeInTheDocument()
    expect(screen.queryByText(/Changed notes.md · create/)).not.toBeInTheDocument()
    expect(screen.queryByText(/hidden body/)).not.toBeInTheDocument()
  })

  it("renders native workspace tool evidence without full file contents", () => {
    renderTimeline({
      run,
      steps: [
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
        ],
    })

    expect(screen.getByText(/Native · readWorkspaceFile/)).toBeInTheDocument()
    expect(screen.getByText(/workspace_agentis/)).toBeInTheDocument()
    expect(screen.getByText(/notes.md/)).toBeInTheDocument()
    expect(screen.getByText(/truncated/)).toBeInTheDocument()
    expect(
      screen.queryByText(/This full content should stay out/)
    ).not.toBeInTheDocument()
  })

  it("renders safe web search source evidence", () => {
    renderTimeline({
      run,
      steps: [
          step({
            provider: "native",
            toolName: "searchWeb",
            input: { query: "Agentis launch news" },
            output: {
              query: "Agentis launch news",
              provider: "mock",
              resultCount: 3,
              truncated: true,
              results: [
                {
                  title: "Agentis launch update",
                  url: "https://example.com/agentis-launch",
                  source: "example.com",
                },
                {
                  title: "Agent tooling notes",
                  url: "https://docs.example.com/tooling",
                  source: "docs.example.com",
                },
                {
                  title: "Unsafe source",
                  url: "javascript:alert(1)",
                  source: "evil.example",
                },
              ],
            },
          }),
        ],
    })

    expect(screen.getByText(/Native · searchWeb/)).toBeInTheDocument()
    expect(screen.getByText("Query: Agentis launch news")).toBeInTheDocument()
    expect(screen.getByText("mock · 3 results · truncated")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Agentis launch update/ }))
      .toHaveAttribute("href", "https://example.com/agentis-launch")
    expect(screen.getByText(/docs\.example\.com/)).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /Unsafe source/ })
    ).not.toBeInTheDocument()
  })

  it("renders workspace execution stdout stderr duration and changed files", () => {
    renderTimeline({
      run,
      steps: [
          step({
            provider: "native",
            toolCallId: "tool_call_1",
            toolName: "runWorkspaceCommand",
            workspaceId: "workspace_agentis",
            input: { kind: "command", command: "printf hello" },
            output: {
              workspaceId: "workspace_agentis",
              executionId: "wexec_1",
              kind: "command",
              exitCode: 0,
              durationMs: 15,
              stdout: "hello",
              stderr: "",
              stdoutTruncated: false,
              stderrTruncated: false,
              timedOut: false,
              aborted: false,
              changedFiles: [{ path: "out.txt", operation: "created" }],
            },
            changedFiles: [{ path: "out.txt", operation: "created" }],
          }),
        ],
    })

    expect(screen.getByText(/Exit 0 · 15ms/)).toBeInTheDocument()
    expect(screen.getByText("stdout")).toBeInTheDocument()
    expect(screen.getByText("hello")).toBeInTheDocument()
    expect(screen.getByText(/Changed out.txt · created/)).toBeInTheDocument()
  })

  it("links document timeline steps to the document workspace", () => {
    renderTimeline({
      run,
      steps: [
          {
            id: "step_document",
            runId: run.id,
            type: "tool-result",
            status: "completed",
            title: "Document created: Launch brief",
            payload: {
              documentId: "document_123",
              title: "Launch brief",
              currentVersion: 1,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
    })

    expect(
      screen.getByRole("link", { name: "Open document" })
    ).toHaveAttribute("href", "/documents/document_123")
  })
})
