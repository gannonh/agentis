import type { ReactElement } from "react"
import { useEffect, useMemo, useState } from "react"
import type {
  LearningSkill,
  LearningSuggestion,
  LearningSummary,
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
import type {
  LearningCandidate,
  LearningConversation,
  Memory,
} from "@/fixtures/schema"
import { listThreads } from "@/lib/api/client"
import {
  acceptLearningSuggestion,
  dismissLearningSuggestion,
  getLearningSummary,
  listLearningMemories,
  listLearningSkills,
  listLearningSuggestions,
} from "@/lib/api/learning-client"
import { updateMemory } from "@/lib/api/memories-client"
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

type LearningLoadErrors = {
  core?: string
  summary?: string
  skills?: string
}

const EMPTY_LEARNING_DATA: LearningData = {
  conversations: [],
  candidates: [],
  memories: [],
  savedMemories: [],
  categories: [],
}

const EMPTY_LEARNING_SUMMARY: LearningSummary = {
  skillsCount: 0,
  pinnedSkillsCount: 0,
  memoriesCount: 0,
  rubricsCount: 0,
  pendingSuggestionsCount: 0,
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

function toSuggestionCandidate(
  suggestion: LearningSuggestion,
  source: LearningConversation,
  savedMemoryId?: string
): LearningCandidate {
  const status =
    suggestion.status === "pending"
      ? "suggested"
      : suggestion.status === "accepted"
        ? "accepted"
        : "dismissed"

  return {
    id: suggestion.id,
    title: suggestion.title,
    content: suggestion.content,
    suggestionType: suggestion.suggestionType,
    status,
    confidence: suggestion.confidence ?? 0.75,
    source: {
      threadId: source.id,
      threadTitle: source.title,
      agentId: source.agentId,
      agentName: source.agentName,
    },
    provenance: {
      kind: status === "suggested" ? "mocked-llm-derived" : "thread-derived",
      label:
        status === "suggested"
          ? "Suggested"
          : status === "accepted"
            ? "Accepted"
            : "Dismissed",
    },
    createdBy: "system",
    savedMemoryId,
    actions:
      status === "suggested"
        ? [
            {
              id: "save-memory",
              label: "Save memory",
              tone: "primary",
              icon: "sparkles",
            },
            { id: "dismiss", label: "Dismiss", tone: "secondary" },
          ]
        : [],
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

function resolveConversationSource(
  conversationsById: Map<string, LearningConversation>,
  suggestion: LearningSuggestion
): LearningConversation | null {
  if (!suggestion.sourceThreadId) return null
  const existing = conversationsById.get(suggestion.sourceThreadId)
  if (existing) return existing
  return {
    id: suggestion.sourceThreadId,
    title: suggestion.sourceThreadTitle ?? "Unknown thread",
    agentId: suggestion.agentId ?? "unassigned",
    agentName: "Unknown agent",
    messageCount: 0,
    updatedAt: suggestion.updatedAt,
  }
}

function buildLearningData(
  conversations: LearningConversation[],
  savedMemories: SavedMemory[],
  categories: SavedMemoryCategory[],
  suggestions: LearningSuggestion[] = []
): LearningData {
  const conversationsById = new Map(
    conversations.map((conversation) => [conversation.id, conversation])
  )
  const suggestionCandidates = suggestions.flatMap((suggestion) => {
    const source = resolveConversationSource(conversationsById, suggestion)
    if (!source) return []
    const savedMemory = savedMemories.find(
      (memory) =>
        memory.sourceThreadId === suggestion.sourceThreadId &&
        memory.content === suggestion.content
    )
    return [toSuggestionCandidate(suggestion, source, savedMemory?.id)]
  })
  const coveredMemoryIds = new Set(
    suggestionCandidates
      .map((candidate) => candidate.savedMemoryId)
      .filter((memoryId): memoryId is string => Boolean(memoryId))
  )
  const legacyMemoryCandidates = savedMemories.flatMap((memory) => {
    if (memory.source !== "thread-derived" || !memory.sourceThreadId) return []
    if (coveredMemoryIds.has(memory.id)) return []
    const hasSuggestion = suggestions.some(
      (suggestion) =>
        suggestion.sourceThreadId === memory.sourceThreadId &&
        suggestion.content === memory.content
    )
    if (hasSuggestion) return []
    const source = conversationsById.get(memory.sourceThreadId)
    return source ? [toAcceptedMemoryCandidate(memory, source)] : []
  })

  return {
    conversations,
    candidates: [...suggestionCandidates, ...legacyMemoryCandidates],
    memories: savedMemories.map(toLearningMemory),
    savedMemories,
    categories,
  }
}

function buildApiLearningData(
  threads: ThreadListItem[],
  savedMemories: SavedMemory[],
  categories: SavedMemoryCategory[],
  suggestions: LearningSuggestion[] = []
): LearningData {
  return buildLearningData(
    threads.map(toLearningConversation),
    savedMemories,
    categories,
    suggestions
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

function deriveSummaryFallback(
  memoriesResult: PromiseSettledResult<
    Awaited<ReturnType<typeof listLearningMemories>>
  >,
  skillsResult: PromiseSettledResult<
    Awaited<ReturnType<typeof listLearningSkills>>
  >
): LearningSummary {
  return {
    skillsCount:
      skillsResult.status === "fulfilled" ? skillsResult.value.totalCount : 0,
    pinnedSkillsCount: 0,
    memoriesCount:
      memoriesResult.status === "fulfilled"
        ? memoriesResult.value.memories.length
        : 0,
    rubricsCount: 0,
    pendingSuggestionsCount: 0,
  }
}

export function LearningPage(): ReactElement {
  const [agentFilter, setAgentFilter] = useState("all")
  const [learningData, setLearningData] =
    useState<LearningData>(EMPTY_LEARNING_DATA)
  const [learningSummary, setLearningSummary] = useState<LearningSummary>(
    EMPTY_LEARNING_SUMMARY
  )
  const [skills, setSkills] = useState<LearningSkill[]>([])
  const [loading, setLoading] = useState(true)
  const [loadErrors, setLoadErrors] = useState<LearningLoadErrors>({})
  const [editingMemory, setEditingMemory] = useState<SavedMemory | null>(null)
  const [savingMemory, setSavingMemory] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [actionPendingId, setActionPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function reloadLearningData() {
    const [threadsResult, memoriesResult, summaryResult, skillsResult, suggestionsResult] =
      await Promise.allSettled([
        listThreads(),
        listLearningMemories({ page: 1, pageSize: 100 }),
        getLearningSummary(),
        listLearningSkills({ page: 1, pageSize: 5 }),
        listLearningSuggestions({ page: 1, pageSize: 100 }),
      ])

    const nextErrors: LearningLoadErrors = {}

    if (
      threadsResult.status === "fulfilled" &&
      memoriesResult.status === "fulfilled"
    ) {
      const suggestions =
        suggestionsResult.status === "fulfilled"
          ? suggestionsResult.value.suggestions
          : []
      setLearningData(
        buildApiLearningData(
          threadsResult.value,
          memoriesResult.value.memories,
          memoriesResult.value.categories,
          suggestions
        )
      )
    } else {
      nextErrors.core = "Learning conversations and memories could not load."
      setLearningData(EMPTY_LEARNING_DATA)
    }

    if (summaryResult.status === "fulfilled") {
      setLearningSummary(summaryResult.value)
    } else {
      nextErrors.summary = "Learning summary could not load."
      setLearningSummary(deriveSummaryFallback(memoriesResult, skillsResult))
    }

    if (skillsResult.status === "fulfilled") {
      setSkills(skillsResult.value.skills)
    } else {
      nextErrors.skills = "Skills could not load."
      setSkills([])
    }

    setLoadErrors(nextErrors)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false

    async function loadLearningData() {
      if (cancelled) return
      await reloadLearningData()
    }

    void loadLearningData()

    return () => {
      cancelled = true
    }
  }, [])

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
      await reloadLearningData()
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

  async function handleAcceptCandidate(candidate: LearningCandidate): Promise<void> {
    setActionPendingId(candidate.id)
    setActionError(null)
    try {
      await acceptLearningSuggestion(candidate.id)
      await reloadLearningData()
    } catch (acceptError) {
      setActionError(
        acceptError instanceof Error
          ? acceptError.message
          : "Failed to accept suggestion"
      )
    } finally {
      setActionPendingId(null)
    }
  }

  async function handleDismissCandidate(
    candidate: LearningCandidate
  ): Promise<void> {
    setActionPendingId(candidate.id)
    setActionError(null)
    try {
      await dismissLearningSuggestion(candidate.id)
      await reloadLearningData()
    } catch (dismissError) {
      setActionError(
        dismissError instanceof Error
          ? dismissError.message
          : "Failed to dismiss suggestion"
      )
    } finally {
      setActionPendingId(null)
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
        <SkillsCard
          skills={skills}
          totalCount={learningSummary.skillsCount}
          pinnedCount={learningSummary.pinnedSkillsCount}
          loading={loading}
          error={loadErrors.skills}
        />
        <LearningSecondaryPanel
          memories={learningData.memories}
          rubricsCount={learningSummary.rubricsCount}
          loading={loading}
        />
      </section>

      {loadErrors.summary ? (
        <p className="text-xs text-muted-foreground" role="status">
          Learning totals could not load. Showing counts from loaded records
          where possible.
        </p>
      ) : null}

      {actionError ? (
        <p className="text-xs text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <AgentFilterBar
        value={agentFilter}
        agents={filterAgents}
        onChange={setAgentFilter}
      />

      <section
        className="flex flex-col gap-3"
        aria-label="Learning conversations"
      >
        {loading ? (
          <EmptyState
            title="Loading conversations"
            description="Fetching learning activity from the API."
          />
        ) : loadErrors.core ? (
          <EmptyState
            title="Learning data could not load"
            description="Refresh the page to retry loading conversations and memories."
          />
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Start a thread with an agent to review learning activity here."
          />
        ) : (
          conversations.map((conversation) => (
            <LearningConversationRow
              key={conversation.id}
              conversation={conversation}
              candidates={candidatesByThreadId[conversation.id]}
              actionPendingId={actionPendingId}
              onAccept={(candidate) => {
                void handleAcceptCandidate(candidate)
              }}
              onDismiss={(candidate) => {
                void handleDismissCandidate(candidate)
              }}
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
