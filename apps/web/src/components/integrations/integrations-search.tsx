import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { Input } from "@workspace/ui/components/input"

type IntegrationsSearchProps = {
  value: string
  onChange: (value: string) => void
}

export function IntegrationsSearch({ value, onChange }: IntegrationsSearchProps) {
  return (
    <div className="relative">
      <HugeiconsIcon
        icon={Search01Icon}
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        strokeWidth={2}
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search integrations..."
        className="bg-card pl-9"
        aria-label="Search integrations"
      />
    </div>
  )
}
