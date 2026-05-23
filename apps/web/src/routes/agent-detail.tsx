import { useEffect, useState } from "react"
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
import { PageHeader } from "@/components/shell/page-header"
import type { AgentDetailResponse } from "@workspace/shared"
import { getAgent as getFixtureAgent, getWorkspace } from "@/fixtures"
import type { Agent } from "@/fixtures/schema"
import { getAgent as getApiAgent } from "@/lib/api/agents-client"

function mapApiAgentDetailToAgent(detail: AgentDetailResponse): Agent {
  return {
    id: detail.agent.id,
    name: detail.agent.name,
    description: detail.agent.description ?? "",
    icon: "search",
    model: detail.agent.model,
    lastUpdatedAt: detail.agent.updatedAt,
    runCount: 0,
    qualityScore: null,
    totalCost: 0,
    tools: detail.toolGrants.map((grant) => grant.toolkitSlug),
    invocations: [],
    skillsCount: 0,
    memoriesCount: 0,
    libraryCount: 0,
    integrationsCount: detail.toolGrants.length,
  }
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const fixtureAgent = agentId ? getFixtureAgent(agentId) : undefined
  const [apiAgent, setApiAgent] = useState<Agent | null>(null)
  const [loadingApiAgent, setLoadingApiAgent] = useState(false)
  const [apiAgentNotFound, setApiAgentNotFound] = useState(false)
  const workspace = getWorkspace()

  useEffect(() => {
    if (!agentId || fixtureAgent || agentId === "command-center") {
      setApiAgent(null)
      setApiAgentNotFound(false)
      setLoadingApiAgent(false)
      return
    }

    let canceled = false
    setApiAgent(null)
    setApiAgentNotFound(false)
    setLoadingApiAgent(true)

    getApiAgent(agentId)
      .then((detail) => {
        if (!canceled) setApiAgent(mapApiAgentDetailToAgent(detail))
      })
      .catch(() => {
        if (!canceled) setApiAgentNotFound(true)
      })
      .finally(() => {
        if (!canceled) setLoadingApiAgent(false)
      })

    return () => {
      canceled = true
    }
  }, [agentId, fixtureAgent])

  const agent = fixtureAgent ?? apiAgent

  if (loadingApiAgent) {
    return (
      <PageLayout variant="narrow">
        <PageHeader
          title="Loading agent"
          description="Loading the agent configuration from the API."
        />
      </PageLayout>
    )
  }

  if (!agent || agent.id === "command-center" || apiAgentNotFound) {
    return (
      <PageLayout variant="narrow">
        <PageHeader
          title="Agent not found"
          description="Choose an agent from the sidebar or Command Center roster."
        />
        <Button
          render={<Link to="/command-center" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          Command Center
        </Button>
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
