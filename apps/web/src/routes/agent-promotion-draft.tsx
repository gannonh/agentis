import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import type { AgentPromotionDraft, AgentToolGrantInput } from "@workspace/shared"
import { AgentSetupFields } from "@/components/agents/agent-setup-fields"
import {
  canSubmitAgentSetup,
  type AgentSetupFormState,
} from "@/components/agents/agent-setup-form"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import {
  createAgentFromPromotionDraft,
  getAgentPromotionDraft,
} from "@/lib/api/agents-client"

type DraftFormState = AgentSetupFormState & {
  toolGrants: AgentToolGrantInput[]
}

type DraftEditedField = AgentPromotionDraft["editedFields"][number]

const editableFieldLabels: Partial<Record<DraftEditedField, string>> = {
  name: "Name",
  description: "Description",
  systemPrompt: "Instructions",
  model: "Answer engine",
  toolGrants: "Connected apps",
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function sourceThreadLabel(draft: AgentPromotionDraft | null): string {
  if (!draft) return "Loading draft details…"
  return `Source thread: ${draft.sourceThreadTitle || draft.threadId}`
}

function canSubmit(form: DraftFormState | null, submitting: boolean): boolean {
  return canSubmitAgentSetup(form, submitting)
}

function uniqueEditedFields(fields: DraftEditedField[]): DraftEditedField[] {
  return Array.from(new Set(fields))
}

function editedFieldLabels(fields: DraftEditedField[]): string[] {
  return fields
    .map((field) => editableFieldLabels[field])
    .filter((label): label is string => Boolean(label))
}

function GeneratedSuggestions({
  draft,
  editedFields,
}: {
  draft: AgentPromotionDraft
  editedFields: DraftEditedField[]
}) {
  const intelligence = draft.intelligence
  const labels = editedFieldLabels(editedFields)

  return (
    <section className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Generated suggestions</h2>
        {labels.length ? (
          <div className="flex flex-wrap gap-2" aria-label="Edited fields">
            {labels.map((label) => (
              <Badge key={label} variant="outline">
                {label} edited
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        {intelligence.suggestedPurpose ? (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Purpose
            </p>
            <p>{intelligence.suggestedPurpose}</p>
          </div>
        ) : null}

        {intelligence.repeatedSteps.length ? (
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Repeated steps
            </p>
            <ul className="list-disc space-y-1 pl-4">
              {intelligence.repeatedSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Required tools
          </p>
          {intelligence.requiredTools.length ? (
            <ul className="list-disc space-y-1 pl-4">
              {intelligence.requiredTools.map((tool) => (
                <li key={`${tool.toolkitSlug}-${tool.connectionId ?? "none"}`}>
                  {tool.toolkitSlug}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No required tools detected.</p>
          )}
        </div>

        {intelligence.suggestedPrompt ? (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Suggested prompt
            </p>
            <p>{intelligence.suggestedPrompt}</p>
          </div>
        ) : null}

        {intelligence.modelRecommendation ? (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <p>
              Recommended answer engine: {intelligence.modelRecommendation.model}
            </p>
            {intelligence.modelRecommendation.reason ? (
              <p className="text-muted-foreground">
                {intelligence.modelRecommendation.reason}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function AgentPromotionDraftPage() {
  const { draftId } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<AgentPromotionDraft | null>(null)
  const [form, setForm] = useState<DraftFormState | null>(null)
  const [locallyEditedFields, setLocallyEditedFields] = useState<
    DraftEditedField[]
  >([])
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
        setLocallyEditedFields([])
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(errorMessage(loadError, "Could not load this draft."))
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
    setLocallyEditedFields((current) =>
      uniqueEditedFields([...current, ...(Object.keys(patch) as DraftEditedField[])])
    )
  }

  const toggleToolGrant = (grant: AgentToolGrantInput, selected: boolean) => {
    if (!form) return

    const toolGrants = selected
      ? [...form.toolGrants, grant]
      : form.toolGrants.filter((item) => item.toolkitSlug !== grant.toolkitSlug)

    updateForm({ toolGrants })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draftId || !form || !canSubmit(form, submitting)) return

    setSubmitting(true)
    setError(null)

    try {
      const created = await createAgentFromPromotionDraft(draftId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        model: form.model.trim() || undefined,
        systemPrompt: form.systemPrompt.trim(),
        toolGrants: form.toolGrants,
      })
      navigate(`/agents/${encodeURIComponent(created.agent.id)}`)
    } catch (submitError) {
      setError(
        errorMessage(
          submitError,
          "We couldn't create this agent. Check the details and try again."
        )
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageLayout variant="focused" className="gap-6">
      <PageHeader
        title="Create agent from thread"
        titleClassName="text-3xl font-medium tracking-tight"
        description="Review the draft seeded from this thread, edit what the agent should do, then create it."
      />

      <Card>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">Agent draft</CardTitle>
            <CardDescription>{sourceThreadLabel(draft)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading draft…</p>
            ) : null}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {form ? (
              <>
                <AgentSetupFields
                  idPrefix="draft"
                  value={form}
                  onChange={updateForm}
                />

                {draft ? (
                  <GeneratedSuggestions
                    draft={draft}
                    editedFields={uniqueEditedFields([
                      ...draft.editedFields,
                      ...locallyEditedFields,
                    ])}
                  />
                ) : null}

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
              render={
                <Link
                  to={
                    draft
                      ? `/threads/${encodeURIComponent(draft.threadId)}`
                      : "/threads/new"
                  }
                />
              }
              className="min-h-11 sm:min-h-7"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit(form, submitting)}
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
