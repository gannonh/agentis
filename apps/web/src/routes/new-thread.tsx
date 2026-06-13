import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import type { ThreadListItem, ThreadMode } from "@workspace/shared"
import { AgentPicker } from "@/components/new-thread/agent-picker"
import { DEFAULT_AGENT_PICKER_ID } from "@/components/new-thread/agent-picker-options"
import { DemoThreadsSection } from "@/components/new-thread/demo-threads-section"
import { QuickActions } from "@/components/new-thread/quick-actions"
import { RecentThreadsSection } from "@/components/new-thread/recent-threads-section"
import type { SuggestionChip } from "@/components/new-thread/suggestion-chips"
import { ThreadComposer } from "@/components/new-thread/thread-composer"
import { PageLayout } from "@/components/shell/page-layout"
import { useAgents } from "@/hooks/use-agents"
import { listThreads } from "@/lib/api/client"

export function NewThreadPage() {
  const [searchParams] = useSearchParams()
  const requestedAgentId = searchParams.get("agentId")
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [promptDraft, setPromptDraft] = useState<
    { id: string; text: string; mode?: ThreadMode } | undefined
  >()
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const [threadsLoading, setThreadsLoading] = useState(true)
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

  useEffect(() => {
    void (async () => {
      try {
        setThreads(await listThreads())
      } catch {
        setThreads([])
      } finally {
        setThreadsLoading(false)
      }
    })()
  }, [])

  function handleSelectChip(chip: SuggestionChip) {
    if (chip.agentId) {
      setSelectedAgentId(chip.agentId)
    }
    setPromptDraft({
      id: crypto.randomUUID(),
      text: chip.prompt,
      mode: chip.mode,
    })
  }

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

        <ThreadComposer
          selectedAgentId={effectiveSelectedAgentId}
          agents={agents}
          promptDraft={promptDraft}
        />

        <QuickActions agents={agents} onSelectChip={handleSelectChip} />
      </div>

      <DemoThreadsSection threads={threads} />
      <RecentThreadsSection threads={threads} loading={threadsLoading} />
    </PageLayout>
  )
}
