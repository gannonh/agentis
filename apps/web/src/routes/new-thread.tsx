import { useState } from "react"
import { AgentPicker } from "@/components/new-thread/agent-picker"
import { DEFAULT_AGENT_PICKER_ID } from "@/components/new-thread/agent-picker-options"
import { QuickActions } from "@/components/new-thread/quick-actions"
import { RecentThreadsSection } from "@/components/new-thread/recent-threads-section"
import { ThreadComposer } from "@/components/new-thread/thread-composer"
import { PageLayout } from "@/components/shell/page-layout"
import { getWorkspace } from "@/fixtures"

export function NewThreadPage() {
  const workspace = getWorkspace()
  const [selectedAgentId, setSelectedAgentId] = useState(DEFAULT_AGENT_PICKER_ID)
  const recentThreads = workspace.threads.slice(0, 3)

  return (
    <PageLayout variant="focused" className="gap-10">
      <div className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-3xl font-medium tracking-tight">
          Let&apos;s get to work.
        </h1>

        <AgentPicker value={selectedAgentId} onChange={setSelectedAgentId} />

        <ThreadComposer />

        <QuickActions />
      </div>

      <RecentThreadsSection threads={recentThreads} />
    </PageLayout>
  )
}
