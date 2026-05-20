import { useMemo, useState } from "react"
import { AgentFilterBar } from "@/components/learning/agent-filter-bar"
import { LearningBanner } from "@/components/learning/learning-banner"
import { LearningConversationRow } from "@/components/learning/learning-conversation-row"
import { LearningSecondaryPanel } from "@/components/learning/learning-secondary-panel"
import { SkillsCard } from "@/components/learning/skills-card"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
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

      <LearningSecondaryPanel />

      <AgentFilterBar value={agentFilter} onChange={setAgentFilter} />

      <section className="flex flex-col gap-3" aria-label="Learning conversations">
        {conversations.map((conversation) => (
          <LearningConversationRow key={conversation.id} conversation={conversation} />
        ))}
      </section>
    </PageLayout>
  )
}
