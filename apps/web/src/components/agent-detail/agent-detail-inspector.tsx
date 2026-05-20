import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import type { Agent } from "@/fixtures/schema"
import type { ReactNode } from "react"

type InspectorSectionProps = {
  title: string
  count: number
  defaultOpen?: boolean
  children: ReactNode
  emptyLabel?: string
}

function InspectorSection({
  title,
  count,
  defaultOpen = false,
  children,
  emptyLabel = "None",
}: InspectorSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/section border-b border-border last:border-b-0"
    >
      <div className="flex items-center gap-1">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-2 px-4 py-3 text-left">
          <span className="text-sm font-medium">
            {title} ({count})
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open/section:rotate-180"
            strokeWidth={2}
          />
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 shrink-0"
          disabled
          aria-label={`Configure ${title.toLowerCase()}`}
        >
          <HugeiconsIcon icon={Settings01Icon} className="size-4" strokeWidth={2} />
        </Button>
      </div>
      <CollapsibleContent className="px-4 pb-3">
        {count === 0 ? (
          <p className="text-muted-foreground text-xs">{emptyLabel}</p>
        ) : (
          children
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

type AgentDetailInspectorProps = {
  agent: Agent
}

export function AgentDetailInspector({ agent }: AgentDetailInspectorProps) {
  return (
    <aside
      className="flex w-full shrink-0 flex-col rounded-lg border border-border bg-card xl:w-80"
      aria-label="Agent configuration"
    >
      <div className="border-b border-border px-4 py-4">
        <p className="text-muted-foreground text-xs leading-relaxed">{agent.description}</p>
        <dl className="mt-4 flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs font-medium">Model</dt>
          <dd className="text-sm font-medium">{agent.model}</dd>
        </dl>
      </div>

      <InspectorSection
        title="Invocations"
        count={agent.invocations.length}
        defaultOpen
      >
        <ul className="flex flex-col gap-1 text-sm">
          {agent.invocations.map((inv) => (
            <li key={inv}>{inv}</li>
          ))}
        </ul>
      </InspectorSection>

      <InspectorSection
        title="Integrations"
        count={agent.integrationsCount}
        emptyLabel="None connected"
      />

      <InspectorSection title="Tools" count={agent.tools.length} defaultOpen>
        <ul className="flex max-h-56 flex-col gap-1 overflow-auto text-xs">
          {agent.tools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      </InspectorSection>

      <InspectorSection title="Skills" count={agent.skillsCount} emptyLabel="—" />

      <InspectorSection title="Memory" count={agent.memoriesCount} emptyLabel="—" />

      <InspectorSection title="Library" count={agent.libraryCount} emptyLabel="—" />
    </aside>
  )
}
