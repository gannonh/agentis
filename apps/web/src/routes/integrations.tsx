import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { ConnectionStatusPanel } from "@/components/integrations/connection-status-panel"
import { FeaturedIntegrationsGrid } from "@/components/integrations/featured-integrations-grid"
import { IntegrationInfoCards } from "@/components/integrations/integration-info-cards"
import { IntegrationNoticeBanner } from "@/components/integrations/integration-notice-banner"
import { IntegrationsBackNav } from "@/components/integrations/integrations-back-nav"
import { IntegrationsSearch } from "@/components/integrations/integrations-search"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { getWorkspace } from "@/fixtures"

export function IntegrationsPage() {
  const workspace = getWorkspace()
  const [query, setQuery] = useState("")

  const featuredIntegrations = useMemo(() => {
    const featured = workspace.integrations.filter((integration) => integration.featured)
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return featured
    }
    return featured.filter(
      (integration) =>
        integration.name.toLowerCase().includes(normalized) ||
        integration.description.toLowerCase().includes(normalized)
    )
  }, [query, workspace.integrations])

  const connectedNames = useMemo(
    () =>
      workspace.integrations
        .filter((integration) => integration.status === "connected")
        .map((integration) => integration.name),
    [workspace.integrations]
  )

  return (
    <PageLayout className="gap-6">
      <IntegrationsBackNav />

      <PageHeader
        title="Integrations"
        description="Connect services and data warehouses for your agent."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" disabled>
            <HugeiconsIcon icon={RefreshIcon} className="size-3.5" strokeWidth={2} aria-hidden />
            Refresh
          </Button>
        }
      />

      {workspace.integrationNotice ? (
        <IntegrationNoticeBanner message={workspace.integrationNotice.message} />
      ) : null}

      <IntegrationInfoCards />

      <ConnectionStatusPanel
        connectedCount={workspace.connectedIntegrations}
        connectedNames={connectedNames}
      />

      <IntegrationsSearch value={query} onChange={setQuery} />

      <FeaturedIntegrationsGrid integrations={featuredIntegrations} />
    </PageLayout>
  )
}
