import { HugeiconsIcon } from "@hugeicons/react"
import {
  LinkSquare01Icon,
  Settings01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons"
import type { IntegrationToolkit } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { IntegrationMark } from "@/lib/integration-mark"
import { cn } from "@workspace/ui/lib/utils"

function integrationStatusLabel(integration: IntegrationToolkit): string {
  if (integration.status === "connected") {
    const count = integration.connectedAccountCount
    return count === 1 ? "1 connected account" : `${count} connected accounts`
  }
  if (integration.status === "pending") {
    return "Connection pending"
  }
  if (integration.status === "expired") {
    return "Connection expired"
  }
  if (integration.status === "error") {
    return "Connection error"
  }
  return "Not connected"
}

type IntegrationCardProps = {
  integration: IntegrationToolkit
  composioConfigured: boolean
  onConnect?: (slug: string) => void
  onReset?: (slug: string) => void
  connecting?: boolean
  resetting?: boolean
}

export function IntegrationCard({
  integration,
  composioConfigured,
  onConnect,
  onReset,
  connecting,
  resetting,
}: IntegrationCardProps) {
  const isConnected = integration.status === "connected"
  const isPending = integration.status === "pending"
  const canReset =
    isPending || integration.status === "error" || integration.status === "expired"
  const action = isConnected ? "manage" : "connect"
  const connectLabel = connecting
    ? "Connecting…"
    : isPending
      ? "Continue setup"
      : "Connect"

  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border bg-card p-4",
        isConnected ? "border-status-success-border" : "border-border"
      )}
    >
      {isConnected ? (
        <HugeiconsIcon
          icon={Tick01Icon}
          className="absolute top-3 right-3 size-4 text-status-success-foreground"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}

      <div className="flex items-start gap-3 pr-6">
        <IntegrationMark integrationId={integration.slug} />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-sm font-medium">{integration.name}</h3>
          <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {integration.description}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {integrationStatusLabel(integration)}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {canReset && onReset ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              disabled={resetting || connecting}
              onClick={() => onReset(integration.slug)}
            >
              {resetting ? "Resetting…" : "Reset"}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant={action === "manage" ? "outline" : "secondary"}
            className="gap-1.5"
            disabled={
              action === "connect" && (!composioConfigured || connecting || resetting)
            }
            onClick={() => {
              if (action === "connect" && onConnect) {
                onConnect(integration.slug)
              }
            }}
          >
            {action === "manage" ? (
              <HugeiconsIcon icon={Settings01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
            ) : (
              <HugeiconsIcon icon={LinkSquare01Icon} className="size-3.5" strokeWidth={2} aria-hidden />
            )}
            {action === "manage" ? "Manage" : connectLabel}
          </Button>
        </div>
      </div>
    </article>
  )
}
