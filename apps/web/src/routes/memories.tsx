import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router"
import {
  Add01Icon,
  ArchiveIcon,
  ArrowLeft01Icon,
  Copy01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type {
  CreateSavedMemoryRequest,
  MemoriesListResponse,
  SavedMemory,
  SavedMemoryCategoryKey,
  UpdateSavedMemoryRequest,
} from "@workspace/shared"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  AddMemoryDialog,
  EditMemoryDialog,
} from "@/components/memories/memory-dialogs"
import { MemoryCard } from "@/components/memories/memory-card"
import { MemoryFilters } from "@/components/memories/memory-filters"
import {
  getCategoryNameMap,
  getSelectedCategory,
  memoryMatchesScopeFilter,
  memoryMatchesSearch,
} from "@/components/memories/memory-filter-utils"
import type { MemoryScopeFilter } from "@/components/memories/memory-filter-utils"
import { getMemoryScopeOptions } from "@/components/memories/memory-scope-options"
import { EmptyState } from "@/components/shell/empty-state"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { useAgents } from "@/hooks/use-agents"
import {
  createMemory,
  listMemories,
  updateMemory,
} from "@/lib/api/memories-client"

export function MemoriesPage(): ReactElement {
  const { agents } = useAgents()
  const [data, setData] = useState<MemoriesListResponse | null>(null)
  const [selectedCategory, setSelectedCategory] =
    useState<SavedMemoryCategoryKey | null>(null)
  const [scopeFilter, setScopeFilter] = useState<MemoryScopeFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [addMemoryOpen, setAddMemoryOpen] = useState(false)
  const [editingMemory, setEditingMemory] = useState<SavedMemory | null>(null)
  const [savingMemory, setSavingMemory] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
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

  const scopeOptions = getMemoryScopeOptions(agents)
  const agentNameById = new Map(agents.map((agent) => [agent.id, agent.name]))
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
      memoryMatchesScopeFilter(memory, scopeFilter) &&
      memoryMatchesSearch(memory, categoryName, searchQuery)
    )
  })

  function handleSelectCategory(category: SavedMemoryCategoryKey | null): void {
    setSelectedCategory(category)
    setData((current) => (current ? { ...current, memories: [] } : null))
    setLoading(true)
    setError(null)
  }

  async function handleCreateMemory(
    input: CreateSavedMemoryRequest
  ): Promise<void> {
    setSavingMemory(true)
    setCreateError(null)

    try {
      const created = await createMemory(input)
      setData((current) => {
        if (!current) {
          return current
        }

        const memoriesForFilter =
          selectedCategory === null || selectedCategory === created.category
            ? [created, ...current.memories]
            : current.memories

        return {
          categories: current.categories.map((category) =>
            category.id === created.category
              ? { ...category, count: category.count + 1 }
              : category
          ),
          memories: memoriesForFilter,
        }
      })
      setAddMemoryOpen(false)
    } catch (createMemoryError) {
      setCreateError(
        createMemoryError instanceof Error
          ? createMemoryError.message
          : "Failed to create memory"
      )
    } finally {
      setSavingMemory(false)
    }
  }

  async function handleUpdateMemory(
    memoryId: string,
    input: UpdateSavedMemoryRequest
  ): Promise<void> {
    setSavingMemory(true)
    setEditError(null)

    try {
      const updated = await updateMemory(memoryId, input)
      setData((current) => {
        if (!current) return current
        return {
          ...current,
          memories: current.memories.map((memory) =>
            memory.id === updated.id ? updated : memory
          ),
        }
      })
      setEditingMemory(null)
    } catch (updateMemoryError) {
      setEditError(
        updateMemoryError instanceof Error
          ? updateMemoryError.message
          : "Failed to update memory"
      )
    } finally {
      setSavingMemory(false)
    }
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
            <Button type="button" onClick={() => setAddMemoryOpen(true)}>
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

      {addMemoryOpen ? (
        <AddMemoryDialog
          open={addMemoryOpen}
          categories={categories}
          saving={savingMemory}
          error={createError}
          selectedCategory={selectedCategory}
          scopeOptions={scopeOptions}
          onOpenChange={(open) => {
            setAddMemoryOpen(open)
            if (!open) {
              setCreateError(null)
            }
          }}
          onCreate={handleCreateMemory}
        />
      ) : null}

      {editingMemory ? (
        <EditMemoryDialog
          key={editingMemory.id}
          memory={editingMemory}
          open={Boolean(editingMemory)}
          categories={categories}
          saving={savingMemory}
          error={editError}
          scopeOptions={scopeOptions}
          onOpenChange={(open) => {
            if (!open) {
              setEditingMemory(null)
              setEditError(null)
            }
          }}
          onUpdate={handleUpdateMemory}
        />
      ) : null}

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
          agents={agents}
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
              agentNameById={agentNameById}
              onEdit={setEditingMemory}
            />
          ))
        )}
      </section>
    </PageLayout>
  )
}
