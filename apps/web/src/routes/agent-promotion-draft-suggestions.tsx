import { Badge } from "@workspace/ui/components/badge"
import { Textarea } from "@workspace/ui/components/textarea"
import type { AgentPromotionDraft } from "@workspace/shared"

type DraftEditedField = AgentPromotionDraft["editedFields"][number]

const editableFieldLabels: Partial<Record<DraftEditedField, string>> = {
  name: "Name",
  description: "Description",
  systemPrompt: "Instructions",
  model: "Answer engine",
  toolGrants: "Connected apps",
  rubricCriteria: "Rubric criteria",
}

function editedFieldLabels(fields: DraftEditedField[]): string[] {
  return fields
    .map((field) => editableFieldLabels[field])
    .filter((label): label is string => Boolean(label))
}

type GeneratedSuggestionsProps = {
  draft: AgentPromotionDraft
  editedFields: DraftEditedField[]
  rubricText: string
  onRubricChange: (value: string) => void
}

export function GeneratedSuggestions({
  draft,
  editedFields,
  rubricText,
  onRubricChange,
}: GeneratedSuggestionsProps) {
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
              {intelligence.repeatedSteps.map((step, index) => (
                <li key={index}>{step}</li>
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

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor="draft-rubric-criteria">
            Rubric criteria
          </label>
          <p className="text-muted-foreground text-xs leading-relaxed">
            One criterion per line. These criteria stay with the draft for later evaluation.
          </p>
          <Textarea
            id="draft-rubric-criteria"
            value={rubricText}
            onChange={(event) => onRubricChange(event.target.value)}
            rows={4}
          />
        </div>
      </div>
    </section>
  )
}
