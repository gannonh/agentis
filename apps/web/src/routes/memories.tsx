import { useEffect, useState } from "react"
import type {
  MemoriesListResponse,
  SavedMemory,
  SavedMemoryCategory,
} from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
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

function formatMemoryDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

function MemoryCard({ memory }: { memory: SavedMemory }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{memory.category}</Badge>
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

function CategorySummary({ categories }: { categories: SavedMemoryCategory[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Memory categories">
      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className="gap-1">
            <CardTitle className="text-sm">{category.name}</CardTitle>
            <CardDescription>{category.count} saved</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </section>
  )
}

export function MemoriesPage() {
  const [data, setData] = useState<MemoriesListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    listMemories()
      .then((response) => {
        if (active) setData(response)
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load memories"
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const memories = data?.memories ?? []

  return (
    <PageLayout className="gap-6">
      <PageHeader
        title="Memories"
        description="Browse saved context that agents can reuse across work. Seeded memories are labeled with their source and provenance."
      />

      {loading ? <p className="text-muted-foreground text-sm">Loading memories…</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {data ? <CategorySummary categories={data.categories} /> : null}

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Saved memories">
        {memories.length === 0 && !loading ? (
          <EmptyState
            title="No saved memories"
            description="Saved memories will appear here after agents or users add reusable context."
          />
        ) : (
          memories.map((memory) => <MemoryCard key={memory.id} memory={memory} />)
        )}
      </section>
    </PageLayout>
  )
}
