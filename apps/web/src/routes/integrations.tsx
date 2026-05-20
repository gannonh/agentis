import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { PageHeader } from "@/components/shell/page-header"
import { getWorkspace } from "@/fixtures"

const statusLabel: Record<string, string> = {
  connected: "Connected",
  oauth_required: "OAuth required",
  not_configured: "Not configured",
  not_connected: "Not connected",
}

export function IntegrationsPage() {
  const workspace = getWorkspace()
  const featured = workspace.integrations.slice(0, 12)

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        title="Integrations"
        description="Connect services and data warehouses for your agent."
        actions={
          <Button variant="outline" size="sm" disabled>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent tools</CardTitle>
            <CardDescription>
              Integrations let agents interact with external services. Enable them
              in the thread toolbar or agent configuration.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invocations</CardTitle>
            <CardDescription>
              Trigger agents from Slack or on a schedule without opening the web
              UI.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm">
          <span className="font-medium">{workspace.connectedIntegrations}</span>{" "}
          connected
        </p>
        <Input
          placeholder="Search integrations…"
          className="max-w-xs"
          disabled
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((integration) => (
          <Card key={integration.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <CardDescription className="line-clamp-2 text-xs">
                {integration.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-xs">
                {statusLabel[integration.status]}
              </Badge>
              <Button size="sm" variant="outline" disabled>
                {integration.status === "not_configured" ? "Configure" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            All integrations (985 available)
          </h2>
          <Button variant="link" className="h-auto p-0 text-xs" disabled>
            Expand all
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {workspace.integrationCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
            >
              <span>{category.name}</span>
              <span className="text-muted-foreground text-xs">
                {category.count} integrations
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
