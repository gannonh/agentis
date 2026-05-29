import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  File02Icon,
  Globe02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import type { AgentDetailInformation, SavedMemory } from "@workspace/shared"
import { useId } from "react"

type FuturePlaceholderSectionProps = {
  title: string
  description: string
  emptyCopy: string
  actionLabel?: string
}

function FuturePlaceholderSection({
  title,
  description,
  emptyCopy,
  actionLabel,
}: FuturePlaceholderSectionProps) {
  const headingId = useId()

  return (
    <section
      className="rounded-xl border border-border bg-card/70 p-4"
      aria-labelledby={headingId}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-sm font-medium">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">Planned for a later milestone</Badge>
      </div>
      <div className="mt-5 flex min-h-32 flex-col items-center justify-center gap-4 rounded-xl bg-muted/40 px-4 py-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{emptyCopy}</p>
        {actionLabel ? (
          <Button type="button" variant="outline" size="sm" disabled>
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="size-3"
              strokeWidth={2}
            />
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function MemoryCard({
  memory,
  global,
}: {
  memory: SavedMemory
  global?: boolean
}) {
  return (
    <article className="rounded-xl border border-border bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <HugeiconsIcon
          icon={File02Icon}
          className="size-5 text-muted-foreground"
          strokeWidth={2}
        />
        {global ? (
          <HugeiconsIcon
            icon={Globe02Icon}
            className="size-4 text-primary"
            strokeWidth={2}
            aria-label="Global memory"
          />
        ) : null}
      </div>
      <h3 className="mt-6 line-clamp-2 text-sm font-medium">
        {memory.content}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {memory.category.replace(/^memory_category_/, "").replace(/_/g, " ")} ·{" "}
        {memory.importance} importance
      </p>
      {memory.usageGuidance ? (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
          {memory.usageGuidance}
        </p>
      ) : null}
    </article>
  )
}

function AgentMemoriesSummary({
  information,
}: {
  information: AgentDetailInformation
}) {
  const agentMemories = information.memories?.agent ?? []
  const globalMemories = information.memories?.global ?? []
  const totalCount = agentMemories.length + globalMemories.length

  return (
    <section
      role="region"
      className="rounded-xl border border-border bg-card/70 p-4"
      aria-labelledby="agent-memories-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="agent-memories-heading" className="text-sm font-medium">
            Memories
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Information the agent can reference while working on a task.
          </p>
        </div>
        <Badge variant="secondary">{totalCount} active</Badge>
      </div>
      {totalCount > 0 ? (
        <div className="mt-5 flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <span>Agent Memories</span>
              <Badge variant="secondary">{agentMemories.length} active</Badge>
            </div>
            {agentMemories.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {agentMemories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No memories are scoped only to this agent.
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <HugeiconsIcon
                icon={Globe02Icon}
                className="size-3.5"
                strokeWidth={2}
              />
              <span>Global Memories</span>
              <Badge variant="secondary">{globalMemories.length}</Badge>
            </div>
            {globalMemories.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {globalMemories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} global />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No global memories are available to this agent.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-8 text-center">
          <p className="text-sm font-medium">No memories available yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Add one to give this agent persistent context.
          </p>
        </div>
      )}
    </section>
  )
}

function AgentLibrarySummary({
  information,
}: {
  information: AgentDetailInformation
}) {
  const items = information.library.items

  return (
    <section
      role="region"
      className="rounded-xl border border-border bg-card/70 p-4"
      aria-labelledby="agent-library-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="agent-library-heading" className="text-sm font-medium">
            Library
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Artifacts linked to this agent and its test-thread work.
          </p>
        </div>
        <Badge variant="secondary">
          {information.library.totalCount} item
          {information.library.totalCount === 1 ? "" : "s"}
        </Badge>
      </div>
      {items.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-border bg-background/50 p-4"
            >
              <HugeiconsIcon
                icon={File02Icon}
                className="size-5 text-muted-foreground"
                strokeWidth={2}
              />
              <h3 className="mt-6 truncate text-sm font-medium">
                {item.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.type} · {item.mimeType}
              </p>
              {item.threadTitleSnapshot ? (
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  From {item.threadTitleSnapshot}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl bg-muted/40 px-4 py-8 text-center">
          <p className="text-sm font-medium">No library artifacts yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Artifacts created by this agent's test threads will appear here when
            they are available.
          </p>
        </div>
      )}
    </section>
  )
}

export function AgentKnowledgeTab({
  information,
}: {
  information: AgentDetailInformation
}) {
  return (
    <div data-testid="agent-knowledge-tab" className="flex flex-col gap-6">
      <FuturePlaceholderSection
        title="Knowledge discovery"
        description="Allow this agent to find and use existing knowledge while it works."
        emptyCopy="Knowledge discovery controls will be available when this capability is backed by the agent configuration API."
        actionLabel="Configure discovery"
      />

      <FuturePlaceholderSection
        title="Knowledge access"
        description="Choose what this agent can use and learn from."
        emptyCopy="Access presets and per-agent knowledge permissions will appear here when those settings are available."
        actionLabel="Configure access"
      />

      <AgentMemoriesSummary information={information} />

      <FuturePlaceholderSection
        title="Context files"
        description="Documents and reference files attached to this agent for use during conversations."
        emptyCopy="No context files added yet. Attach reference files when this capability is available."
        actionLabel="Add context file"
      />

      <AgentLibrarySummary information={information} />
    </div>
  )
}
