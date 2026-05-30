import { type ReactNode, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  DEFAULT_OPENAI_MODEL,
  type RuntimeHealth,
  type ThreadMode,
} from "@workspace/shared"
import type { ChatStatus } from "ai"
import type { IntegrationToolkit, ToolAccessGrant } from "@workspace/shared"
import { ToolAccessPicker } from "@/components/thread/tool-access-picker"

function ModeCheck({ active }: { active: boolean }) {
  return active ? (
    <HugeiconsIcon icon={Tick02Icon} className="mt-0.5 size-3.5" strokeWidth={2} />
  ) : (
    <span className="mt-0.5 size-3.5" aria-hidden="true" />
  )
}

function MenuLabel({ children }: { children: string }) {
  return <p className="px-2 py-1.5 text-xs text-muted-foreground">{children}</p>
}

function ModeMenuItem({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      className="flex min-h-7 w-full items-start gap-2 rounded-md px-2 py-1 text-left text-xs/relaxed outline-none hover:bg-foreground/10 disabled:pointer-events-none disabled:opacity-50"
      onClick={onClick}
    >
      <ModeCheck active={Boolean(active)} />
      {children}
    </button>
  )
}

type ThreadPromptComposerProps = {
  onSubmit: (prompt: string) => void | Promise<void>
  disabled?: boolean
  health: RuntimeHealth
  mode: ThreadMode
  onModeChange: (mode: ThreadMode) => void
  submitting?: boolean
  threadId?: string
  toolGrants?: ToolAccessGrant[]
  availableToolkits?: IntegrationToolkit[]
  onGrantTool?: (toolkitSlug: string) => void | Promise<void>
  onRevokeTool?: (grantId: string) => void | Promise<void>
}

export function ThreadPromptComposer({
  onSubmit,
  disabled,
  health,
  mode,
  onModeChange,
  submitting,
  threadId,
  toolGrants = [],
  availableToolkits = [],
  onGrantTool,
  onRevokeTool,
}: ThreadPromptComposerProps) {
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const [modeMenuPosition, setModeMenuPosition] = useState({ top: 8, right: 0 })
  const modeButtonRef = useRef<HTMLButtonElement | null>(null)
  const blockedReason = !health.available
    ? health.reason === "missing_api_key"
      ? "Add OPENAI_API_KEY to the repo root .env to enable model execution."
      : "Agent runtime is unavailable. Start the API with pnpm dev."
    : null

  const submitStatus: ChatStatus | undefined = submitting ? "submitted" : undefined

  useEffect(() => {
    if (!modeMenuOpen) return

    const updatePosition = () => {
      const rect = modeButtonRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuHeight = 430
      setModeMenuPosition({
        top: Math.max(
          8,
          Math.min(rect.top - menuHeight, window.innerHeight - menuHeight - 8)
        ),
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModeMenuOpen(false)
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [modeMenuOpen])

  const modeMenu = modeMenuOpen
    ? createPortal(
        <div
          role="menu"
          className="fixed z-50 max-h-[calc(100vh-1rem)] w-72 overflow-y-auto rounded-lg border border-border bg-popover/95 p-1 text-popover-foreground shadow-md"
          style={{ top: modeMenuPosition.top, right: modeMenuPosition.right }}
        >
          <MenuLabel>MODE</MenuLabel>
          <ModeMenuItem
            active={mode === "plan"}
            onClick={() => {
              onModeChange("plan")
              setModeMenuOpen(false)
            }}
          >
            <span className="flex flex-col gap-0.5">
              <span>Plan</span>
              <span className="text-muted-foreground text-[0.68rem] leading-snug">
                Think through an approach and ask before taking action.
              </span>
            </span>
          </ModeMenuItem>
          <ModeMenuItem
            active={mode === "agent"}
            onClick={() => {
              onModeChange("agent")
              setModeMenuOpen(false)
            }}
          >
            <span className="flex flex-col gap-0.5">
              <span>Execute</span>
              <span className="text-muted-foreground text-[0.68rem] leading-snug">
                Act immediately using the selected execute behavior.
              </span>
            </span>
          </ModeMenuItem>
          <div className="ml-7 mt-1 rounded-md border border-border/60 bg-background/40 p-1">
            <ModeMenuItem active={mode === "agent"} disabled>
              <span className="flex flex-col gap-0.5">
                <span>Auto</span>
                <span className="text-muted-foreground text-[0.68rem] leading-snug">
                  Run everything end-to-end without stopping.
                </span>
              </span>
            </ModeMenuItem>
            <ModeMenuItem disabled>
              <span className="flex flex-col gap-0.5">
                <span>Ask first</span>
                <span className="text-muted-foreground text-[0.68rem] leading-snug">
                  Pause for approval before sensitive actions.
                </span>
              </span>
            </ModeMenuItem>
          </div>
          <div className="-mx-1 my-1 h-px bg-border/50" />
          <MenuLabel>ACTIONS</MenuLabel>
          <ModeMenuItem disabled>Suggest learnings</ModeMenuItem>
          <ModeMenuItem disabled>Build skill</ModeMenuItem>
          <ModeMenuItem disabled>Give feedback</ModeMenuItem>
          <ModeMenuItem disabled>Run evaluation</ModeMenuItem>
        </div>,
        document.body
      )
    : null

  return (
    <div className="flex w-full flex-col gap-2">
      {blockedReason ? (
        <p className="text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
          {blockedReason}
        </p>
      ) : null}

      {threadId && onGrantTool && onRevokeTool ? (
        <ToolAccessPicker
          grants={toolGrants}
          availableToolkits={availableToolkits}
          disabled={disabled || submitting}
          onGrant={onGrantTool}
          onRevoke={onRevokeTool}
        />
      ) : null}

      <PromptInput
        className="shadow-sm"
        onSubmit={async (message) => {
          const text = message.text.trim()
          if (!disabled && !submitting && text) {
            await onSubmit(text)
          }
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea
            placeholder="What's the task?"
            disabled={disabled || submitting}
          />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputButton
              disabled
              tooltip="Attachments are not available in M02"
              aria-label="Add attachment (unavailable in M02)"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
            </PromptInputButton>
          </PromptInputTools>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                ref={modeButtonRef}
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={disabled || submitting}
                aria-haspopup="menu"
                aria-expanded={modeMenuOpen}
                onClick={() => setModeMenuOpen((open) => !open)}
              >
                {mode === "plan" ? "Plan" : "Execute"}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
              </Button>
              {modeMenu}
            </div>
            <span className="text-muted-foreground hidden text-xs sm:inline">
              {health.model ?? DEFAULT_OPENAI_MODEL}
            </span>
            <PromptInputSubmit
              status={submitStatus}
              disabled={disabled || submitting}
              aria-label="Send message"
            />
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
