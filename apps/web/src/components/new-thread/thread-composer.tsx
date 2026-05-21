import { useState } from "react"
import { useNavigate } from "react-router"
import type { ThreadMode } from "@workspace/shared"
import { ThreadPromptComposer } from "@/components/thread/thread-prompt-composer"
import { createThread } from "@/lib/api/client"
import { useRuntimeHealth } from "@/lib/api/use-runtime-health"

export function ThreadComposer() {
  const navigate = useNavigate()
  const { health } = useRuntimeHealth()
  const [mode, setMode] = useState<ThreadMode>("plan")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim() || !health.available) return
    setSubmitting(true)
    setError(null)
    try {
      const { thread, run } = await createThread({
        prompt: prompt.trim(),
        mode,
        model: health.model,
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
      {error ? <p className="text-destructive mb-2 text-xs">{error}</p> : null}
      <ThreadPromptComposer
        onSubmit={handleSubmit}
        disabled={!health.available}
        health={health}
        mode={mode}
        onModeChange={setMode}
        submitting={submitting}
      />
    </div>
  )
}
