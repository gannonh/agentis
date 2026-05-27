import { useMemo, useState } from "react"
import { AgentFilterBar } from "@/components/learning/agent-filter-bar"
import { LearningBanner } from "@/components/learning/learning-banner"
import { LearningCandidatesSection } from "@/components/learning/learning-candidates-section"
import { LearningConversationRow } from "@/components/learning/learning-conversation-row"
import { LearningSecondaryPanel } from "@/components/learning/learning-secondary-panel"
import { SkillsCard } from "@/components/learning/skills-card"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import { getWorkspace } from "@/fixtures"

export function LearningPage() {
  const workspace = getWorkspace()
  const [agentFilter, setAgentFilter] = useState<"all" | "senior-reviewer">("all")
  const pinnedCount = workspace.skills.filter((skill) => skill.pinned).length

  const conversations = useMemo(() => {
    if (agentFilter === "all") {
      return workspace.learningConversations
    }
    return workspace.learningConversations.filter(
      (conversation) => conversation.agentId === agentFilter
    )
  }, [agentFilter, workspace.learningConversations])

  return (
    <PageLayout className="gap-6">
      <PageHeader title="Learning" />

      <LearningBanner />

      <SkillsCard skills={workspace.skills} pinnedCount={pinnedCount} />

      <LearningSecondaryPanel memories={workspace.memories} />

      <LearningCandidatesSection candidates={workspace.learningCandidates} />

      <AgentFilterBar value={agentFilter} onChange={setAgentFilter} />

      <section className="flex flex-col gap-3" aria-label="Learning conversations">
        {conversations.length === 0 ? (
          <EmptyState
            title="No conversations for this agent"
            description="Try another filter or start a thread with this agent."
          />
        ) : (
          conversations.map((conversation) => (
            <LearningConversationRow key={conversation.id} conversation={conversation} />
          ))
        )}
      </section>
    </PageLayout>
  )
}
