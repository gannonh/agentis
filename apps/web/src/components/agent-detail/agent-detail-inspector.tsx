import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ChatIcon,
  FileImageIcon,
  Presentation01Icon,
  Settings01Icon,
  TableIcon,
  Wrench02Icon,
} from "@hugeicons/core-free-icons"
import type { Agent } from "@/fixtures/schema"
import type { ReactNode } from "react"

type AgentDetailTab = "invocations" | "tools" | "skills" | "library"

type InspectorSectionProps = {
  title: string
  count: number
  defaultOpen?: boolean
  children?: ReactNode
  emptyLabel?: string
  configureTab?: AgentDetailTab
  onConfigure?: (tab: AgentDetailTab) => void
}

function InspectorSection({
  title,
  count,
  defaultOpen = false,
  children,
  emptyLabel = "None",
  configureTab,
  onConfigure,
}: InspectorSectionProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/section border-b border-border last:border-b-0"
    >
      <div className="flex items-center gap-1">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left">
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3 shrink-0 text-muted-foreground transition-transform group-data-panel-open/section:rotate-180"
            strokeWidth={2}
          />
          <span className="min-w-0 text-sm font-medium">{title} ({count})</span>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mr-2 shrink-0 text-muted-foreground"
          disabled={!configureTab || !onConfigure}
          onClick={() => {
            if (configureTab) onConfigure?.(configureTab)
          }}
          aria-label={`Configure ${title.toLowerCase()}`}
        >
          <HugeiconsIcon icon={Settings01Icon} className="size-4" strokeWidth={2} />
        </Button>
      </div>
      <CollapsibleContent className="px-7 pb-3">
        {count === 0 ? (
          <p className="text-muted-foreground text-xs">{emptyLabel}</p>
        ) : (
          children
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function ToolList({ tools }: { tools: string[] }) {
  const icons = [Wrench02Icon, Presentation01Icon, FileImageIcon, TableIcon]
  return (
    <ul className="flex max-h-56 flex-col gap-2 overflow-auto text-sm">
      {tools.slice(0, 6).map((tool, index) => (
        <li key={tool} className="flex items-center gap-2 text-muted-foreground">
          <HugeiconsIcon icon={icons[index % icons.length]} className="size-4" strokeWidth={2} />
          <span>{tool}</span>
        </li>
      ))}
      {tools.length > 6 ? (
        <li className="text-muted-foreground text-xs">Show all</li>
      ) : null}
    </ul>
  )
}

type AgentDetailInspectorProps = {
  agent: Agent
  onConfigure?: (tab: AgentDetailTab) => void
}

export function AgentDetailInspector({ agent, onConfigure }: AgentDetailInspectorProps) {
  return (
    <aside
      className="flex w-full shrink-0 flex-col rounded-xl border border-border bg-card/50 xl:sticky xl:top-6 xl:w-84 xl:self-start"
      aria-label="Agent configuration"
    >
      <div className="border-b border-border px-4 py-5">
        <h2 className="text-sm font-medium">Description</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{agent.description}</p>
        <dl className="mt-5 flex flex-col gap-2">
          <dt className="text-sm font-medium">Model</dt>
          <dd className="text-muted-foreground text-sm">{agent.model}</dd>
        </dl>
      </div>

      <InspectorSection
        title="Invocations"
        count={Math.max(agent.invocations.length, 1)}
        defaultOpen
        configureTab="invocations"
        onConfigure={onConfigure}
      >
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {(agent.invocations.length > 0 ? agent.invocations : ["Thread"]).map((inv) => (
            <li key={inv} className="flex items-center gap-2">
              <HugeiconsIcon icon={ChatIcon} className="size-4" strokeWidth={2} />
              {inv}
            </li>
          ))}
        </ul>
      </InspectorSection>

      <InspectorSection
        title="Integrations"
        count={agent.integrationsCount}
        emptyLabel="None connected"
        configureTab="tools"
        onConfigure={onConfigure}
      />

      <InspectorSection
        title="Tools"
        count={agent.tools.length}
        defaultOpen
        configureTab="tools"
        onConfigure={onConfigure}
      >
        <ToolList tools={agent.tools} />
      </InspectorSection>

      <InspectorSection
        title="Skills"
        count={agent.skillsCount}
        emptyLabel="None"
        configureTab="skills"
        onConfigure={onConfigure}
      />

      <InspectorSection
        title="Memory"
        count={agent.memoriesCount}
        emptyLabel="None"
        configureTab="library"
        onConfigure={onConfigure}
      />

      <InspectorSection
        title="Library"
        count={agent.libraryCount}
        emptyLabel="None"
        configureTab="library"
        onConfigure={onConfigure}
      />
    </aside>
  )
}
