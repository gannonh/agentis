import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import type { AgentPromotionDraft, AgentToolGrantInput } from "@workspace/shared"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import {
  createAgent,
  getAgentPromotionDraft,
  updateAgentPromotionDraft,
} from "@/lib/api/agents-client"

type DraftFormState = {
  name: string
  description: string
  model: string
  systemPrompt: string
  toolGrants: AgentToolGrantInput[]
}

function draftToForm(draft: AgentPromotionDraft): DraftFormState {
  return {
    name: draft.name,
    description: draft.description ?? "",
    model: draft.model,
    systemPrompt: draft.systemPrompt,
    toolGrants: draft.toolGrants,
  }
}

export function AgentPromotionDraftPage() {
  const { draftId } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<AgentPromotionDraft | null>(null)
  const [form, setForm] = useState<DraftFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!draftId) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    void getAgentPromotionDraft(draftId)
      .then(({ draft: loadedDraft }) => {
        if (cancelled) return
        setDraft(loadedDraft)
        setForm(draftToForm(loadedDraft))
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load this draft."
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [draftId])

  const updateForm = (patch: Partial<DraftFormState>) => {
    setForm((current) => (current ? { ...current, ...patch } : current))
  }

  const toggleToolGrant = (grant: AgentToolGrantInput, selected: boolean) => {
    if (!form) return
    updateForm({
      toolGrants: selected
        ? [...form.toolGrants, grant]
        : form.toolGrants.filter(
            (item) => item.toolkitSlug !== grant.toolkitSlug
          ),
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draftId || !form || !form.name.trim() || !form.systemPrompt.trim()) return

    setSubmitting(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      model: form.model.trim() || undefined,
      systemPrompt: form.systemPrompt.trim(),
      toolGrants: form.toolGrants,
    }

    try {
      const { draft: savedDraft } = await updateAgentPromotionDraft(
        draftId,
        payload
      )
      const created = await createAgent({
        name: savedDraft.name,
        description: savedDraft.description,
        model: savedDraft.model,
        systemPrompt: savedDraft.systemPrompt,
        toolGrants: savedDraft.toolGrants,
      })
      navigate(`/agents/${encodeURIComponent(created.agent.id)}`)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't create this agent. Check the details and try again."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout variant="focused" className="gap-6">
      <PageHeader
        title="Review promoted agent"
        titleClassName="text-3xl font-medium tracking-tight"
        description="Review the draft from this completed thread, edit what the agent should do, then create it."
      />

      <Card>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">Agent draft</CardTitle>
            <CardDescription>
              {draft
                ? `Source thread: ${draft.sourceThreadTitle || draft.threadId}`
                : "Loading draft details…"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading draft…</p>
            ) : null}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {form ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="text-sm font-medium" htmlFor="draft-name">
                      Name <span className="text-destructive" aria-hidden>*</span>
                    </label>
                    <Input
                      id="draft-name"
                      value={form.name}
                      onChange={(event) => updateForm({ name: event.target.value })}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="draft-description"
                    >
                      Description
                    </label>
                    <Textarea
                      id="draft-description"
                      value={form.description}
                      onChange={(event) =>
                        updateForm({ description: event.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium" htmlFor="draft-model">
                      Answer engine
                    </label>
                    <Input
                      id="draft-model"
                      value={form.model}
                      onChange={(event) => updateForm({ model: event.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="draft-system-prompt"
                  >
                    Instructions <span className="text-destructive" aria-hidden>*</span>
                  </label>
                  <Textarea
                    id="draft-system-prompt"
                    value={form.systemPrompt}
                    onChange={(event) =>
                      updateForm({ systemPrompt: event.target.value })
                    }
                    rows={7}
                    required
                  />
                </div>

                <fieldset className="flex flex-col gap-3">
                  <legend className="text-sm font-medium">Connected apps</legend>
                  {draft?.toolGrants.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {draft.toolGrants.map((grant) => {
                        const selected = form.toolGrants.some(
                          (item) => item.toolkitSlug === grant.toolkitSlug
                        )
                        return (
                          <label
                            key={grant.toolkitSlug}
                            className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) =>
                                toggleToolGrant(grant, event.target.checked)
                              }
                            />
                            {grant.toolkitSlug}
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm">
                      This draft has no connected apps.
                    </p>
                  )}
                </fieldset>
              </>
            ) : null}
          </CardContent>
          <CardFooter className="mt-2 flex justify-between gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/threads/new" />}
              className="min-h-11 sm:min-h-7"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !form ||
                form.name.trim().length === 0 ||
                form.systemPrompt.trim().length === 0 ||
                submitting
              }
              className="min-h-11 sm:min-h-7"
            >
              {submitting ? "Creating…" : "Create agent"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageLayout>
  )
}
