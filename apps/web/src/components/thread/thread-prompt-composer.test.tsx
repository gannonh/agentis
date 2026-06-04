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
  onExecuteBehaviorChange?: (behavior: "auto" | "ask") => void
}) {
  return render(
    <ThreadPromptComposer
      onSubmit={vi.fn()}
      health={health}
      mode={input?.mode ?? "plan"}
      onModeChange={input?.onModeChange ?? vi.fn()}
      executeBehavior="auto"
      onExecuteBehaviorChange={input?.onExecuteBehaviorChange ?? vi.fn()}
      submitting={input?.submitting}
    />
  )
}

describe("ThreadPromptComposer", () => {
  it("points missing Vercel runtime credentials to the Vercel Gateway key", () => {
    render(
      <ThreadPromptComposer
        onSubmit={vi.fn()}
        health={{
          available: false,
          reason: "missing_api_key",
          aiGatewayProvider: "vercel",
        }}
        mode="plan"
        onModeChange={vi.fn()}
        executeBehavior="auto"
        onExecuteBehaviorChange={vi.fn()}
      />
    )

    expect(screen.getByText(/VERCEL_AI_GATEWAY_API_KEY/)).toBeInTheDocument()
    expect(screen.queryByText(/OPENAI_API_KEY/)).not.toBeInTheDocument()
  })

  it("points missing Cloudflare runtime credentials to Cloudflare vars", () => {
    render(
      <ThreadPromptComposer
        onSubmit={vi.fn()}
        health={{
          available: false,
          reason: "missing_api_key",
          aiGatewayProvider: "cloudflare",
        }}
        mode="plan"
        onModeChange={vi.fn()}
        executeBehavior="auto"
        onExecuteBehaviorChange={vi.fn()}
      />
    )

    expect(screen.getByText(/CLOUDFLARE_API_KEY/)).toBeInTheDocument()
    expect(screen.getByText(/CLOUDFLARE_ACCOUNT_ID/)).toBeInTheDocument()
  })

  it("labels modes as Plan and Execute", () => {
    const { rerender } = render(
      <ThreadPromptComposer
        onSubmit={vi.fn()}
        health={health}
        mode="plan"
        onModeChange={vi.fn()}
        executeBehavior="auto"
        onExecuteBehaviorChange={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /plan/i })).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /plan first/i })
    ).not.toBeInTheDocument()

    rerender(
      <ThreadPromptComposer
        onSubmit={vi.fn()}
        health={health}
        mode="agent"
        onModeChange={vi.fn()}
        executeBehavior="auto"
        onExecuteBehaviorChange={vi.fn()}
      />
    )

    expect(screen.getByRole("button", { name: /execute/i })).toBeInTheDocument()
  })

  it("opens a two-level shadcn mode selector with execute behavior choices", async () => {
    const user = userEvent.setup()
    renderComposer({ mode: "agent" })

    await user.click(screen.getByRole("button", { name: /mode execute auto/i }))

    expect(await screen.findByText("Execute behavior")).toBeInTheDocument()
    expect(
      screen.getByRole("menuitemcheckbox", { name: /plandraft/i })
    ).toHaveAttribute("aria-checked", "false")
    expect(
      screen.getByRole("menuitemcheckbox", { name: /executerun/i })
    ).toHaveAttribute("aria-checked", "true")
    expect(
      screen.getByRole("menuitemcheckbox", { name: /autoapply/i })
    ).toHaveAttribute("aria-checked", "true")
    expect(
      screen.getByRole("menuitemcheckbox", { name: /ask firstapproval/i })
    ).toHaveAttribute("aria-checked", "false")
    expect(screen.getByText("Actions")).toBeInTheDocument()
    expect(
      screen.getByRole("menuitem", { name: /suggest learnings/i })
    ).toHaveAttribute("data-disabled")
    expect(
      screen.getByRole("menuitem", { name: /build skill/i })
    ).toHaveAttribute("data-disabled")
    expect(
      screen.getByRole("menuitem", { name: /give feedback/i })
    ).toHaveAttribute("data-disabled")
    expect(
      screen.getByRole("menuitem", { name: /run evaluation/i })
    ).toHaveAttribute("data-disabled")
  })

  it("keeps the mode menu available after a submitted turn settles", async () => {
    const user = userEvent.setup()
    const onModeChange = vi.fn()
    renderComposer({ mode: "agent", submitting: false, onModeChange })

    await user.click(screen.getByRole("button", { name: /mode execute auto/i }))
    await user.click(
      await screen.findByRole("menuitemcheckbox", { name: /plandraft/i })
    )

    expect(onModeChange).toHaveBeenCalledWith("plan")
  })
})
