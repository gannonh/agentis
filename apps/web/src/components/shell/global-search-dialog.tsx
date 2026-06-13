import { useNavigate } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { emptySearchResponse, type SearchHit } from "@workspace/shared"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { useDebouncedWorkspaceSearch } from "@/hooks/use-debounced-workspace-search"
import { useGlobalSearch } from "@/hooks/use-global-search"
import {
  hasSearchResults,
  SEARCH_RESULT_GROUPS,
  searchHitIcon,
  searchHitPath,
} from "@/lib/search-entity"
import { commandPaletteShortcutLabel } from "@/lib/keyboard"

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
      <HugeiconsIcon icon={searchHitIcon(hit)} strokeWidth={2} />
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
  const { open, setOpen, query, setQuery } = useGlobalSearch()
  const trimmedQuery = query.trim()
  const isSearching = open && trimmedQuery.length > 0
  const { results, loading, error } = useDebouncedWorkspaceSearch({
    enabled: isSearching,
    query,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
  }

  const handleSelect = (hit: SearchHit) => {
    const path = searchHitPath(hit)
    if (!path) return
    setOpen(false)
    navigate(path)
  }

  const resultsMatchQuery = !isSearching || results.query === trimmedQuery
  const displayResults =
    isSearching && resultsMatchQuery ? results : emptySearchResponse()
  const displayLoading = isSearching && (loading || !resultsMatchQuery)
  const displayError = isSearching && resultsMatchQuery ? error : null
  const showIdleHint = open && !trimmedQuery && !displayLoading && !displayError
  const showEmptyState =
    isSearching &&
    !displayLoading &&
    !displayError &&
    !hasSearchResults(displayResults)

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
          onValueChange={setQuery}
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

          {SEARCH_RESULT_GROUPS.map((group) => {
            const hits = displayResults[group.key]
            if (hits.length === 0) {
              return null
            }

            return (
              <CommandGroup key={group.key} heading={group.heading}>
                {hits.map((hit) => (
                  <SearchResultItem
                    key={hit.id}
                    hit={hit}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
