import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
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
import { ThreadProjectContext } from "@/components/thread/thread-project-context"
import { ThreadPromptComposer } from "@/components/thread/thread-prompt-composer"
import { PageLayout } from "@/components/shell/page-layout"
import { createAgentPromotionDraft } from "@/lib/api/agents-client"
import { decideToolApproval } from "@/lib/api/client"
import { useRuntimeHealth } from "@/lib/api/use-runtime-health"
import { useThreadSession } from "@/hooks/use-thread-session"
import { useThreadToolGrants } from "@/hooks/use-thread-tool-grants"
import { GENERIC_AGENTIS_AGENT_ID, type RunStep, type ThreadMode } from "@workspace/shared"

type ThreadAgentIndicatorProps = {
  agentHref: string | null
  agentName: string
}

function ThreadAgentIndicator({
  agentHref,
  agentName,
}: ThreadAgentIndicatorProps) {
  const nameClassName = "truncate text-xs font-medium text-foreground"

  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2">
      <span className="text-muted-foreground text-xs">Active agent</span>
      <span className="h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
      {agentHref ? (
        <Link className={nameClassName} to={agentHref}>
          {agentName}
        </Link>
      ) : (
        <span className={nameClassName}>{agentName}</span>
      )}
    </div>
  )
}

function getPendingApproval(step: RunStep) {
  const payload = step.payload
  if (!payload || typeof payload !== "object") return null
  const record = payload as Record<string, unknown>
  const approval =
    typeof record.approval === "object" && record.approval !== null
      ? (record.approval as Record<string, unknown>)
      : null
  if (approval?.status !== "pending") return null
  const firstChangedFile = Array.isArray(record.changedFiles)
    ? (record.changedFiles[0] as { path?: unknown } | undefined)
    : undefined
  return {
    toolCallId:
      typeof record.toolCallId === "string" ? record.toolCallId : null,
    toolName:
      typeof record.toolName === "string" ? record.toolName : "workspace edit",
    path:
      typeof firstChangedFile?.path === "string" ? firstChangedFile.path : undefined,
  }
}

type ThreadHeaderActionsProps = {
  canAbort: boolean
  canCreateAgentFromThread: boolean
  creatingAgentDraft: boolean
  onAbort: () => void
  onCreateAgentFromThread: () => void
  owningAgentId: string | null
}

function ThreadHeaderActions({
  canAbort,
  canCreateAgentFromThread,
  creatingAgentDraft,
  onAbort,
  onCreateAgentFromThread,
  owningAgentId,
}: ThreadHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {canAbort ? (
        <Button type="button" variant="outline" size="sm" onClick={onAbort}>
          Abort
        </Button>
      ) : null}
      {canCreateAgentFromThread ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={creatingAgentDraft}
          onClick={onCreateAgentFromThread}
        >
          {creatingAgentDraft ? "Preparing agent setup…" : "Create agent from thread"}
        </Button>
      ) : null}
      {owningAgentId ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={`/agents/${encodeURIComponent(owningAgentId)}`} />}
        >
          Open agent
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link to="/threads/new">New thread</Link>}
      />
    </div>
  )
}

export function ThreadDetailPage() {
  const { threadId } = useParams()
  const navigate = useNavigate()
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
    refresh,
    getMessageText,
  } = useThreadSession(threadId)
  const {
    grants: toolGrants,
    availableToolkits,
    grantToolkit,
    revokeGrant,
  } = useThreadToolGrants(threadId)

  const [mode, setMode] = useState<ThreadMode>("plan")
  const [submitting, setSubmitting] = useState(false)
  const [creatingAgentDraft, setCreatingAgentDraft] = useState(false)
  const [createAgentError, setCreateAgentError] = useState<string | null>(null)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [decidingApproval, setDecidingApproval] = useState<string | null>(null)

  useEffect(() => {
    if (detail?.thread.mode) {
      setMode(detail.thread.mode)
    }
  }, [detail?.thread.mode])

  const composerDisabled = !health.available
  const owningAgentId = detail?.thread?.agentId ?? null
  const fullAgentId =
    owningAgentId && owningAgentId !== GENERIC_AGENTIS_AGENT_ID
      ? owningAgentId
      : null
  const agentHref = fullAgentId
    ? `/agents/${encodeURIComponent(fullAgentId)}`
    : null
  const activeAgentName =
    detail?.thread.agentNameSnapshot?.trim() ||
    (owningAgentId === GENERIC_AGENTIS_AGENT_ID
      ? "Agentis"
      : owningAgentId || "Agent unavailable")
  const canCreateAgentFromThread = Boolean(
    detail?.thread?.agentId === GENERIC_AGENTIS_AGENT_ID
  )
  const pendingApprovals = steps
    .map((step) => ({ step, approval: getPendingApproval(step) }))
    .filter(
      (
        item
      ): item is {
        step: RunStep
        approval: NonNullable<ReturnType<typeof getPendingApproval>>
      } => Boolean(item.approval?.toolCallId)
    )

  const handleSubmit = async (prompt: string) => {
    if (!prompt.trim() || composerDisabled) return
    setSubmitting(true)
    try {
      await submitFollowUp(prompt.trim())
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprovalDecision = async (
    runId: string,
    toolCallId: string,
    decision: "approve" | "deny"
  ) => {
    setDecidingApproval(`${toolCallId}:${decision}`)
    setApprovalError(null)
    try {
      await decideToolApproval(runId, toolCallId, decision)
      await refresh()
    } catch (error) {
      setApprovalError(
        error instanceof Error ? error.message : "Could not update approval."
      )
    } finally {
      setDecidingApproval(null)
    }
  }

  const handleCreateAgentFromThread = async () => {
    if (!threadId || !canCreateAgentFromThread) return
    setCreatingAgentDraft(true)
    setCreateAgentError(null)
    try {
      const { draft } = await createAgentPromotionDraft(threadId)
      navigate(`/agents/new/from-thread/${draft.id}`)
    } catch (error) {
      setCreateAgentError(
        error instanceof Error
          ? error.message
          : "Could not start agent creation. Try again."
      )
    } finally {
      setCreatingAgentDraft(false)
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
          <ThreadHeaderActions
            canAbort={canAbort}
            canCreateAgentFromThread={canCreateAgentFromThread}
            creatingAgentDraft={creatingAgentDraft}
            onAbort={() => void abortActiveRun()}
            onCreateAgentFromThread={() => void handleCreateAgentFromThread()}
            owningAgentId={fullAgentId}
          />
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 flex-1 flex-col">
            <Conversation className="flex-1">
              <ConversationContent>
                {loading ? (
                  <p className="text-muted-foreground text-sm">Loading transcript…</p>
                ) : null}
                {error ? (
                  <p className="text-destructive text-sm" role="alert">
                    {error}
                  </p>
                ) : null}
                {createAgentError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {createAgentError}
                  </p>
                ) : null}
                {approvalError ? (
                  <p className="text-destructive text-sm" role="alert">
                    {approvalError}
                  </p>
                ) : null}
                {pendingApprovals.map(({ step, approval }) => (
                  <div
                    key={step.id}
                    className="rounded-lg border border-border bg-card/80 p-3 text-sm"
                  >
                    <p className="font-medium">Approve workspace edit?</p>
                    <p className="text-muted-foreground mt-1">
                      {approval.toolName}
                      {approval.path ? ` · ${approval.path}` : ""}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={Boolean(decidingApproval)}
                        onClick={() =>
                          void handleApprovalDecision(
                            step.runId,
                            approval.toolCallId!,
                            "approve"
                          )
                        }
                      >
                        {decidingApproval === `${approval.toolCallId}:approve`
                          ? "Approving…"
                          : "Approve"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={Boolean(decidingApproval)}
                        onClick={() =>
                          void handleApprovalDecision(
                            step.runId,
                            approval.toolCallId!,
                            "deny"
                          )
                        }
                      >
                        {decidingApproval === `${approval.toolCallId}:deny`
                          ? "Denying…"
                          : "Deny"}
                      </Button>
                    </div>
                  </div>
                ))}
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
                {detail ? (
                  <ThreadAgentIndicator
                    agentHref={agentHref}
                    agentName={activeAgentName}
                  />
                ) : null}
                <ThreadPromptComposer
                  onSubmit={handleSubmit}
                  disabled={composerDisabled || loading}
                  health={health}
                  mode={mode}
                  onModeChange={setMode}
                  submitting={submitting || streaming}
                  threadId={threadId}
                  toolGrants={toolGrants}
                  availableToolkits={availableToolkits}
                  onGrantTool={grantToolkit}
                  onRevokeTool={revokeGrant}
                />
              </div>
            </div>
          </div>

          <div className="flex w-80 shrink-0 flex-col border-l border-border">
            <ThreadProjectContext context={detail?.projectContext} />
            <RunTimeline run={latestRun} steps={steps} />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
