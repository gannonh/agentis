import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import type { CommandCenterNeedsAttentionItem } from "@workspace/shared"
import { cn } from "@workspace/ui/lib/utils"

type NeedsAttentionPanelProps = {
  items: CommandCenterNeedsAttentionItem[]
  pendingCount: number
  error?: string | null
  actionError?: string | null
  onDismiss?: (item: CommandCenterNeedsAttentionItem) => void
}

function actionLabel(item: CommandCenterNeedsAttentionItem): string {
  return item.type === "pending_learning_suggestion" ? "Review" : "Open thread"
}

export function NeedsAttentionPanel({
  items,
  pendingCount,
  error,
  actionError,
  onDismiss,
}: NeedsAttentionPanelProps) {
  const summaryLabel =
    pendingCount === 1
      ? "1 item needs review"
      : `${pendingCount} items need review`

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border bg-card"
      aria-labelledby="needs-attention-heading"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <HugeiconsIcon
          icon={Alert02Icon}
          className="size-4 text-status-warning-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <h2 id="needs-attention-heading" className="text-sm font-medium">
          Needs attention
        </h2>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <>
            <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{summaryLabel}</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden
              />
            </p>

            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing needs review right now.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-md border border-border p-3 text-sm",
                      item.severity === "critical" && "border-destructive/40"
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-2 leading-snug">
                        {item.title}
                      </span>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="w-fit text-xs">
                        {item.tag}
                      </Badge>
                      <Link
                        to={item.href}
                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {actionLabel(item)}
                      </Link>
                      {item.dismissible ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-muted-foreground"
                          onClick={() => onDismiss?.(item)}
                        >
                          Dismiss
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {actionError ? (
              <p className="text-xs text-destructive">{actionError}</p>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
