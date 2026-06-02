import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import type { AgentSetupFormState } from "./agent-setup-form"

type AgentSetupFieldsProps = {
  value: AgentSetupFormState
  onChange: (patch: Partial<AgentSetupFormState>) => void
  idPrefix: string
  modelHelp?: string
  systemPromptHelp?: string
  systemPromptPlaceholder?: string
}

export function AgentSetupFields({
  value,
  onChange,
  idPrefix,
  modelHelp,
  systemPromptHelp,
  systemPromptPlaceholder,
}: AgentSetupFieldsProps) {
  const nameId = `${idPrefix}-name`
  const descriptionId = `${idPrefix}-description`
  const modelId = `${idPrefix}-model`
  const modelHelpId = `${idPrefix}-model-help`
  const systemPromptId = `${idPrefix}-system-prompt`

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor={nameId}>
            Name <span className="text-destructive" aria-hidden>*</span>
          </label>
          <Input
            id={nameId}
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="e.g., Research Agent"
            required
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium" htmlFor={descriptionId}>
            Description
          </label>
          <Textarea
            id={descriptionId}
            value={value.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="What does this agent help with?"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor={modelId}>
            Answer engine
          </label>
          <Input
            id={modelId}
            value={value.model}
            onChange={(event) => onChange({ model: event.target.value })}
            placeholder="openai/gpt-4o-mini"
            aria-describedby={modelHelp ? modelHelpId : undefined}
          />
          {modelHelp ? (
            <p
              id={modelHelpId}
              className="text-muted-foreground text-xs leading-relaxed"
            >
              {modelHelp}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor={systemPromptId}>
          Instructions <span className="text-destructive" aria-hidden>*</span>
        </label>
        {systemPromptHelp ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {systemPromptHelp}
          </p>
        ) : null}
        <Textarea
          id={systemPromptId}
          value={value.systemPrompt}
          onChange={(event) => onChange({ systemPrompt: event.target.value })}
          placeholder={systemPromptPlaceholder}
          rows={7}
          required
        />
      </div>
    </>
  )
}
