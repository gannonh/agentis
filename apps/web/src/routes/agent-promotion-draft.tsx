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
import { GeneratedSuggestions } from "./agent-promotion-draft-suggestions"

type DraftFormState = AgentSetupFormState & {
  toolGrants: AgentToolGrantInput[]
}

type DraftEditedField = AgentPromotionDraft["editedFields"][number]
type DraftFormField = keyof DraftFormState

const formFieldEditedFields: Record<DraftFormField, DraftEditedField> = {
  name: "name",
  description: "description",
  model: "model",
  systemPrompt: "systemPrompt",
  toolGrants: "toolGrants",
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

function rubricCriteriaFromText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function rubricCriteriaToText(criteria: string[]): string {
  return criteria.join("\n")
}

function editedFieldsForPatch(patch: Partial<DraftFormState>): DraftEditedField[] {
  return Object.entries(formFieldEditedFields)
    .filter(([field]) => field in patch)
    .map(([, editedField]) => editedField)
}

function rubricCriteriaChanged(
  draft: AgentPromotionDraft,
  rubricCriteria: string[]
): boolean {
  return (
    JSON.stringify(rubricCriteria) !==
    JSON.stringify(draft.intelligence.rubricCriteria)
  )
}

export function AgentPromotionDraftPage() {
  const { draftId } = useParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<AgentPromotionDraft | null>(null)
  const [form, setForm] = useState<DraftFormState | null>(null)
  const [rubricText, setRubricText] = useState("")
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
        setRubricText(rubricCriteriaToText(loadedDraft.intelligence.rubricCriteria))
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
      uniqueEditedFields([...current, ...editedFieldsForPatch(patch)])
    )
  }

  const updateRubricText = (value: string) => {
    const rubricCriteria = rubricCriteriaFromText(value)
    setRubricText(value)
    setLocallyEditedFields((current) => {
      const next = current.filter((field) => field !== "rubricCriteria")
      if (draft && rubricCriteriaChanged(draft, rubricCriteria)) {
        return uniqueEditedFields([...next, "rubricCriteria"])
      }
      return next
    })
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
      const rubricCriteria = rubricCriteriaFromText(rubricText)
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        model: form.model.trim() || undefined,
        systemPrompt: form.systemPrompt.trim(),
        toolGrants: form.toolGrants,
      }
      const created = await createAgentFromPromotionDraft(
        draftId,
        draft && rubricCriteriaChanged(draft, rubricCriteria)
          ? {
              ...payload,
              draftUpdates: { intelligence: { rubricCriteria } },
            }
          : payload
      )
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
                    rubricText={rubricText}
                    onRubricChange={updateRubricText}
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
