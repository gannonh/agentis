import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  AiIdeaIcon,
  AiSecurityIcon,
  ArrowDown01Icon,
  BulbIcon,
  ChartEvaluationIcon,
  ChatFeedbackIcon,
  CheckListIcon,
  FlashIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input"
import { useEffect } from "react"
import {
  DEFAULT_GATEWAY_MODEL,
  GATEWAY_MODEL_TIER_LABELS,
  type GatewayModelTier,
  type IntegrationToolkit,
  type RuntimeHealth,
  type ThreadMode,
  type ToolAccessGrant,
} from "@workspace/shared"
import type { ChatStatus } from "ai"
import { ToolAccessPicker } from "@/components/thread/tool-access-picker"

function MenuItemText({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span>{title}</span>
      <span className="text-[0.68rem] leading-snug text-muted-foreground">
        {description}
      </span>
    </span>
  )
}

type ExecuteBehavior = "auto" | "ask"

const MODEL_TIER_ORDER: GatewayModelTier[] = [
  "fast",
  "balanced",
  "capable",
  "open",
]

type ThreadPromptComposerProps = {
  onSubmit: (prompt: string) => void | Promise<void>
  disabled?: boolean
  health: RuntimeHealth
  mode: ThreadMode
  onModeChange: (mode: ThreadMode) => void
  executeBehavior: ExecuteBehavior
  onExecuteBehaviorChange: (behavior: ExecuteBehavior) => void
  submitting?: boolean
  toolGrants?: ToolAccessGrant[]
  availableToolkits?: IntegrationToolkit[]
  onGrantTool?: (toolkitSlug: string) => void | Promise<void>
  onRevokeTool?: (grantId: string) => void | Promise<void>
  selectedModel?: string
  onModelChange?: (modelId: string) => void
  promptDraft?: { id: string; text: string }
}

function PromptInputDraftSync({
  promptDraft,
}: {
  promptDraft?: { id: string; text: string }
}) {
  const controller = usePromptInputController()

  useEffect(() => {
    if (!promptDraft) return
    controller.textInput.setInput(promptDraft.text)
    // Sync when quick-action draft changes, not when the prompt controller updates per keystroke.
  }, [promptDraft])

  return null
}

export function ThreadPromptComposer({
  onSubmit,
  disabled,
  health,
  mode,
  onModeChange,
  executeBehavior,
  onExecuteBehaviorChange,
  submitting,
  toolGrants = [],
  availableToolkits = [],
  onGrantTool,
  onRevokeTool,
  selectedModel,
  onModelChange,
  promptDraft,
}: ThreadPromptComposerProps) {
  let blockedReason: string | null = null
  if (!health.available) {
    blockedReason =
      health.reason === "missing_api_key"
        ? health.aiGatewayProvider === "cloudflare"
          ? "Add CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID to the repo root .env to enable model execution."
          : "Add VERCEL_AI_GATEWAY_API_KEY to the repo root .env to enable model execution."
        : "Agent runtime is unavailable. Start the API with pnpm dev."
  }

  const submitStatus: ChatStatus | undefined = submitting
    ? "submitted"
    : undefined
  const modeLabel = mode === "plan" ? "Plan" : "Execute"
  const executeBehaviorLabel = executeBehavior === "auto" ? "Auto" : "Ask"
  const modeAriaLabel =
    mode === "agent"
      ? `Mode Execute ${executeBehavior === "auto" ? "Auto" : "Ask first"}`
      : "Mode Plan"

  const modelOptions = health.models ?? []
  const activeModelId =
    selectedModel ?? health.defaultModel ?? health.model ?? DEFAULT_GATEWAY_MODEL
  const activeModelLabel =
    modelOptions.find((option) => option.id === activeModelId)?.label ??
    activeModelId
  const modelPickerEnabled =
    Boolean(onModelChange) && modelOptions.length > 0 && !blockedReason

  return (
    <div className="flex w-full flex-col gap-2">
      {blockedReason ? (
        <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {blockedReason}
        </p>
      ) : null}

      {onGrantTool && onRevokeTool ? (
        <ToolAccessPicker
          grants={toolGrants}
          availableToolkits={availableToolkits}
          disabled={disabled || submitting}
          onGrant={onGrantTool}
          onRevoke={onRevokeTool}
        />
      ) : null}

      <PromptInputProvider>
        <PromptInputDraftSync promptDraft={promptDraft} />
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
              <HugeiconsIcon
                icon={Add01Icon}
                className="size-4"
                strokeWidth={2}
              />
            </PromptInputButton>
          </PromptInputTools>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-2 px-2.5"
                    disabled={disabled || submitting}
                    aria-label={modeAriaLabel}
                  />
                }
              >
                <span className="text-muted-foreground">Mode</span>
                <span>{modeLabel}</span>
                {mode === "agent" ? (
                  <span className="text-muted-foreground">
                    · {executeBehaviorLabel}
                  </span>
                ) : null}
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  data-icon="inline-end"
                  strokeWidth={2}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="w-72"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Mode</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={mode === "plan"}
                    onCheckedChange={(checked) => {
                      if (checked) onModeChange("plan")
                    }}
                  >
                    <HugeiconsIcon
                      icon={AiIdeaIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <MenuItemText
                      title="Plan"
                      description="Draft the approach and request approval before workspace edits."
                    />
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={mode === "agent"}
                    onCheckedChange={(checked) => {
                      if (checked) onModeChange("agent")
                    }}
                  >
                    <HugeiconsIcon
                      icon={FlashIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <MenuItemText
                      title="Execute"
                      description="Run the task using the selected execution behavior."
                    />
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Execute behavior</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={mode === "agent" && executeBehavior === "auto"}
                    onCheckedChange={(checked) => {
                      if (!checked) return
                      onExecuteBehaviorChange("auto")
                      onModeChange("agent")
                    }}
                  >
                    <HugeiconsIcon
                      icon={FlashIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <MenuItemText
                      title="Auto"
                      description="Apply allowed changes without stopping for each tool."
                    />
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={mode === "agent" && executeBehavior === "ask"}
                    disabled
                  >
                    <HugeiconsIcon
                      icon={AiSecurityIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <MenuItemText
                      title="Ask first"
                      description="Approval-gated execute mode. Coming soon."
                    />
                  </DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem disabled>
                    <HugeiconsIcon
                      icon={BulbIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    Suggest learnings
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <HugeiconsIcon
                      icon={CheckListIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    Build skill
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <HugeiconsIcon
                      icon={ChatFeedbackIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    Give feedback
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <HugeiconsIcon
                      icon={ChartEvaluationIcon}
                      strokeWidth={2}
                      aria-hidden
                    />
                    Run evaluation
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {modelPickerEnabled ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 max-w-44 gap-2 px-2.5"
                      disabled={disabled || submitting}
                      aria-label={`Model ${activeModelLabel}`}
                    />
                  }
                >
                  <span className="text-muted-foreground">Model</span>
                  <span className="truncate">{activeModelLabel}</span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    data-icon="inline-end"
                    strokeWidth={2}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="top"
                  sideOffset={8}
                  className="w-80"
                >
                  {MODEL_TIER_ORDER.map((tier) => {
                    const tierOptions = modelOptions.filter(
                      (option) => option.tier === tier
                    )
                    if (tierOptions.length === 0) return null
                    return (
                      <DropdownMenuGroup key={tier}>
                        <DropdownMenuLabel>
                          {GATEWAY_MODEL_TIER_LABELS[tier]}
                        </DropdownMenuLabel>
                        {tierOptions.map((option) => (
                          <DropdownMenuCheckboxItem
                            key={option.id}
                            checked={option.id === activeModelId}
                            onCheckedChange={(checked) => {
                              if (checked) onModelChange?.(option.id)
                            }}
                          >
                            <MenuItemText
                              title={option.label}
                              description={option.id}
                            />
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuGroup>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {activeModelLabel}
              </span>
            )}
            <PromptInputSubmit
              status={submitStatus}
              disabled={disabled || submitting}
              aria-label="Send message"
            />
          </div>
        </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  )
}
