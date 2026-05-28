import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import {
  Add01Icon,
  ArchiveIcon,
  ArrowLeft01Icon,
  BookOpen01Icon,
  Briefcase01Icon,
  Building05Icon,
  Copy01Icon,
  FilterHorizontalIcon,
  FolderLibraryIcon,
  Globe02Icon,
  Search01Icon,
  UserGroupIcon,
  UserIcon,
  Wrench01Icon,
  FavouriteIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import type {
  MemoriesListResponse,
  SavedMemory,
  SavedMemoryCategory,
  SavedMemoryCategoryKey,
} from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { EmptyState } from "@/components/shell/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { listMemories } from "@/lib/api/memories-client"

type MemoryScopeFilter = "all" | "global" | "project"

type MemoryCategoryDisplay = {
  icon: IconSvgElement
  tone: string
}

const CATEGORY_DISPLAY: Record<SavedMemoryCategoryKey, MemoryCategoryDisplay> =
  {
    memory_category_user_fact: {
      icon: UserIcon,
      tone: "border-blue-500/40 bg-blue-500/15 text-blue-300",
    },
    memory_category_preference: {
      icon: FavouriteIcon,
      tone: "border-pink-500/40 bg-pink-500/15 text-pink-300",
    },
    memory_category_project_context: {
      icon: FolderLibraryIcon,
      tone: "border-slate-500/40 bg-slate-500/15 text-slate-300",
    },
    memory_category_domain_knowledge: {
      icon: BookOpen01Icon,
      tone: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    },
    memory_category_people: {
      icon: UserGroupIcon,
      tone: "border-violet-500/40 bg-violet-500/15 text-violet-300",
    },
    memory_category_active_work: {
      icon: Briefcase01Icon,
      tone: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    },
    memory_category_tools_workflows: {
      icon: Wrench01Icon,
      tone: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    },
    memory_category_organization: {
      icon: Building05Icon,
      tone: "border-zinc-500/40 bg-zinc-500/15 text-zinc-300",
    },
  }

function formatMemoryDate(date: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const value = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    : new Date(date)

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)
}

function getCategoryDisplay(
  category: SavedMemoryCategoryKey
): MemoryCategoryDisplay {
  return CATEGORY_DISPLAY[category]
}

type CategoryIconProps = {
  category: SavedMemoryCategoryKey
  className?: string
}

function CategoryIcon({
  category,
  className,
}: CategoryIconProps): ReactElement {
  const display = getCategoryDisplay(category)

  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border",
        display.tone,
        className
      )}
    >
      <HugeiconsIcon
        icon={display.icon}
        className="size-3.5"
        strokeWidth={2}
        aria-hidden
      />
    </span>
  )
}

type MemoryCardProps = {
  memory: SavedMemory
  categoryName: string
}

function MemoryCard({ memory, categoryName }: MemoryCardProps): ReactElement {
  return (
    <Card className="min-h-72">
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <CategoryIcon
            category={memory.category}
            className="size-10 rounded-xl"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <HugeiconsIcon
                  icon={getCategoryDisplay(memory.category).icon}
                  className="size-3"
                  strokeWidth={2}
                  aria-hidden
                />
                {categoryName}
              </Badge>
              <Badge variant="outline">{memory.importance} importance</Badge>
              <Badge variant="outline">{memory.scope}</Badge>
            </div>
            <CardTitle className="text-base leading-6">
              {memory.content}
            </CardTitle>
          </div>
        </div>
        <CardDescription className="pl-13 italic">
          {memory.usageGuidance}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {memory.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd>{formatMemoryDate(memory.date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Source</dt>
            <dd>{memory.source}</dd>
          </div>
          {memory.associatedAgent ? (
            <div>
              <dt className="text-xs text-muted-foreground">
                Associated agent
              </dt>
              <dd>{memory.associatedAgent}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-muted-foreground">Provenance</dt>
            <dd>{memory.provenance}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function getCategoryNameMap(
  categories: SavedMemoryCategory[]
): Map<SavedMemoryCategoryKey, string> {
  return new Map(categories.map((category) => [category.id, category.name]))
}

function getSelectedCategory(
  categories: SavedMemoryCategory[],
  selectedCategory: SavedMemoryCategoryKey | null
): SavedMemoryCategory | null {
  if (selectedCategory === null) {
    return null
  }

  return categories.find((item) => item.id === selectedCategory) ?? null
}

type MemoryFiltersProps = {
  categories: SavedMemoryCategory[]
  selectedCategory: SavedMemoryCategoryKey | null
  scopeFilter: MemoryScopeFilter
  searchQuery: string
  onSelectCategory: (category: SavedMemoryCategoryKey | null) => void
  onSelectScope: (scope: MemoryScopeFilter) => void
  onSearchQueryChange: (query: string) => void
}

function MemoryFilters({
  categories,
  selectedCategory,
  scopeFilter,
  searchQuery,
  onSelectCategory,
  onSelectScope,
  onSearchQueryChange,
}: MemoryFiltersProps): ReactElement {
  const selectedCategoryData = getSelectedCategory(categories, selectedCategory)
  const categoryLabel = selectedCategoryData
    ? `${selectedCategoryData.name} (${selectedCategoryData.count})`
    : `All categories (${categories.length})`
  const scopeLabel =
    scopeFilter === "all"
      ? "All Memories"
      : scopeFilter === "global"
        ? "Global"
        : "Project"

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
            <DropdownMenuRadioItem value="project">
              <HugeiconsIcon
                icon={FolderLibraryIcon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden
              />
              Project
            </DropdownMenuRadioItem>
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

function memoryMatchesSearch(
  memory: SavedMemory,
  categoryName: string,
  query: string
): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    memory.content,
    memory.usageGuidance,
    memory.source,
    memory.provenance,
    memory.associatedAgent ?? "",
    memory.scope,
    memory.importance,
    categoryName,
    ...memory.tags,
  ].some((value) => value.toLowerCase().includes(normalizedQuery))
}

export function MemoriesPage(): ReactElement {
  const [data, setData] = useState<MemoriesListResponse | null>(null)
  const [selectedCategory, setSelectedCategory] =
    useState<SavedMemoryCategoryKey | null>(null)
  const [scopeFilter, setScopeFilter] = useState<MemoryScopeFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    listMemories(selectedCategory ?? undefined)
      .then((response) => {
        if (active) {
          setData(response)
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load memories"
          )
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [selectedCategory])

  const categories = data?.categories ?? []
  const categoryNameMap = getCategoryNameMap(categories)
  const memories = data?.memories ?? []
  const totalSaved = categories.reduce(
    (total, category) => total + category.count,
    0
  )
  const selectedCategoryName =
    getSelectedCategory(categories, selectedCategory)?.name ?? null
  const visibleMemories = memories.filter((memory) => {
    const categoryName = categoryNameMap.get(memory.category) ?? memory.category
    return (
      (scopeFilter === "all" || memory.scope === scopeFilter) &&
      memoryMatchesSearch(memory, categoryName, searchQuery)
    )
  })

  function handleSelectCategory(category: SavedMemoryCategoryKey | null): void {
    setSelectedCategory(category)
    setData((current) => (current ? { ...current, memories: [] } : null))
    setLoading(true)
    setError(null)
  }

  return (
    <PageLayout className="gap-6">
      <PageHeader
        title="Memories"
        description={`Browse saved context that agents can reuse across work. ${totalSaved} memories stored.`}
        leading={
          <Link
            to="/learning"
            aria-label="Back to Learning"
            className={buttonVariants({ variant: "outline", size: "icon-lg" })}
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              className="size-4"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        }
        actions={
          <>
            <Button variant="outline" type="button">
              <HugeiconsIcon
                icon={Copy01Icon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden
              />
              Dedupe Memories
            </Button>
            <Button type="button">
              <HugeiconsIcon
                icon={Add01Icon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden
              />
              Add Memory
            </Button>
            <button
              type="button"
              role="switch"
              aria-checked={showArchived}
              aria-label="Show archived"
              className="flex items-center gap-2 text-sm text-muted-foreground"
              onClick={() => setShowArchived((current) => !current)}
            >
              <span
                className={cn(
                  "flex h-5 w-9 items-center rounded-full border border-border p-0.5 transition-colors",
                  showArchived ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "size-4 rounded-full bg-foreground transition-transform",
                    showArchived && "translate-x-4 bg-primary-foreground"
                  )}
                />
              </span>
              <HugeiconsIcon
                icon={ArchiveIcon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden
              />
              Show archived
            </button>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading memories…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {data ? (
        <MemoryFilters
          categories={categories}
          selectedCategory={selectedCategory}
          scopeFilter={scopeFilter}
          searchQuery={searchQuery}
          onSelectCategory={handleSelectCategory}
          onSelectScope={setScopeFilter}
          onSearchQueryChange={setSearchQuery}
        />
      ) : null}

      <section
        className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
        aria-label="Saved memories"
      >
        {visibleMemories.length === 0 && !loading ? (
          <EmptyState
            title={
              selectedCategoryName
                ? `No memories in ${selectedCategoryName}`
                : "No saved memories"
            }
            description="Saved memories will appear here after agents or users add reusable context."
          />
        ) : (
          visibleMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              categoryName={
                categoryNameMap.get(memory.category) ?? memory.category
              }
            />
          ))
        )}
      </section>
    </PageLayout>
  )
}
