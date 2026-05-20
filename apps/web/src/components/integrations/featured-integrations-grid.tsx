import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon } from "@hugeicons/core-free-icons"
import { IntegrationCard } from "@/components/integrations/integration-card"
import type { Integration } from "@/fixtures/schema"

type FeaturedIntegrationsGridProps = {
  integrations: Integration[]
}

export function FeaturedIntegrationsGrid({ integrations }: FeaturedIntegrationsGridProps) {
  if (integrations.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm">
        No integrations match your search.
      </p>
    )
  }

  return (
    <section aria-labelledby="featured-integrations-heading">
      <div className="mb-3 flex items-center gap-1.5">
        <HugeiconsIcon
          icon={StarIcon}
          className="text-status-warning-foreground size-3.5"
          strokeWidth={2}
          aria-hidden
        />
        <h2 id="featured-integrations-heading" className="text-sm font-medium">
          Featured
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </section>
  )
}
