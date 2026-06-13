import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import {
  BookOpen01Icon,
  BubbleChatIcon,
  Folder01Icon,
  Robot01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { SearchHit, SearchResponse } from "@workspace/shared"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { useGlobalSearch } from "@/hooks/use-global-search"
import { ApiError } from "@/lib/api/client"
import { artifactLaunchPath } from "@/lib/api/projects-client"
import { searchWorkspace } from "@/lib/api/search-client"
import { commandPaletteShortcutLabel } from "@/lib/keyboard"

const EMPTY_RESULTS: SearchResponse = {
  query: "",
  threads: [],
  artifacts: [],
  agents: [],
  projects: [],
}

function searchHitPath(hit: SearchHit): string | null {
  switch (hit.entityType) {
    case "thread":
      return `/threads/${hit.id}`
    case "agent":
      return `/agents/${hit.id}`
    case "project":
      return `/projects/${hit.id}`
    case "artifact":
      if (!hit.artifactType) {
        return "/library"
      }
      return (
        artifactLaunchPath({ id: hit.id, type: hit.artifactType }) ?? "/library"
      )
    default:
      return null
  }
}

function hasResults(results: SearchResponse) {
  return (
    results.threads.length > 0 ||
    results.artifacts.length > 0 ||
    results.agents.length > 0 ||
    results.projects.length > 0
  )
}

function entityIcon(hit: SearchHit) {
  switch (hit.entityType) {
    case "thread":
      return BubbleChatIcon
    case "artifact":
      return BookOpen01Icon
    case "agent":
      return Robot01Icon
    case "project":
      return Folder01Icon
    default:
      return Search01Icon
  }
}

function SearchResultItem({
  hit,
  onSelect,
}: {
  hit: SearchHit
  onSelect: (hit: SearchHit) => void
}) {
  return (
    <CommandItem
      key={`${hit.entityType}:${hit.id}`}
      value={`${hit.entityType}:${hit.id}:${hit.title}`}
      onSelect={() => onSelect(hit)}
    >
      <HugeiconsIcon icon={entityIcon(hit)} strokeWidth={2} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium">{hit.title}</span>
        {hit.subtitle ? (
          <span className="truncate text-muted-foreground">{hit.subtitle}</span>
        ) : null}
      </div>
    </CommandItem>
  )
}

export function GlobalSearchDialog() {
  const navigate = useNavigate()
  const { open, setOpen } = useGlobalSearch()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestGeneration = useRef(0)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      requestGeneration.current += 1
      setQuery("")
      setResults(EMPTY_RESULTS)
      setLoading(false)
      setError(null)
    }
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    requestGeneration.current += 1
    if (!value.trim()) {
      setResults(EMPTY_RESULTS)
      setLoading(false)
      setError(null)
      return
    }

    setResults(EMPTY_RESULTS)
    setLoading(true)
    setError(null)
  }

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!open || !trimmedQuery) {
      return
    }

    const generation = requestGeneration.current + 1
    requestGeneration.current = generation

    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void searchWorkspace(trimmedQuery)
        .then((response) => {
          if (requestGeneration.current !== generation) return
          setResults(response)
          setError(null)
        })
        .catch((caught) => {
          if (requestGeneration.current !== generation) return
          setResults(EMPTY_RESULTS)
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Search is unavailable right now."
          )
        })
        .finally(() => {
          if (requestGeneration.current !== generation) return
          setLoading(false)
        })
    }, 200)

    return () => window.clearTimeout(timer)
  }, [open, query])

  const handleSelect = (hit: SearchHit) => {
    const path = searchHitPath(hit)
    if (!path) return
    setOpen(false)
    navigate(path)
  }

  const trimmedQuery = query.trim()
  const isSearching = open && trimmedQuery.length > 0
  const displayResults = isSearching ? results : EMPTY_RESULTS
  const displayLoading = isSearching && loading
  const displayError = isSearching ? error : null
  const showIdleHint = open && !trimmedQuery && !displayLoading && !displayError
  const showEmptyState =
    isSearching &&
    !displayLoading &&
    !displayError &&
    !hasResults(displayResults)

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search workspace"
      description="Search threads, library artifacts, agents, and projects."
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search threads, library, agents, projects…"
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
          {showIdleHint ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Type to search your workspace. Press{" "}
              {commandPaletteShortcutLabel()} anywhere to reopen.
            </div>
          ) : null}

          {displayLoading ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Searching…
            </div>
          ) : null}

          {displayError ? (
            <div className="px-3 py-6 text-center text-xs text-destructive">
              {displayError}
            </div>
          ) : null}

          {showEmptyState ? (
            <CommandEmpty>No results for “{trimmedQuery}”.</CommandEmpty>
          ) : null}

          {displayResults.threads.length > 0 ? (
            <CommandGroup heading="Threads">
              {displayResults.threads.map((hit) => (
                <SearchResultItem key={hit.id} hit={hit} onSelect={handleSelect} />
              ))}
            </CommandGroup>
          ) : null}

          {displayResults.artifacts.length > 0 ? (
            <CommandGroup heading="Library">
              {displayResults.artifacts.map((hit) => (
                <SearchResultItem key={hit.id} hit={hit} onSelect={handleSelect} />
              ))}
            </CommandGroup>
          ) : null}

          {displayResults.agents.length > 0 ? (
            <CommandGroup heading="Agents">
              {displayResults.agents.map((hit) => (
                <SearchResultItem key={hit.id} hit={hit} onSelect={handleSelect} />
              ))}
            </CommandGroup>
          ) : null}

          {displayResults.projects.length > 0 ? (
            <CommandGroup heading="Projects">
              {displayResults.projects.map((hit) => (
                <SearchResultItem key={hit.id} hit={hit} onSelect={handleSelect} />
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
