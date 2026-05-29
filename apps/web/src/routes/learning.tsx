import type { ReactElement } from "react"
import { useEffect, useMemo, useState } from "react"
import type {
  SavedMemory,
  SavedMemoryCategory,
  ThreadListItem,
  UpdateSavedMemoryRequest,
} from "@workspace/shared"
import { AgentFilterBar } from "@/components/learning/agent-filter-bar"
import { LearningBanner } from "@/components/learning/learning-banner"
import { LearningConversationRow } from "@/components/learning/learning-conversation-row"
import { LearningSecondaryPanel } from "@/components/learning/learning-secondary-panel"
import { SkillsCard } from "@/components/learning/skills-card"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import { getWorkspace } from "@/fixtures"
import type {
  LearningCandidate,
  LearningConversation,
  Memory,
} from "@/fixtures/schema"
import { listThreads } from "@/lib/api/client"
import { listMemories, updateMemory } from "@/lib/api/memories-client"
import { EditMemoryDialog } from "@/components/memories/memory-dialogs"

type LearningData = {
  conversations: LearningConversation[]
  candidates: LearningCandidate[]
  memories: Memory[]
  savedMemories: SavedMemory[]
  categories: SavedMemoryCategory[]
}

type LearningAgentOption = {
  id: string
  name: string
}

type LearningMemoryScopeOption = {
  label: string
  value: string
  scope: "global" | "agent"
  associatedAgent?: string
}

const MEMORY_CATEGORY_NAMES: Record<
  SavedMemory["category"],
  Memory["category"]
> = {
  memory_category_user_fact: "User Fact",
  memory_category_preference: "Preference",
  memory_category_project_context: "Project Context",
  memory_category_domain_knowledge: "Domain Knowledge",
  memory_category_people: "People",
  memory_category_active_work: "Active Work",
  memory_category_tools_workflows: "Tools & Workflows",
  memory_category_organization: "Organization",
}

function toLearningConversation(thread: ThreadListItem): LearningConversation {
  return {
    id: thread.id,
    title: thread.title,
    agentId: thread.agentId ?? "unassigned",
    agentName: thread.agentNameSnapshot ?? "Unassigned agent",
    messageCount: thread.messageCount ?? 0,
    updatedAt: thread.updatedAt,
  }
}

function toLearningMemory(memory: SavedMemory): Memory {
  return {
    id: memory.id,
    content: memory.content,
    category: MEMORY_CATEGORY_NAMES[memory.category],
    scope: memory.scope,
    associatedAgent: memory.associatedAgent ?? undefined,
    associatedAgents: memory.associatedAgents,
    sourceThreadId: memory.sourceThreadId ?? undefined,
    sourceThreadTitle: memory.sourceThreadTitle ?? undefined,
    importance: memory.importance,
  }
}

function toAcceptedMemoryCandidate(
  memory: SavedMemory,
  source: LearningConversation
): LearningCandidate {
  return {
    id: `learning-candidate-${memory.id}`,
    title: MEMORY_CATEGORY_NAMES[memory.category],
    content: memory.content,
    suggestionType: "memory",
    status: "accepted",
    confidence: 1,
    source: {
      threadId: source.id,
      threadTitle: source.title,
      agentId: source.agentId,
      agentName: source.agentName,
    },
    provenance: {
      kind: "thread-derived",
      label: "Accepted",
    },
    createdBy: "system",
    savedMemoryId: memory.id,
    actions: [],
  }
}

function buildLearningData(
  conversations: LearningConversation[],
  savedMemories: SavedMemory[],
  categories: SavedMemoryCategory[]
): LearningData {
  const conversationsById = new Map(
    conversations.map((conversation) => [conversation.id, conversation])
  )
  const candidates = savedMemories.flatMap((memory) => {
    if (memory.source !== "thread-derived" || !memory.sourceThreadId) return []
    const source = conversationsById.get(memory.sourceThreadId)
    return source ? [toAcceptedMemoryCandidate(memory, source)] : []
  })

  return {
    conversations,
    candidates,
    memories: savedMemories.map(toLearningMemory),
    savedMemories,
    categories,
  }
}

function buildApiLearningData(
  threads: ThreadListItem[],
  savedMemories: SavedMemory[],
  categories: SavedMemoryCategory[]
): LearningData {
  return buildLearningData(
    threads.map(toLearningConversation),
    savedMemories,
    categories
  )
}

function getLearningMemoryScopeOptions(
  agents: LearningAgentOption[]
): LearningMemoryScopeOption[] {
  return [
    {
      label: "Global (all agents)",
      value: "global",
      scope: "global",
    },
    ...agents
      .filter((agent) => agent.id !== "unassigned")
      .map((agent) => ({
        label: agent.name,
        value: agent.id,
        scope: "agent" as const,
        associatedAgent: agent.id,
      })),
  ]
}

function listConversationAgents(
  conversations: LearningConversation[]
): LearningAgentOption[] {
  const agents = new Map<string, string>()
  for (const conversation of conversations) {
    agents.set(conversation.agentId, conversation.agentName)
  }
  return [...agents.entries()].map(([id, name]) => ({ id, name }))
}

export function LearningPage(): ReactElement {
  const workspace = getWorkspace()
  const [agentFilter, setAgentFilter] = useState("all")
  const [apiData, setApiData] = useState<LearningData | null>(null)
  const [editingMemory, setEditingMemory] = useState<SavedMemory | null>(null)
  const [savingMemory, setSavingMemory] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const pinnedCount = workspace.skills.filter((skill) => skill.pinned).length

  const fixtureData = useMemo<LearningData>(
    () => ({
      conversations: workspace.learningConversations,
      candidates: workspace.learningCandidates,
      memories: workspace.memories,
      savedMemories: [],
      categories: [],
    }),
    [
      workspace.learningCandidates,
      workspace.learningConversations,
      workspace.memories,
    ]
  )

  useEffect(() => {
    let cancelled = false

    Promise.all([listThreads(), listMemories()])
      .then(([threads, memories]) => {
        if (cancelled) return
        setApiData(
          buildApiLearningData(threads, memories.memories, memories.categories)
        )
      })
      .catch(() => {
        if (cancelled) return
        setApiData(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const learningData = apiData ?? fixtureData
  const filterAgents = useMemo(
    () => listConversationAgents(learningData.conversations),
    [learningData.conversations]
  )
  const scopeOptions = getLearningMemoryScopeOptions(filterAgents)

  const conversations = useMemo(() => {
    if (agentFilter === "all") {
      return learningData.conversations
    }
    return learningData.conversations.filter(
      (conversation) => conversation.agentId === agentFilter
    )
  }, [agentFilter, learningData.conversations])

  const memoriesById = useMemo(
    () =>
      new Map(learningData.savedMemories.map((memory) => [memory.id, memory])),
    [learningData.savedMemories]
  )

  async function handleUpdateMemory(
    memoryId: string,
    input: UpdateSavedMemoryRequest
  ): Promise<void> {
    setSavingMemory(true)
    setEditError(null)

    try {
      const updated = await updateMemory(memoryId, input)
      setApiData((current) => {
        if (!current) return current
        const savedMemories = current.savedMemories.map((memory) =>
          memory.id === updated.id ? updated : memory
        )
        return buildLearningData(
          current.conversations,
          savedMemories,
          current.categories
        )
      })
      setEditingMemory(null)
    } catch (updateMemoryError) {
      setEditError(
        updateMemoryError instanceof Error
          ? updateMemoryError.message
          : "Failed to update memory"
      )
    } finally {
      setSavingMemory(false)
    }
  }

  const candidatesByThreadId = useMemo(() => {
    return learningData.candidates.reduce<Record<string, LearningCandidate[]>>(
      (groups, candidate) => {
        const threadCandidates = groups[candidate.source.threadId] ?? []
        groups[candidate.source.threadId] = [...threadCandidates, candidate]
        return groups
      },
      {}
    )
  }, [learningData.candidates])

  return (
    <PageLayout variant="fixed" className="gap-6">
      <PageHeader title="Learning" />

      {editingMemory ? (
        <EditMemoryDialog
          key={editingMemory.id}
          memory={editingMemory}
          open={Boolean(editingMemory)}
          categories={learningData.categories}
          saving={savingMemory}
          error={editError}
          scopeOptions={scopeOptions}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMemory(null)
              setEditError(null)
            }
          }}
          onUpdate={handleUpdateMemory}
        />
      ) : null}

      <LearningBanner />

      <section
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4"
        aria-label="Learning pillars"
      >
        <SkillsCard skills={workspace.skills} pinnedCount={pinnedCount} />
        <LearningSecondaryPanel memories={learningData.memories} />
      </section>

      <AgentFilterBar
        value={agentFilter}
        agents={filterAgents}
        onChange={setAgentFilter}
      />

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
              onEditMemory={(candidate) => {
                const memory = candidate.savedMemoryId
                  ? memoriesById.get(candidate.savedMemoryId)
                  : undefined
                if (memory) setEditingMemory(memory)
              }}
            />
          ))
        )}
      </section>
    </PageLayout>
  )
}
