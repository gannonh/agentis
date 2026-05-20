import { HugeiconsIcon } from "@hugeicons/react"
import {
  LinkSquare01Icon,
  Settings01Icon,
  Tick01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { IntegrationMark } from "@/lib/integration-mark"
import type { Integration } from "@/fixtures/schema"
import { cn } from "@workspace/ui/lib/utils"

function integrationStatusLabel(integration: Integration): string {
  if (integration.status === "connected" && integration.connectedAccounts) {
    const count = integration.connectedAccounts
    return count === 1 ? "1 connected account" : `${count} connected accounts`
  }
  if (integration.status === "oauth_required") {
    return "OAuth required"
  }
  if (integration.status === "not_configured") {
    return "Not configured"
  }
  return "Not connected"
}

function integrationAction(integration: Integration): "manage" | "configure" | "connect" {
  if (integration.status === "connected") {
    return "manage"
  }
  if (integration.status === "not_configured" && integration.id === "databricks") {
    return "configure"
  }
  return "connect"
}

const actionCopy = {
  manage: "Manage",
  configure: "Configure",
  connect: "Connect",
} as const

type IntegrationCardProps = {
  integration: Integration
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
  const isConnected = integration.status === "connected"
  const action = integrationAction(integration)

  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border bg-card p-4",
        isConnected ? "border-emerald-500/35" : "border-border"
      )}
    >
      {isConnected ? (
        <HugeiconsIcon
          icon={Tick01Icon}
          className="absolute top-3 right-3 size-4 text-emerald-600 dark:text-emerald-500"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}

      <div className="flex items-start gap-3 pr-6">
        <IntegrationMark integrationId={integration.id} />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-sm font-medium">{integration.name}</h3>
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {integration.description}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{integrationStatusLabel(integration)}</p>
        <Button
          size="sm"
          variant={action === "configure" ? "outline" : "secondary"}
          className="shrink-0 gap-1.5"
          disabled
        >
          {action === "manage" ? (
            <HugeiconsIcon icon={Settings01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
          ) : null}
          {action === "configure" ? (
            <HugeiconsIcon icon={Wrench01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
          ) : null}
          {action === "connect" ? (
            <HugeiconsIcon icon={LinkSquare01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
          ) : null}
          {actionCopy[action]}
        </Button>
      </div>
    </article>
  )
}
