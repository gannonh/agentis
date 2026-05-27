import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import type {
  MemoriesListResponse,
  SavedMemory,
  SavedMemoryCategory,
  SavedMemoryCategoryKey,
} from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { EmptyState } from "@/components/shell/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { listMemories } from "@/lib/api/memories-client"

function formatMemoryDate(date: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const value = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(date)

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)
}

type MemoryCardProps = {
  memory: SavedMemory
  categoryName: string
}

function MemoryCard({ memory, categoryName }: MemoryCardProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{categoryName}</Badge>
          <Badge variant="outline">{memory.importance} importance</Badge>
          <Badge variant="outline">{memory.scope}</Badge>
        </div>
        <CardTitle className="text-base leading-6">{memory.content}</CardTitle>
        <CardDescription>{memory.usageGuidance}</CardDescription>
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
            <dt className="text-muted-foreground text-xs">Date</dt>
            <dd>{formatMemoryDate(memory.date)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Source</dt>
            <dd>{memory.source}</dd>
          </div>
          {memory.associatedAgent ? (
            <div>
              <dt className="text-muted-foreground text-xs">Associated agent</dt>
              <dd>{memory.associatedAgent}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground text-xs">Provenance</dt>
            <dd>{memory.provenance}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

type CategorySummaryProps = {
  categories: SavedMemoryCategory[]
  selectedCategory: SavedMemoryCategoryKey | null
  onSelectCategory: (category: SavedMemoryCategoryKey | null) => void
}

function CategorySummary({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategorySummaryProps): ReactElement {
  const totalSaved = categories.reduce((total, category) => total + category.count, 0)

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Memory categories">
      <Button
        variant={selectedCategory === null ? "default" : "outline"}
        className="h-auto justify-start p-0 text-left"
        onClick={() => onSelectCategory(null)}
      >
        <Card className="w-full border-0 bg-transparent shadow-none">
          <CardHeader className="gap-1">
            <CardTitle className="text-sm">All categories</CardTitle>
            <CardDescription>{totalSaved} saved</CardDescription>
          </CardHeader>
        </Card>
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          className="h-auto justify-start p-0 text-left"
          onClick={() => onSelectCategory(category.id)}
        >
          <Card className="w-full border-0 bg-transparent shadow-none">
            <CardHeader className="gap-1">
              <CardTitle className="text-sm">{category.name}</CardTitle>
              <CardDescription>{category.count} saved</CardDescription>
            </CardHeader>
          </Card>
        </Button>
      ))}
    </section>
  )
}

function getCategoryNameMap(categories: SavedMemoryCategory[]): Map<SavedMemoryCategoryKey, string> {
  return new Map(categories.map((category) => [category.id, category.name]))
}

function getSelectedCategoryName(
  categories: SavedMemoryCategory[],
  selectedCategory: SavedMemoryCategoryKey | null
): string | null {
  if (selectedCategory === null) {
    return null
  }

  const category = categories.find((item) => item.id === selectedCategory)
  return category?.name ?? null
}

export function MemoriesPage(): ReactElement {
  const [data, setData] = useState<MemoriesListResponse | null>(null)
  const [selectedCategory, setSelectedCategory] =
    useState<SavedMemoryCategoryKey | null>(null)
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
            loadError instanceof Error ? loadError.message : "Failed to load memories"
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
  const selectedCategoryName = getSelectedCategoryName(categories, selectedCategory)

  function handleSelectCategory(category: SavedMemoryCategoryKey | null): void {
    setSelectedCategory(category)
    setData((current) => current ? { ...current, memories: [] } : null)
    setLoading(true)
    setError(null)
  }

  return (
    <PageLayout className="gap-6">
      <PageHeader
        title="Memories"
        description="Browse saved context that agents can reuse across work. Seeded memories are labeled with their source and provenance."
      />

      {loading ? <p className="text-muted-foreground text-sm">Loading memories…</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {data ? (
        <CategorySummary
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Saved memories">
        {memories.length === 0 && !loading ? (
          <EmptyState
            title={selectedCategoryName ? `No memories in ${selectedCategoryName}` : "No saved memories"}
            description="Saved memories will appear here after agents or users add reusable context."
          />
        ) : (
          memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              categoryName={categoryNameMap.get(memory.category) ?? memory.category}
            />
          ))
        )}
      </section>
    </PageLayout>
  )
}
