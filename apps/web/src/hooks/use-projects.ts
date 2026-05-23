import { useCallback, useEffect, useState } from "react"
import type { Project } from "@workspace/shared"
import { listProjects } from "@/lib/api/projects-client"

export function useProjects(options?: { includeArchived?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProjects(options?.includeArchived)
      setProjects(data)
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load projects"
      )
    } finally {
      setLoading(false)
    }
  }, [options?.includeArchived])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { projects, loading, error, refresh }
}
