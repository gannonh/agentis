import { useState } from "react"
import { useSearchParams } from "react-router"
import { AgentPicker } from "@/components/new-thread/agent-picker"
import { DEFAULT_AGENT_PICKER_ID } from "@/components/new-thread/agent-picker-options"
import { QuickActions } from "@/components/new-thread/quick-actions"
import { RecentThreadsSection } from "@/components/new-thread/recent-threads-section"
import { ThreadComposer } from "@/components/new-thread/thread-composer"
import { PageLayout } from "@/components/shell/page-layout"
import { useAgents } from "@/hooks/use-agents"
export function NewThreadPage() {
  const [searchParams] = useSearchParams()
  const requestedAgentId = searchParams.get("agentId")
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const { agents, loading: agentsLoading } = useAgents()
  const requestedAgentIsValid = Boolean(
    requestedAgentId &&
      (requestedAgentId === DEFAULT_AGENT_PICKER_ID ||
        agents.some((agent) => agent.id === requestedAgentId))
  )
  const urlAgentId =
    requestedAgentId && requestedAgentIsValid
      ? requestedAgentId
      : DEFAULT_AGENT_PICKER_ID
  const effectiveSelectedAgentId = selectedAgentId ?? urlAgentId

  return (
    <PageLayout variant="focused" className="gap-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-3xl font-medium tracking-tight">
          Let&apos;s get to work.
        </h1>

        <AgentPicker
          value={effectiveSelectedAgentId}
          onChange={setSelectedAgentId}
          agents={agents}
          agentsLoading={agentsLoading}
        />

        <ThreadComposer selectedAgentId={effectiveSelectedAgentId} />

        <QuickActions />
      </div>

      <RecentThreadsSection />
    </PageLayout>
  )
}
