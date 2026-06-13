import { HugeiconsIcon } from "@hugeicons/react"
import { StarIcon, Tick01Icon } from "@hugeicons/core-free-icons"
import type { IntegrationToolkit } from "@workspace/shared"
import { IntegrationCard } from "@/components/integrations/integration-card"

type IntegrationsGridVariant = "featured" | "in-use"

const GRID_SECTIONS: Record<
  IntegrationsGridVariant,
  {
    title: string
    headingId: string
    icon: typeof StarIcon
    iconClassName: string
  }
> = {
  featured: {
    title: "Featured",
    headingId: "featured-integrations-heading",
    icon: StarIcon,
    iconClassName: "text-status-warning-foreground size-3.5",
  },
  "in-use": {
    title: "Connected",
    headingId: "connected-integrations-heading",
    icon: Tick01Icon,
    iconClassName: "text-status-success-foreground size-3.5",
  },
}

type FeaturedIntegrationsGridProps = {
  integrations: IntegrationToolkit[]
  composioConfigured: boolean
  title?: string
  headingId?: string
  variant?: IntegrationsGridVariant
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

  const section = GRID_SECTIONS[variant]
  const sectionTitle = title ?? section.title
  const sectionHeadingId = headingId ?? section.headingId

  return (
    <section aria-labelledby={sectionHeadingId}>
      <div className="mb-3 flex items-center gap-1.5">
        <HugeiconsIcon
          icon={section.icon}
          className={section.iconClassName}
          strokeWidth={2}
          aria-hidden
        />
        <h2 id={sectionHeadingId} className="text-sm font-medium">
          {sectionTitle}
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
