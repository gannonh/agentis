import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Alert02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { Badge } from "@workspace/ui/components/badge"
import type { NeedsAttentionItem } from "@/fixtures/schema"
import { cn } from "@workspace/ui/lib/utils"

type NeedsAttentionPanelProps = {
  items: NeedsAttentionItem[]
  pendingCount: number
}

function attentionItemHref(item: NeedsAttentionItem): string {
  if (item.agentId) {
    return `/agents/${item.agentId}`
  }
  return "/command-center"
}

export function NeedsAttentionPanel({ items, pendingCount }: NeedsAttentionPanelProps) {
  const summaryLabel =
    pendingCount === 1 ? "1 pending improvement" : `${pendingCount} pending improvements`

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border bg-card"
      aria-labelledby="needs-attention-heading"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <HugeiconsIcon
          icon={Alert02Icon}
          className="text-status-warning-foreground size-4"
          strokeWidth={2}
          aria-hidden
        />
        <h2 id="needs-attention-heading" className="text-sm font-medium">
          Needs attention
        </h2>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-muted-foreground flex items-center justify-between text-xs font-medium">
          <span>{summaryLabel}</span>
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
        </p>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nothing needs review right now.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={attentionItemHref(item)}
                  className={cn(
                    "flex flex-col gap-2 rounded-md border border-border p-3 text-sm transition-colors",
                    "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <span className="line-clamp-2 leading-snug">{item.title}</span>
                  <Badge variant="secondary" className="w-fit text-xs">
                    {item.tag}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
