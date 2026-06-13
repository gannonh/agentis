import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import type { IntegrationToolkit } from "@workspace/shared"
import { IntegrationCard } from "@/components/integrations/integration-card"

type FeaturedIntegrationsGridProps = {
  integrations: IntegrationToolkit[]
  composioConfigured: boolean
  title?: string
  headingId?: string
  variant?: "featured" | "connected"
  onConnect?: (slug: string) => void
  onReset?: (slug: string) => void
  connectingSlug?: string | null
  resettingSlug?: string | null
}

export function FeaturedIntegrationsGrid({
  integrations,
  composioConfigured,
  title,
  headingId,
  variant = "featured",
  onConnect,
  onReset,
  connectingSlug,
  resettingSlug,
}: FeaturedIntegrationsGridProps) {
  if (integrations.length === 0) {
    return null
  }

  const resolvedTitle = title ?? (variant === "connected" ? "Connected" : "Featured")
  const resolvedHeadingId =
    headingId ??
    (variant === "connected"
      ? "connected-integrations-heading"
      : "featured-integrations-heading")
  const icon = variant === "connected" ? Tick01Icon : StarIcon
  const iconClassName =
    variant === "connected"
      ? "text-status-success-foreground size-3.5"
      : "text-status-warning-foreground size-3.5"

  return (
    <section aria-labelledby={resolvedHeadingId}>
      <div className="mb-3 flex items-center gap-1.5">
        <HugeiconsIcon
          icon={icon}
          className={iconClassName}
          strokeWidth={2}
          aria-hidden
        />
        <h2 id={resolvedHeadingId} className="text-sm font-medium">
          {resolvedTitle}
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.slug}
            integration={integration}
            composioConfigured={composioConfigured}
            onConnect={onConnect}
            onReset={onReset}
            connecting={connectingSlug === integration.slug}
            resetting={resettingSlug === integration.slug}
          />
        ))}
      </div>
    </section>
  )
}
