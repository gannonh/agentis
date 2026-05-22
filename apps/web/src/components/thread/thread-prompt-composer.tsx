import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  ArrowDown01Icon,
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
  const blockedReason = !health.available
    ? health.reason === "missing_api_key"
      ? "Add OPENAI_API_KEY to the repo root .env to enable model execution."
      : "Agent runtime is unavailable. Start the API with pnpm dev."
    : null

  const submitStatus: ChatStatus | undefined = submitting ? "submitted" : undefined

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onModeChange(mode === "plan" ? "agent" : "plan")}
              disabled={disabled || submitting}
            >
              {mode === "plan" ? "Plan" : "Agent"}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="size-3.5"
                strokeWidth={2}
              />
            </Button>
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
