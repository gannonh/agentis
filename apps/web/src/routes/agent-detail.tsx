import { Link, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { AgentDetailHero } from "@/components/agent-detail/agent-detail-hero"
import { AgentDetailInspector } from "@/components/agent-detail/agent-detail-inspector"
import { AgentOverviewTab } from "@/components/agent-detail/agent-overview-tab"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import { getAgent, getWorkspace } from "@/fixtures"

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const agent = agentId ? getAgent(agentId) : undefined
  const workspace = getWorkspace()

  if (!agent || agent.id === "command-center") {
    return (
      <PageLayout variant="narrow">
        <EmptyState
          title="Agent not found"
          description="Choose an agent from the sidebar or Command Center roster."
          action={
            <Button render={<Link to="/command-center" />} variant="outline" size="sm">
              Command Center
            </Button>
          }
        />
      </PageLayout>
    )
  }

  const recentThreads = workspace.threads.filter((t) => t.agentId === agent.id)

  return (
    <PageLayout>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <AgentDetailHero agent={agent} />

          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start overflow-x-auto">
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
            <TabsContent value="overview" className="pt-4">
              <AgentOverviewTab recentThreads={recentThreads} />
            </TabsContent>
          </Tabs>
        </div>

        <AgentDetailInspector agent={agent} />
      </div>
    </PageLayout>
  )
}
