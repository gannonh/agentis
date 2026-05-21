import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type AgentFilterBarProps = {
  value: "all" | "senior-reviewer"
  onChange: (value: "all" | "senior-reviewer") => void
}

export function AgentFilterBar({ value, onChange }: AgentFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-muted-foreground text-sm">Agent:</span>
      <Button
        type="button"
        size="sm"
        variant={value === "all" ? "default" : "outline"}
        className={cn(value === "all" && "shadow-none")}
        onClick={() => onChange("all")}
      >
        All
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "senior-reviewer" ? "default" : "outline"}
        className="gap-1.5"
        onClick={() => onChange("senior-reviewer")}
      >
        <HugeiconsIcon icon={Search01Icon} className="size-3.5" strokeWidth={2} />
        Senior Reviewer
      </Button>
    </div>
  )
}
