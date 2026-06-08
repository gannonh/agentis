import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import {
  resolveSelectableGatewayModel,
  type ThreadMode,
} from "@workspace/shared"
import { ThreadPromptComposer } from "@/components/thread/thread-prompt-composer"
import { createThread } from "@/lib/api/client"
import { useRuntimeHealth } from "@/lib/api/use-runtime-health"
import { useProjects } from "@/hooks/use-projects"

type ThreadComposerProps = {
  selectedAgentId: string
}

export function ThreadComposer({ selectedAgentId }: ThreadComposerProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { health } = useRuntimeHealth()
  const { projects, loading: projectsLoading } = useProjects()
  const [mode, setMode] = useState<ThreadMode>("plan")
  const [executeBehavior, setExecuteBehavior] = useState<"auto" | "ask">("auto")
  const [projectId, setProjectId] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string | undefined>()

  useEffect(() => {
    if (!health.aiGatewayProvider) return
    setSelectedModel((current) =>
      resolveSelectableGatewayModel(
        current ?? health.defaultModel ?? health.model,
        health.aiGatewayProvider!
      )
    )
  }, [health.aiGatewayProvider, health.defaultModel, health.model])

  useEffect(() => {
    const fromQuery = searchParams.get("projectId")
    if (fromQuery && projects.some((project) => project.id === fromQuery)) {
      setProjectId(fromQuery)
    }
  }, [searchParams, projects])

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim() || !health.available) return
    setSubmitting(true)
    setError(null)
    try {
      const { thread, run } = await createThread({
        prompt: prompt.trim(),
        mode,
        model: selectedModel ?? health.defaultModel ?? health.model,
        projectId: projectId || undefined,
        agentId: selectedAgentId,
      })
      navigate(`/threads/${thread.id}`, {
        state: { startRunId: run.id },
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create thread"
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-3 flex flex-col gap-1 text-left">
        <label htmlFor="thread-project" className="text-sm font-medium">
          Project
        </label>
        <select
          id="thread-project"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          value={projectId}
          disabled={projectsLoading}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">No project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-destructive mb-2 text-xs">{error}</p> : null}
      <ThreadPromptComposer
        onSubmit={handleSubmit}
        disabled={!health.available}
        health={health}
        mode={mode}
        onModeChange={setMode}
        executeBehavior={executeBehavior}
        onExecuteBehaviorChange={setExecuteBehavior}
        submitting={submitting}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  )
}
