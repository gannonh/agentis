import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Activity01Icon,
  BookOpen01Icon,
  DashboardSquare01Icon,
  PuzzleIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Wrench02Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import {
  AgentActivityTab,
  AgentIdentityTab,
  AgentInvocationsTab,
  AgentKnowledgeTab,
  AgentModelTab,
  AgentSkillsTab,
  AgentToolsTab,
} from "@/components/agent-detail/agent-edit-tabs"
import { AgentDetailHero } from "@/components/agent-detail/agent-detail-hero"
import { AgentDetailInspector } from "@/components/agent-detail/agent-detail-inspector"
import { AgentOverviewTab } from "@/components/agent-detail/agent-overview-tab"
import { PageLayout } from "@/components/shell/page-layout"
import { PageHeader } from "@/components/shell/page-header"
import type { AgentDetailResponse, UpdateAgentRequest } from "@workspace/shared"
import { getAgent as getFixtureAgent, getWorkspace } from "@/fixtures"
import type { Agent } from "@/fixtures/schema"
import {
  getAgent as getApiAgent,
  startAgentTestThread,
  updateAgent as updateApiAgent,
} from "@/lib/api/agents-client"
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
    invocations: ["Thread"],
    skillsCount: 0,
    memoriesCount: 0,
    libraryCount: 0,
    integrationsCount: detail.toolGrants.length,
  }
}

type ApiAgentState =
  | { agentId: null; status: "idle" }
  | { agentId: string; status: "loading" }
  | { agentId: string; status: "ready"; detail: AgentDetailResponse }
  | { agentId: string; status: "not-found" }
  | { agentId: string; status: "failed" }

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const fixtureAgent = agentId ? getFixtureAgent(agentId) : undefined
  const shouldLoadApiAgent =
    !!agentId && !fixtureAgent && agentId !== "command-center"
  const [apiAgentState, setApiAgentState] = useState<ApiAgentState>(() => {
    if (shouldLoadApiAgent && agentId) return { agentId, status: "loading" }
    return { agentId: null, status: "idle" }
  })
  const [activeTabState, setActiveTabState] = useState<{
    agentId: string | null
    value: string
  }>(() => ({ agentId: agentId ?? null, value: "overview" }))
  const [testThreadState, setTestThreadState] = useState<{
    agentId: string | null
    loading: boolean
    error: string | null
  }>(() => ({ agentId: null, loading: false, error: null }))
  const workspace = getWorkspace()

  const loadApiAgent = useCallback(
    async (showLoading = true) => {
      if (!shouldLoadApiAgent || !agentId) return

      if (showLoading) {
        setApiAgentState({ agentId, status: "loading" })
      }

      try {
        const detail = await getApiAgent(agentId)
        setApiAgentState({ agentId, status: "ready", detail })
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setApiAgentState({ agentId, status: "not-found" })
          return
        }
        setApiAgentState({ agentId, status: "failed" })
      }
    },
    [agentId, shouldLoadApiAgent]
  )

  useEffect(() => {
    if (!shouldLoadApiAgent) return
    queueMicrotask(() => void loadApiAgent(false))
  }, [loadApiAgent, shouldLoadApiAgent])

  const saveApiAgent = useCallback(
    async (payload: UpdateAgentRequest) => {
      if (!agentId) return
      const detail = await updateApiAgent(agentId, payload)
      setApiAgentState({ agentId, status: "ready", detail })
    },
    [agentId]
  )

  let routeState: ApiAgentState = { agentId: null, status: "idle" }
  if (shouldLoadApiAgent && agentId) {
    routeState =
      apiAgentState.agentId === agentId
        ? apiAgentState
        : { agentId, status: "loading" }
  }
  const apiAgentDetail =
    routeState.status === "ready" ? routeState.detail : null

  const launchTestThread = useCallback(async () => {
    if (!agentId || !apiAgentDetail) return
    setTestThreadState({ agentId, loading: true, error: null })
    try {
      const created = await startAgentTestThread(agentId, {
        prompt: `Test ${apiAgentDetail.agent.name}`,
      })
      navigate(`/threads/${created.thread.id}`)
    } catch (error) {
      setTestThreadState({
        agentId,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to start thread",
      })
    }
  }, [agentId, apiAgentDetail, navigate])
  const apiAgent = apiAgentDetail
    ? mapApiAgentDetailToAgent(apiAgentDetail)
    : null
  const agent = fixtureAgent ?? apiAgent
  const editable = !!apiAgentDetail
  const isStartingTestThread =
    testThreadState.agentId === agentId && testThreadState.loading
  const testThreadError =
    testThreadState.agentId === agentId ? testThreadState.error : null
  const activeTab =
    editable && activeTabState.agentId === (agentId ?? null)
      ? activeTabState.value
      : "overview"

  if (routeState.status === "loading") {
    return (
      <PageLayout variant="narrow">
        <PageHeader
          title="Loading agent"
          description="Loading the agent configuration from the API."
        />
      </PageLayout>
    )
  }

  if (routeState.status === "failed") {
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

  if (
    !agent ||
    agent.id === "command-center" ||
    routeState.status === "not-found"
  ) {
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
    <PageLayout className="dark -m-6 min-h-svh bg-background p-6 text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <AgentDetailHero
            agent={agent}
            onStartThread={apiAgentDetail ? launchTestThread : undefined}
            startingThread={isStartingTestThread}
          />
          {testThreadError ? (
            <p className="px-6 text-sm text-destructive" role="alert">
              {testThreadError}
            </p>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTabState({ agentId: agentId ?? null, value: String(value) })
            }
          >
            <TabsList
              variant="line"
              className="w-full justify-start overflow-x-auto border-b border-border"
            >
              <TabsTrigger value="overview">
                <HugeiconsIcon
                  icon={DashboardSquare01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Overview
              </TabsTrigger>
              <TabsTrigger value="identity" disabled={!editable}>
                <HugeiconsIcon
                  icon={SparklesIcon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Identity
              </TabsTrigger>
              <TabsTrigger value="activity" disabled={!editable}>
                <HugeiconsIcon
                  icon={Activity01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Activity
              </TabsTrigger>
              <TabsTrigger value="model" disabled={!editable}>
                <HugeiconsIcon
                  icon={SlidersHorizontalIcon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Model
              </TabsTrigger>
              <TabsTrigger value="invocations" disabled={!editable}>
                <HugeiconsIcon
                  icon={ZapIcon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Invocations
              </TabsTrigger>
              <TabsTrigger value="tools" disabled={!editable}>
                <HugeiconsIcon
                  icon={Wrench02Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Tools
              </TabsTrigger>
              <TabsTrigger value="skills" disabled={!editable}>
                <HugeiconsIcon
                  icon={PuzzleIcon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Skills
              </TabsTrigger>
              <TabsTrigger value="knowledge" disabled={!editable}>
                <HugeiconsIcon
                  icon={BookOpen01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
                Knowledge
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <AgentOverviewTab
                recentThreads={recentThreads}
                information={apiAgentDetail?.information}
              />
            </TabsContent>
            {apiAgentDetail ? (
              <>
                <TabsContent value="identity" className="pt-4">
                  <AgentIdentityTab
                    detail={apiAgentDetail}
                    onSave={saveApiAgent}
                  />
                </TabsContent>
                <TabsContent value="activity" className="pt-4">
                  <AgentActivityTab information={apiAgentDetail.information} />
                </TabsContent>
                <TabsContent value="model" className="pt-4">
                  <AgentModelTab
                    detail={apiAgentDetail}
                    onSave={saveApiAgent}
                  />
                </TabsContent>
                <TabsContent value="invocations" className="pt-4">
                  <AgentInvocationsTab />
                </TabsContent>
                <TabsContent value="tools" className="pt-4">
                  <AgentToolsTab
                    detail={apiAgentDetail}
                    onSave={saveApiAgent}
                  />
                </TabsContent>
                <TabsContent value="skills" className="pt-4">
                  <AgentSkillsTab />
                </TabsContent>
                <TabsContent value="knowledge" className="pt-4">
                  <AgentKnowledgeTab />
                </TabsContent>
              </>
            ) : null}
          </Tabs>
        </div>

        <AgentDetailInspector
          agent={agent}
          onConfigure={
            editable
              ? (tab) =>
                  setActiveTabState({ agentId: agentId ?? null, value: tab })
              : undefined
          }
        />
      </div>
    </PageLayout>
  )
}
