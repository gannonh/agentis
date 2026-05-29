import type { ReactElement } from "react"
import {
  FilterHorizontalIcon,
  Globe02Icon,
  Search01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type {
  AgentListItem,
  SavedMemoryCategory,
  SavedMemoryCategoryKey,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { getScopeFilterLabel, getSelectedCategory } from "./memory-filter-utils"
import type { MemoryScopeFilter } from "./memory-filter-utils"
import { CategoryIcon } from "./memory-category-icon"

type MemoryFiltersProps = {
  categories: SavedMemoryCategory[]
  selectedCategory: SavedMemoryCategoryKey | null
  scopeFilter: MemoryScopeFilter
  searchQuery: string
  agents: AgentListItem[]
  onSelectCategory: (category: SavedMemoryCategoryKey | null) => void
  onSelectScope: (scope: MemoryScopeFilter) => void
  onSearchQueryChange: (query: string) => void
}

export function MemoryFilters({
  categories,
  selectedCategory,
  scopeFilter,
  searchQuery,
  agents,
  onSelectCategory,
  onSelectScope,
  onSearchQueryChange,
}: MemoryFiltersProps): ReactElement {
  const selectedCategoryData = getSelectedCategory(categories, selectedCategory)
  const categoryLabel = selectedCategoryData
    ? `${selectedCategoryData.name} (${selectedCategoryData.count})`
    : `All categories (${categories.length})`
  const scopeLabel = getScopeFilterLabel(scopeFilter, agents)

  return (
    <section
      className="flex flex-col gap-3 md:flex-row md:items-center"
      aria-label="Memory filters"
    >
      <div className="hidden text-muted-foreground md:flex" aria-hidden>
        <HugeiconsIcon
          icon={FilterHorizontalIcon}
          className="size-4"
          strokeWidth={2}
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="w-full justify-between md:w-44"
            />
          }
        >
          <span>{scopeLabel}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44">
          <DropdownMenuRadioGroup
            value={scopeFilter}
            onValueChange={(value) => onSelectScope(value as MemoryScopeFilter)}
          >
            <DropdownMenuRadioItem value="all">
              All Memories
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="global">
              <HugeiconsIcon
                icon={Globe02Icon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden
              />
              Global
            </DropdownMenuRadioItem>
            {agents.map((agent) => (
              <DropdownMenuRadioItem key={agent.id} value={`agent:${agent.id}`}>
                <HugeiconsIcon
                  icon={UserIcon}
                  className="size-3.5"
                  strokeWidth={2}
                  aria-hidden
                />
                {agent.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              className="w-full justify-between md:w-52"
            />
          }
        >
          <span>{categoryLabel}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuRadioGroup
            value={selectedCategory ?? "all"}
            onValueChange={(value) =>
              onSelectCategory(
                value === "all" ? null : (value as SavedMemoryCategoryKey)
              )
            }
          >
            <DropdownMenuRadioItem value="all">
              All categories ({categories.length})
            </DropdownMenuRadioItem>
            {categories.map((category) => (
              <DropdownMenuRadioItem key={category.id} value={category.id}>
                <CategoryIcon
                  category={category.id}
                  className="size-5 rounded-md"
                />
                {category.name} ({category.count})
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative w-full md:max-w-sm">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <Input
          className="pl-7"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>
    </section>
  )
}
