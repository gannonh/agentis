import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { ConnectionStatusPanel } from "@/components/integrations/connection-status-panel"
import { FeaturedIntegrationsGrid } from "@/components/integrations/featured-integrations-grid"
import { IntegrationInfoIntro } from "@/components/integrations/integration-info-intro"
import { IntegrationNoticeBanner } from "@/components/integrations/integration-notice-banner"
import { IntegrationsBackNav } from "@/components/integrations/integrations-back-nav"
import { IntegrationsSearch } from "@/components/integrations/integrations-search"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { useIntegrations } from "@/hooks/use-integrations"

export function IntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null)
  const [resettingSlug, setResettingSlug] = useState<string | null>(null)
  const {
    toolkits,
    composioConfigured,
    composioMockEnabled,
    loading,
    error,
    notice,
    setNotice,
    connect,
    refreshStatuses,
    resetConnection,
  } = useIntegrations()

  useEffect(() => {
    const connected = searchParams.get("connected")
    const callbackError = searchParams.get("error")
    if (connected) {
      setNotice(`Successfully connected ${connected.replace(/-/g, " ")}!`)
      setSearchParams({}, { replace: true })
    } else if (callbackError) {
      setNotice(`Connection failed: ${callbackError}`)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setNotice, setSearchParams])

  const featuredIntegrations = useMemo(() => {
    const featured = toolkits.filter((integration) => integration.featured)
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return featured
    }
    return featured.filter(
      (integration) =>
        integration.name.toLowerCase().includes(normalized) ||
        integration.description.toLowerCase().includes(normalized)
    )
  }, [query, toolkits])

  const connectedNames = useMemo(
    () =>
      toolkits
        .filter((integration) => integration.status === "connected")
        .map((integration) => integration.name),
    [toolkits]
  )

  const handleConnect = async (slug: string) => {
    setConnectingSlug(slug)
    try {
      await connect(slug)
    } finally {
      setConnectingSlug(null)
    }
  }

  const handleReset = async (slug: string) => {
    setResettingSlug(slug)
    try {
      await resetConnection(slug)
    } finally {
      setResettingSlug(null)
    }
  }

  const setupNotice =
    !composioConfigured && !composioMockEnabled
      ? "Add COMPOSIO_API_KEY and COMPOSIO_REDIRECT_BASE_URL to the repo root .env, or set AGENTIS_MOCK_COMPOSIO=1 for local demos."
      : null

  const mockNotice = composioMockEnabled
    ? "Demo mode: connections here are simulated from test data, not your real GitHub or Slack accounts. Restart the API without AGENTIS_MOCK_COMPOSIO=1 for live Composio."
    : null

  return (
    <PageLayout className="gap-6">
      <IntegrationsBackNav />

      <PageHeader
        title="Integrations"
        description="Connect services and data warehouses for your agent."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loading || (!composioConfigured && !composioMockEnabled)}
            onClick={() => void refreshStatuses()}
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-3.5" strokeWidth={2} aria-hidden />
            Refresh
          </Button>
        }
      />

      {notice ? <IntegrationNoticeBanner message={notice} /> : null}
      {setupNotice ? (
        <p className="text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
          {setupNotice}
        </p>
      ) : null}
      {mockNotice ? (
        <p className="text-muted-foreground rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
          {mockNotice}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading integrations…</p>
      ) : null}

      <IntegrationInfoIntro />

      <ConnectionStatusPanel
        connectedCount={connectedNames.length}
        connectedNames={connectedNames}
      />

      <IntegrationsSearch value={query} onChange={setQuery} />

      <FeaturedIntegrationsGrid
        integrations={featuredIntegrations}
        composioConfigured={composioConfigured}
        onConnect={(slug) => void handleConnect(slug)}
        onReset={(slug) => void handleReset(slug)}
        connectingSlug={connectingSlug}
        resettingSlug={resettingSlug}
      />
    </PageLayout>
  )
}
