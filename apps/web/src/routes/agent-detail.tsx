import { useCallback, useEffect, useState } from "react"
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
import { ApiError } from "@/lib/api/client"

function mapApiAgentDetailToAgent(detail: AgentDetailResponse): Agent {
  return {
    id: detail.agent.id,
    name: detail.agent.name,
    description: detail.agent.description?.trim() || "No description yet",
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
  const shouldLoadApiAgent =
    !!agentId && !fixtureAgent && agentId !== "command-center"
  const [apiAgent, setApiAgent] = useState<Agent | null>(null)
  const [loadingApiAgent, setLoadingApiAgent] = useState(shouldLoadApiAgent)
  const [apiAgentNotFound, setApiAgentNotFound] = useState(false)
  const [apiAgentLoadFailed, setApiAgentLoadFailed] = useState(false)
  const workspace = getWorkspace()

  const loadApiAgent = useCallback(async () => {
    if (!shouldLoadApiAgent) {
      setApiAgent(null)
      setApiAgentNotFound(false)
      setApiAgentLoadFailed(false)
      setLoadingApiAgent(false)
      return
    }

    setApiAgent(null)
    setApiAgentNotFound(false)
    setApiAgentLoadFailed(false)
    setLoadingApiAgent(true)

    try {
      setApiAgent(mapApiAgentDetailToAgent(await getApiAgent(agentId)))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setApiAgentNotFound(true)
      } else {
        setApiAgentLoadFailed(true)
      }
    } finally {
      setLoadingApiAgent(false)
    }
  }, [agentId, shouldLoadApiAgent])

  useEffect(() => {
    void loadApiAgent()
  }, [loadApiAgent])

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

  if (apiAgentLoadFailed) {
    return (
      <PageLayout variant="narrow">
        <PageHeader
          title="Agent unavailable"
          description="The agent API could not load this agent. Try again or return to Command Center."
        />
        <div className="flex gap-2">
          <Button
            type="button"
            nativeButton
            variant="outline"
            size="sm"
            onClick={() => void loadApiAgent()}
          >
            Try again
          </Button>
          <Button
            render={<Link to="/command-center" />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            Command Center
          </Button>
        </div>
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
