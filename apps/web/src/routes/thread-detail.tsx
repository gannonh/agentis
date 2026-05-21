import { useState } from "react"
import { Link, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import { RunTimeline } from "@/components/thread/run-timeline"
import { ThreadPromptComposer } from "@/components/thread/thread-prompt-composer"
import { PageLayout } from "@/components/shell/page-layout"
import { useRuntimeHealth } from "@/lib/api/use-runtime-health"
import { useThreadSession } from "@/hooks/use-thread-session"
import type { ThreadMode } from "@workspace/shared"

export function ThreadDetailPage() {
  const { threadId } = useParams()
  const { health } = useRuntimeHealth()
  const {
    detail,
    loading,
    error,
    streaming,
    latestRun,
    steps,
    canAbort,
    submitFollowUp,
    abortActiveRun,
    getMessageText,
  } = useThreadSession(threadId)

  const [mode, setMode] = useState<ThreadMode>(detail?.thread.mode ?? "plan")
  const [submitting, setSubmitting] = useState(false)

  const composerDisabled = !health.available

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim() || composerDisabled) return
    setSubmitting(true)
    try {
      await submitFollowUp(prompt.trim())
    } finally {
      setSubmitting(false)
    }
  }

  if (!threadId) {
    return (
      <PageLayout>
        <p className="text-muted-foreground text-sm">Thread not found.</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout className="h-[calc(100vh-3rem)] gap-0 p-0">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">Thread</p>
            <h1 className="truncate text-lg font-medium">
              {detail?.thread.title ?? "Loading…"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {canAbort ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void abortActiveRun()}
              >
                Abort
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              render={<Link to="/threads/new">New thread</Link>}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col">
            <Conversation className="flex-1">
              <ConversationContent>
                {loading ? (
                  <p className="text-muted-foreground text-sm">Loading transcript…</p>
                ) : null}
                {error ? (
                  <p className="text-destructive text-sm">{error}</p>
                ) : null}
                {detail?.messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      <MessageResponse>{getMessageText(message)}</MessageResponse>
                      {message.status === "aborted" ? (
                        <p className="text-muted-foreground mt-2 text-xs">Aborted</p>
                      ) : null}
                      {message.status === "failed" ? (
                        <p className="text-destructive mt-2 text-xs">Failed</p>
                      ) : null}
                      {message.status === "streaming" ? (
                        <p className="text-muted-foreground mt-2 text-xs">Streaming…</p>
                      ) : null}
                    </MessageContent>
                  </Message>
                ))}
              </ConversationContent>
            </Conversation>

            <div className="border-t border-border p-4">
              <div className="mx-auto w-full max-w-3xl">
                <ThreadPromptComposer
                  onSubmit={handleSubmit}
                  disabled={composerDisabled || loading}
                  health={health}
                  mode={detail?.thread.mode ?? mode}
                  onModeChange={setMode}
                  submitting={submitting || streaming}
                />
              </div>
            </div>
          </div>

          <RunTimeline run={latestRun} steps={steps} />
        </div>
      </div>
    </PageLayout>
  )
}
