import { cn } from "@workspace/ui/lib/utils"

type IntegrationsCategoryFilterProps = {
  categories: string[]
  value: string | null
  onChange: (category: string | null) => void
}

function categoryFilterButtonClass(active: boolean, extraClassName?: string) {
  return cn(
    "rounded-full border px-3 py-1 text-xs transition-colors",
    extraClassName,
    active
      ? "border-agent-blue bg-agent-blue/10 text-foreground"
      : "border-border bg-card text-muted-foreground hover:text-foreground"
  )
}

export function IntegrationsCategoryFilter({
  categories,
  value,
  onChange,
}: IntegrationsCategoryFilterProps) {
  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2" aria-label="Filter integrations by category">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={categoryFilterButtonClass(value === null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={categoryFilterButtonClass(value === category, "capitalize")}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
