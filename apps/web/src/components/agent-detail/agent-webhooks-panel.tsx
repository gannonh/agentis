import { useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import type {
  AgentWebhook,
  CreateAgentWebhookRequest,
  UpdateAgentWebhookRequest,
} from "@workspace/shared"
import { useAgentWebhooks } from "@/hooks/use-agent-webhooks"
import { useProjects } from "@/hooks/use-projects"

type WebhookFormState = {
  name: string
  promptTemplate: string
  projectId: string
}

function emptyFormState(): WebhookFormState {
  return {
    name: "",
    promptTemplate: "Summarize this payload: {{payload}}",
    projectId: "",
  }
}

function formStateFromWebhook(webhook: AgentWebhook): WebhookFormState {
  return {
    name: webhook.name,
    promptTemplate: webhook.promptTemplate,
    projectId: webhook.projectId ?? "",
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleString()
}

function submitButtonLabel(saving: boolean, editing: boolean): string {
  if (saving) return "Saving…"
  if (editing) return "Save changes"
  return "Create webhook"
}

function actionErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export function AgentWebhooksPanel({ agentId }: { agentId: string }) {
  const {
    webhooks,
    loading,
    error,
    createWebhook,
    saveWebhook,
    removeWebhook,
    rotateSecret,
  } = useAgentWebhooks(agentId)
  const { projects } = useProjects()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<AgentWebhook | null>(
    null
  )
  const [form, setForm] = useState<WebhookFormState>(emptyFormState)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [secretDialog, setSecretDialog] = useState<{
    title: string
    secret: string
  } | null>(null)
  const [rotateTarget, setRotateTarget] = useState<AgentWebhook | null>(null)

  const sortedWebhooks = useMemo(
    () =>
      [...webhooks].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      ),
    [webhooks]
  )

  function openCreateDialog() {
    setEditingWebhook(null)
    setForm(emptyFormState())
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(webhook: AgentWebhook) {
    setEditingWebhook(webhook)
    setForm(formStateFromWebhook(webhook))
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const payload: CreateAgentWebhookRequest = {
        name: form.name.trim(),
        promptTemplate: form.promptTemplate.trim(),
        projectId: form.projectId.trim() ? form.projectId.trim() : null,
      }
      if (!payload.name || !payload.promptTemplate) {
        setFormError("Name and prompt template are required.")
        return
      }

      if (editingWebhook) {
        const updatePayload: UpdateAgentWebhookRequest = payload
        await saveWebhook(editingWebhook.id, updatePayload)
        setDialogOpen(false)
      } else {
        const created = await createWebhook(payload)
        setDialogOpen(false)
        setSecretDialog({
          title: "Webhook secret",
          secret: created.secret,
        })
      }
    } catch (submitError) {
      setFormError(actionErrorMessage(submitError, "Failed to save webhook"))
    } finally {
      setSaving(false)
    }
  }

  async function toggleWebhook(webhook: AgentWebhook) {
    setActionError(null)
    try {
      await saveWebhook(webhook.id, {
        status: webhook.status === "enabled" ? "disabled" : "enabled",
      })
    } catch (toggleError) {
      setActionError(actionErrorMessage(toggleError, "Failed to update webhook"))
    }
  }

  async function handleRemoveWebhook(webhookId: string) {
    setActionError(null)
    try {
      await removeWebhook(webhookId)
    } catch (removeError) {
      setActionError(actionErrorMessage(removeError, "Failed to delete webhook"))
    }
  }

  async function confirmRotateSecret() {
    if (!rotateTarget) return
    setSaving(true)
    setActionError(null)
    try {
      const rotated = await rotateSecret(rotateTarget.id)
      setRotateTarget(null)
      setSecretDialog({
        title: "Rotated webhook secret",
        secret: rotated.secret,
      })
    } catch (rotateError) {
      setActionError(actionErrorMessage(rotateError, "Failed to rotate secret"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3" data-testid="agent-webhooks-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Webhooks</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Trigger this agent with signed JSON POST requests.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreateDialog}>
          Create webhook
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      {actionError ? (
        <p className="text-sm text-destructive">{actionError}</p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-border bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          Loading webhooks…
        </p>
      ) : sortedWebhooks.length === 0 ? (
        <p className="rounded-xl border border-border bg-card/70 px-4 py-5 text-sm text-muted-foreground">
          No webhooks yet. Create one to invoke this agent from automation.
        </p>
      ) : (
        sortedWebhooks.map((webhook) => (
          <article
            key={webhook.id}
            className="rounded-xl border border-border bg-card/70 p-4"
            data-testid={`agent-webhook-${webhook.id}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium">{webhook.name}</h3>
                  <Badge variant="secondary">
                    {webhook.status === "enabled" ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant="outline">{webhook.secretPrefix}…</Badge>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {webhook.url}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Last delivery: {formatTimestamp(webhook.lastDeliveryAt)}
                  {webhook.lastDeliveryStatus
                    ? ` (${webhook.lastDeliveryStatus})`
                    : ""}
                </p>
                {webhook.lastFailureReason ? (
                  <p className="mt-1 text-xs text-destructive">
                    {webhook.lastFailureReason}
                  </p>
                ) : null}
                {webhook.lastThreadId ? (
                  <p className="mt-2 text-xs">
                    <Link
                      to={`/threads/${webhook.lastThreadId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      View last run thread
                    </Link>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copyText(webhook.url)}
                >
                  Copy URL
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(webhook)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRotateTarget(webhook)}
                >
                  Rotate secret
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void toggleWebhook(webhook)}
                >
                  {webhook.status === "enabled" ? "Disable" : "Enable"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemoveWebhook(webhook.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? "Edit webhook" : "Create webhook"}
              </DialogTitle>
            </DialogHeader>
            <label className="flex flex-col gap-1 text-sm">
              <span>Name</span>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Prompt template</span>
              <Textarea
                value={form.promptTemplate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promptTemplate: event.target.value,
                  }))
                }
                rows={4}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Project (optional)</span>
              <select
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                value={form.projectId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                  }))
                }
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <DialogFooter>
              <Button type="submit" size="sm" disabled={saving}>
                {submitButtonLabel(saving, Boolean(editingWebhook))}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(secretDialog)}
        onOpenChange={(open) => {
          if (!open) setSecretDialog(null)
        }}
      >
        <DialogContent data-testid="webhook-secret-dialog">
          <DialogHeader>
            <DialogTitle>{secretDialog?.title ?? "Webhook secret"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copy this secret now. It will not be shown again.
          </p>
          <code className="block break-all rounded-lg bg-muted px-3 py-2 text-xs">
            {secretDialog?.secret}
          </code>
          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (secretDialog) void copyText(secretDialog.secret)
              }}
            >
              Copy secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rotateTarget)}
        onOpenChange={(open) => {
          if (!open) setRotateTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate webhook secret?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Existing integrations must update to the new secret immediately.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRotateTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void confirmRotateSecret()}
            >
              {saving ? "Rotating…" : "Rotate secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
