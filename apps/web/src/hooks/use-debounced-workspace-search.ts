import { useCallback, useEffect, useRef, useState } from "react"
import { emptySearchResponse, type SearchResponse } from "@workspace/shared"
import { ApiError } from "@/lib/api/client"
import { searchWorkspace } from "@/lib/api/search-client"

const SEARCH_DEBOUNCE_MS = 200

export function useDebouncedWorkspaceSearch({
  enabled,
  query,
}: {
  enabled: boolean
  query: string
}) {
  const [results, setResults] = useState<SearchResponse>(emptySearchResponse)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestGeneration = useRef(0)

  const reset = useCallback(() => {
    requestGeneration.current += 1
    setResults(emptySearchResponse())
    setLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      reset()
      return
    }

    requestGeneration.current += 1
    const generation = requestGeneration.current
    setResults(emptySearchResponse())
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      void searchWorkspace(trimmedQuery)
        .then((response) => {
          if (requestGeneration.current !== generation) return
          setResults(response)
          setError(null)
        })
        .catch((caught) => {
          if (requestGeneration.current !== generation) return
          setResults(emptySearchResponse())
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
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [enabled, query, reset])

  return { results, loading, error, reset }
}
