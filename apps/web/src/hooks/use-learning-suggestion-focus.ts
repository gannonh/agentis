import { useEffect, useMemo, useRef } from "react"
import type { LearningCandidate } from "@/fixtures/schema"
import { learningSuggestionDomId } from "@/lib/learning-deep-link"

type UseLearningSuggestionFocusOptions = {
  focusSuggestionId: string | null
  candidates: LearningCandidate[]
  loading: boolean
  agentFilter: string
  onAgentFilterChange: (value: string) => void
}

export function useLearningSuggestionFocus({
  focusSuggestionId,
  candidates,
  loading,
  agentFilter,
  onAgentFilterChange,
}: UseLearningSuggestionFocusOptions) {
  const hasScrolledToFocusRef = useRef(false)

  const focusedCandidate = useMemo(() => {
    if (!focusSuggestionId) return null
    return (
      candidates.find((candidate) => candidate.id === focusSuggestionId) ?? null
    )
  }, [candidates, focusSuggestionId])

  const focusThreadId = focusedCandidate?.source.threadId ?? null

  useEffect(() => {
    hasScrolledToFocusRef.current = false
  }, [focusSuggestionId])

  useEffect(() => {
    if (!focusSuggestionId || loading || hasScrolledToFocusRef.current) {
      return
    }
    if (!focusedCandidate) {
      return
    }

    if (agentFilter !== "all" && focusedCandidate.source.agentId !== agentFilter) {
      onAgentFilterChange("all")
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const element = document.getElementById(
        learningSuggestionDomId(focusSuggestionId)
      )
      if (!element) return
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      hasScrolledToFocusRef.current = true
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [
    agentFilter,
    focusSuggestionId,
    focusedCandidate,
    loading,
    onAgentFilterChange,
  ])

  return { focusedCandidate, focusThreadId }
}
