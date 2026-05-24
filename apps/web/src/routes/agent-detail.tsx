import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { Link, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
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
import type { AgentDetailResponse, UpdateAgentRequest } from "@workspace/shared"
import { getAgent as getFixtureAgent, getWorkspace } from "@/fixtures"
import type { Agent } from "@/fixtures/schema"
import {
  getAgent as getApiAgent,
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
    invocations: [],
    skillsCount: 0,
    memoriesCount: 0,
    libraryCount: 0,
    integrationsCount: detail.toolGrants.length,
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

function StatusText({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="text-muted-foreground text-sm">{message}</p>
}

function getSaveError(error: unknown): string {
  return error instanceof Error ? error.message : "Agent save failed"
}

function AgentIdentityTab({
  detail,
  onSave,
}: {
  detail: AgentDetailResponse
  onSave: (payload: UpdateAgentRequest) => Promise<void>
}) {
  const [name, setName] = useState(detail.agent.name)
  const [description, setDescription] = useState(detail.agent.description ?? "")
  const [systemPrompt, setSystemPrompt] = useState(detail.agent.systemPrompt)
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(detail.agent.name)
    setDescription(detail.agent.description ?? "")
    setSystemPrompt(detail.agent.systemPrompt)
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await onSave({
        name,
        description: description.trim() ? description : null,
        systemPrompt,
      })
      setStatus("Identity saved")
    } catch (error) {
      setStatus(getSaveError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" onSubmit={handleSubmit}>
      <Field label="Name">
        <Input value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field label="Description">
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
        />
      </Field>
      <Field label="System prompt">
        <Textarea
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          rows={8}
          required
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          Save identity
        </Button>
        <StatusText message={status} />
      </div>
    </form>
  )
}

function AgentModelTab({
  detail,
  onSave,
}: {
  detail: AgentDetailResponse
  onSave: (payload: UpdateAgentRequest) => Promise<void>
}) {
  const [model, setModel] = useState(detail.agent.model)
  const [maxCostPerRunUsd, setMaxCostPerRunUsd] = useState(
    detail.agent.maxCostPerRunUsd?.toString() ?? ""
  )
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setModel(detail.agent.model)
    setMaxCostPerRunUsd(detail.agent.maxCostPerRunUsd?.toString() ?? "")
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await onSave({
        model,
        maxCostPerRunUsd: maxCostPerRunUsd ? Number(maxCostPerRunUsd) : null,
      })
      setStatus("Model saved")
    } catch (error) {
      setStatus(getSaveError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4" onSubmit={handleSubmit}>
      <Field label="Model">
        <Input value={model} onChange={(event) => setModel(event.target.value)} />
      </Field>
      <Field label="Max cost per run USD">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={maxCostPerRunUsd}
          onChange={(event) => setMaxCostPerRunUsd(event.target.value)}
          placeholder="No limit"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          Save model
        </Button>
        <StatusText message={status} />
      </div>
    </form>
  )
}

function AgentToolsTab({
  detail,
  onSave,
}: {
  detail: AgentDetailResponse
  onSave: (payload: UpdateAgentRequest) => Promise<void>
}) {
  const [selectedToolkits, setSelectedToolkits] = useState(
    new Set(detail.toolGrants.map((grant) => grant.toolkitSlug))
  )
  const [status, setStatus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSelectedToolkits(new Set(detail.toolGrants.map((grant) => grant.toolkitSlug)))
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await onSave({
        toolGrants: detail.toolGrants
          .filter((grant) => selectedToolkits.has(grant.toolkitSlug))
          .map((grant) => ({
            toolkitSlug: grant.toolkitSlug,
            connectionId: grant.connectionId,
          })),
      })
      setStatus("Tools saved")
    } catch (error) {
      setStatus(getSaveError(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        {detail.toolGrants.map((grant) => (
          <label
            key={grant.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedToolkits.has(grant.toolkitSlug)}
              onChange={(event) => {
                const next = new Set(selectedToolkits)
                if (event.target.checked) {
                  next.add(grant.toolkitSlug)
                } else {
                  next.delete(grant.toolkitSlug)
                }
                setSelectedToolkits(next)
              }}
            />
            {grant.toolkitSlug}
          </label>
        ))}
      </div>
      {detail.toolGrants.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-border p-4 text-sm">
          No connected tool grants yet.
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          Save tools
        </Button>
        <StatusText message={status} />
      </div>
    </form>
  )
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const fixtureAgent = agentId ? getFixtureAgent(agentId) : undefined
  const shouldLoadApiAgent =
    !!agentId && !fixtureAgent && agentId !== "command-center"
  const [apiAgentDetail, setApiAgentDetail] = useState<AgentDetailResponse | null>(null)
  const [apiAgent, setApiAgent] = useState<Agent | null>(null)
  const [loadingApiAgent, setLoadingApiAgent] = useState(shouldLoadApiAgent)
  const [apiAgentNotFound, setApiAgentNotFound] = useState(false)
  const [apiAgentLoadFailed, setApiAgentLoadFailed] = useState(false)
  const workspace = getWorkspace()

  const loadApiAgent = useCallback(async () => {
    if (!shouldLoadApiAgent) {
      setApiAgentDetail(null)
      setApiAgent(null)
      setApiAgentNotFound(false)
      setApiAgentLoadFailed(false)
      setLoadingApiAgent(false)
      return
    }

    setApiAgentDetail(null)
    setApiAgent(null)
    setApiAgentNotFound(false)
    setApiAgentLoadFailed(false)
    setLoadingApiAgent(true)

    try {
      const detail = await getApiAgent(agentId)
      setApiAgentDetail(detail)
      setApiAgent(mapApiAgentDetailToAgent(detail))
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

  const saveApiAgent = useCallback(
    async (payload: UpdateAgentRequest) => {
      if (!agentId) return
      const detail = await updateApiAgent(agentId, payload)
      setApiAgentDetail(detail)
      setApiAgent(mapApiAgentDetailToAgent(detail))
    },
    [agentId]
  )

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
  const editable = !!apiAgentDetail

  return (
    <PageLayout>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <AgentDetailHero agent={agent} />

          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="identity" disabled={!editable}>
                Identity
              </TabsTrigger>
              <TabsTrigger value="activity" disabled={!editable}>
                Activity
              </TabsTrigger>
              <TabsTrigger value="model" disabled={!editable}>
                Model
              </TabsTrigger>
              <TabsTrigger value="invocations" disabled={!editable}>
                Invocations
              </TabsTrigger>
              <TabsTrigger value="tools" disabled={!editable}>
                Tools
              </TabsTrigger>
              <TabsTrigger value="skills" disabled>
                Skills
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
              <AgentOverviewTab recentThreads={recentThreads} />
            </TabsContent>
            {apiAgentDetail ? (
              <>
                <TabsContent value="identity" className="pt-4">
                  <AgentIdentityTab detail={apiAgentDetail} onSave={saveApiAgent} />
                </TabsContent>
                <TabsContent value="activity" className="pt-4">
                  <p className="text-muted-foreground rounded-lg border border-border bg-card p-4 text-sm">
                    Thread activity will appear here as agent runs accumulate.
                  </p>
                </TabsContent>
                <TabsContent value="model" className="pt-4">
                  <AgentModelTab detail={apiAgentDetail} onSave={saveApiAgent} />
                </TabsContent>
                <TabsContent value="invocations" className="pt-4">
                  <p className="text-muted-foreground rounded-lg border border-border bg-card p-4 text-sm">
                    Thread invocation is enabled for API-backed agents.
                  </p>
                </TabsContent>
                <TabsContent value="tools" className="pt-4">
                  <AgentToolsTab detail={apiAgentDetail} onSave={saveApiAgent} />
                </TabsContent>
              </>
            ) : null}
          </Tabs>
        </div>

        <AgentDetailInspector agent={agent} />
      </div>
    </PageLayout>
  )
}
