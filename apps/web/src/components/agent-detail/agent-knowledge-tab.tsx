import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { File02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import type { AgentDetailInformation } from "@workspace/shared"

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
  const headingId = `agent-${title.toLowerCase().replace(/\s+/g, "-")}-heading`

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

      <FuturePlaceholderSection
        title="Memories"
        description="Information the agent can reference while working on a task."
        emptyCopy="No memories yet. Add one to give this agent persistent context."
        actionLabel="Add memories"
      />

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
