import { useMemo, useState } from "react"
import { AgentFilterBar } from "@/components/learning/agent-filter-bar"
import { LearningBanner } from "@/components/learning/learning-banner"
import { LearningConversationRow } from "@/components/learning/learning-conversation-row"
import { LearningSecondaryPanel } from "@/components/learning/learning-secondary-panel"
import { SkillsCard } from "@/components/learning/skills-card"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import { getWorkspace } from "@/fixtures"
import type { LearningCandidate } from "@/fixtures/schema"

export function LearningPage() {
  const workspace = getWorkspace()
  const [agentFilter, setAgentFilter] = useState<"all" | "senior-reviewer">(
    "all"
  )
  const pinnedCount = workspace.skills.filter((skill) => skill.pinned).length

  const conversations = useMemo(() => {
    if (agentFilter === "all") {
      return workspace.learningConversations
    }
    return workspace.learningConversations.filter(
      (conversation) => conversation.agentId === agentFilter
    )
  }, [agentFilter, workspace.learningConversations])

  const candidatesByThreadId = useMemo(() => {
    return workspace.learningCandidates.reduce<
      Record<string, LearningCandidate[]>
    >((groups, candidate) => {
      const threadCandidates = groups[candidate.source.threadId] ?? []
      groups[candidate.source.threadId] = [...threadCandidates, candidate]
      return groups
    }, {})
  }, [workspace.learningCandidates])

  return (
    <PageLayout className="gap-6">
      <PageHeader title="Learning" />

      <LearningBanner />

      <section
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4"
        aria-label="Learning pillars"
      >
        <SkillsCard skills={workspace.skills} pinnedCount={pinnedCount} />
        <LearningSecondaryPanel memories={workspace.memories} />
      </section>

      <AgentFilterBar value={agentFilter} onChange={setAgentFilter} />

      <section
        className="flex flex-col gap-3"
        aria-label="Learning conversations"
      >
        {conversations.length === 0 ? (
          <EmptyState
            title="No conversations for this agent"
            description="Try another filter or start a thread with this agent."
          />
        ) : (
          conversations.map((conversation) => (
            <LearningConversationRow
              key={conversation.id}
              conversation={conversation}
              candidates={candidatesByThreadId[conversation.id]}
            />
          ))
        )}
      </section>
    </PageLayout>
  )
}
