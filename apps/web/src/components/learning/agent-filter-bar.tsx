import type { ReactElement } from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type AgentFilterOption = {
  id: string
  name: string
}

type AgentFilterBarProps = {
  value: string
  agents: AgentFilterOption[]
  onChange: (value: string) => void
}

export function AgentFilterBar({
  value,
  agents,
  onChange,
}: AgentFilterBarProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground">Agent:</span>
      <Button
        type="button"
        size="sm"
        variant={value === "all" ? "default" : "outline"}
        className={cn(value === "all" && "shadow-none")}
        onClick={() => onChange("all")}
      >
        All
      </Button>
      {agents.map((agent) => (
        <Button
          key={agent.id}
          type="button"
          size="sm"
          variant={value === agent.id ? "default" : "outline"}
          className="gap-1.5"
          onClick={() => onChange(agent.id)}
        >
          <HugeiconsIcon
            icon={Search01Icon}
            className="size-3.5"
            strokeWidth={2}
          />
          {agent.name}
        </Button>
      ))}
    </div>
  )
}
