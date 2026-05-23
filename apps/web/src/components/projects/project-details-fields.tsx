import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

type ProjectDetailsFieldsProps = {
  name: string
  onNameChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  goals: string
  onGoalsChange: (value: string) => void
  nameRequired?: boolean
  namePlaceholder?: string
  descriptionPlaceholder?: string
  goalsPlaceholder?: string
  showGoalsHint?: boolean
}

export function ProjectDetailsFields({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  goals,
  onGoalsChange,
  nameRequired = false,
  namePlaceholder,
  descriptionPlaceholder,
  goalsPlaceholder,
  showGoalsHint = false,
}: ProjectDetailsFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="project-name" className="text-sm font-medium">
          Name
          {nameRequired ? (
            <span className="text-destructive ml-0.5" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        <Input
          id="project-name"
          required={nameRequired}
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="project-description" className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id="project-description"
          rows={3}
          placeholder={descriptionPlaceholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="project-goals" className="text-sm font-medium">
          Goals
        </label>
        <Textarea
          id="project-goals"
          rows={5}
          placeholder={goalsPlaceholder}
          value={goals}
          onChange={(e) => onGoalsChange(e.target.value)}
        />
        {showGoalsHint ? (
          <p className="text-muted-foreground text-xs">
            Goals are injected into every thread&apos;s context, helping the agent
            stay aligned with project objectives.
          </p>
        ) : null}
      </div>
    </>
  )
}
