import { Link, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { PageHeader } from "@/components/shell/page-header"
import { EmptyState } from "@/components/shell/empty-state"
import { formatRelativeTime, getAgent, getWorkspace } from "@/fixtures"

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const agent = agentId ? getAgent(agentId) : undefined
  const workspace = getWorkspace()

  if (!agent || agent.id === "command-center") {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState
          title="Agent not found"
          description="Choose an agent from the sidebar or Command Center roster."
          action={
            <Button render={<Link to="/command-center" />} variant="outline" size="sm">
              Command Center
            </Button>
          }
        />
      </div>
    )
  }

  const recentThreads = workspace.threads.filter((t) => t.agentId === agent.id)

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <PageHeader
          title={agent.name}
          description={agent.description}
          actions={
            <Button size="sm" disabled>
              + New thread
            </Button>
          }
        />
        <p className="text-muted-foreground -mt-4 text-xs">
          Last run{" "}
          {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "—"} · Last
          updated{" "}
          {agent.lastUpdatedAt ? formatRelativeTime(agent.lastUpdatedAt) : "—"}
        </p>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="identity" disabled>
              Identity
            </TabsTrigger>
            <TabsTrigger value="activity" disabled>
              Activity
            </TabsTrigger>
            <TabsTrigger value="model" disabled>
              Model
            </TabsTrigger>
            <TabsTrigger value="invocations" disabled>
              Invocations
            </TabsTrigger>
            <TabsTrigger value="tools" disabled>
              Tools
            </TabsTrigger>
            <TabsTrigger value="skills" disabled>
              Skills
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex flex-col gap-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Access</CardTitle>
                <CardDescription>
                  Only you can run this agent. It has full knowledge access.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="secondary">Personal</Badge>
                <Button variant="outline" size="sm" disabled>
                  Connect integrations
                </Button>
                <Button variant="outline" size="sm" disabled>
                  + Share to Slack
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent threads</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {recentThreads.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No threads yet.</p>
                ) : (
                  recentThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span>{thread.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {thread.status} · {formatRelativeTime(thread.updatedAt)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observability</CardTitle>
              </CardHeader>
              <CardContent>
                <EmptyState
                  title="No telemetry yet"
                  description="Usage, evaluations, and version history will appear here once the agent runs."
                  className="border-0 bg-transparent py-4"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Model</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{agent.model}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Invocations ({agent.invocations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {agent.invocations.map((inv) => (
              <span key={inv}>{inv}</span>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Integrations ({agent.integrationsCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            None connected
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tools ({agent.tools.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex max-h-48 flex-col gap-1 overflow-auto text-xs">
            {agent.tools.slice(0, 8).map((tool) => (
              <span key={tool}>{tool}</span>
            ))}
            {agent.tools.length > 8 ? (
              <span className="text-muted-foreground">
                +{agent.tools.length - 8} more
              </span>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Skills ({agent.skillsCount})</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">—</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Memory ({agent.memoriesCount})</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">—</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Library ({agent.libraryCount})</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">—</CardContent>
        </Card>
      </aside>
    </div>
  )
}
