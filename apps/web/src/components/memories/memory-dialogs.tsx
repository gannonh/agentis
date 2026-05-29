import type { FormEvent, ReactElement } from "react"
import { useState } from "react"
import type {
  CreateSavedMemoryRequest,
  SavedMemory,
  SavedMemoryCategory,
  SavedMemoryCategoryKey,
  UpdateSavedMemoryRequest,
} from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import type { MemoryScopeOption } from "./memory-scope-options"

type AddMemoryFormState = CreateSavedMemoryRequest & {
  tagsText: string
}

const DEFAULT_ADD_MEMORY_FORM: AddMemoryFormState = {
  content: "",
  category: "memory_category_user_fact",
  importance: "medium",
  usageGuidance: "",
  tags: [],
  tagsText: "",
  scope: "global",
  associatedAgents: [],
  pinnedToContext: false,
}

function parseTags(tagsText: string): string[] {
  return tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function getScopeSelection(form: AddMemoryFormState): string[] {
  if (form.scope === "global") return ["global"]
  return form.associatedAgents ?? []
}

function getScopeFormPatch(
  currentValues: string[],
  nextValues: string[]
): Pick<AddMemoryFormState, "scope" | "associatedAgent" | "associatedAgents"> {
  let selected = nextValues

  if (nextValues.includes("global")) {
    selected = []
    if (currentValues.includes("global")) {
      selected = nextValues.filter((value) => value !== "global")
    }
  }

  return {
    scope: selected.length > 0 ? "agent" : "global",
    associatedAgent: selected[0],
    associatedAgents: selected,
  }
}

function getMemoryFormState(memory: SavedMemory): AddMemoryFormState {
  return {
    content: memory.content,
    category: memory.category,
    importance: memory.importance,
    usageGuidance: memory.usageGuidance,
    tags: memory.tags,
    tagsText: memory.tags.join(", "),
    scope: memory.scope,
    associatedAgent: memory.associatedAgent ?? undefined,
    associatedAgents: memory.associatedAgents,
    pinnedToContext: memory.pinnedToContext,
  }
}

function getMemoryRequestFromForm(
  form: AddMemoryFormState
): CreateSavedMemoryRequest {
  return {
    content: form.content,
    category: form.category,
    importance: form.importance,
    usageGuidance: form.usageGuidance,
    tags: parseTags(form.tagsText),
    scope: form.scope,
    associatedAgent: form.scope === "agent" ? form.associatedAgent : undefined,
    associatedAgents: form.scope === "agent" ? form.associatedAgents : [],
    pinnedToContext: form.pinnedToContext,
  }
}

type MemoryScopeComboboxProps = {
  value: string[]
  scopeOptions: MemoryScopeOption[]
  onChange: (value: string[]) => void
}

function MemoryScopeCombobox({
  value,
  scopeOptions,
  onChange,
}: MemoryScopeComboboxProps): ReactElement {
  const anchor = useComboboxAnchor()
  const labelsByValue = new Map(
    scopeOptions.map((option) => [option.value, option.label])
  )

  return (
    <Combobox
      multiple
      autoHighlight
      items={scopeOptions.map((option) => option.value)}
      value={value}
      onValueChange={onChange}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <>
              {(values as string[]).map((item) => (
                <ComboboxChip key={item}>
                  {labelsByValue.get(item) ?? item}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Select scope" />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No agents found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {labelsByValue.get(item) ?? item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

type MemoryFormFieldsProps = {
  form: AddMemoryFormState
  categories: SavedMemoryCategory[]
  scopeOptions: MemoryScopeOption[]
  mode: "add" | "edit"
  onChange: (form: AddMemoryFormState) => void
}

function MemoryFormFields({
  form,
  categories,
  scopeOptions,
  mode,
  onChange,
}: MemoryFormFieldsProps): ReactElement {
  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium">
        Memory Content
        <Textarea
          required
          value={form.content}
          onChange={(event) =>
            onChange({
              ...form,
              content: event.target.value,
            })
          }
          placeholder={
            mode === "add"
              ? "E.g., 'User prefers TypeScript over JavaScript'"
              : undefined
          }
          className="min-h-24 text-sm"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Category
          <select
            className="h-9 rounded-md border border-input bg-input/20 px-3 text-sm"
            value={form.category}
            onChange={(event) =>
              onChange({
                ...form,
                category: event.target.value as SavedMemoryCategoryKey,
              })
            }
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          Importance (1-5)
          <select
            className="h-9 rounded-md border border-input bg-input/20 px-3 text-sm"
            value={form.importance}
            onChange={(event) =>
              onChange({
                ...form,
                importance: event.target.value as SavedMemory["importance"],
              })
            }
          >
            <option value="low">1 low</option>
            <option value="medium">3 medium</option>
            <option value="high">5 high</option>
          </select>
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium">
        {mode === "add" ? "When to Use (optional)" : "When to Use"}
        <Input
          value={form.usageGuidance}
          onChange={(event) =>
            onChange({
              ...form,
              usageGuidance: event.target.value,
            })
          }
          placeholder={
            mode === "add"
              ? "E.g., 'When researching consumer products'"
              : undefined
          }
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        {mode === "add" ? "Tags (optional)" : "Tags"}
        <Input
          value={form.tagsText}
          onChange={(event) =>
            onChange({
              ...form,
              tagsText: event.target.value,
            })
          }
          placeholder={
            mode === "add" ? "E.g., preferences, coding, typescript" : undefined
          }
        />
        {mode === "add" ? (
          <span className="text-xs font-normal text-muted-foreground">
            Comma-separated tags for better searchability
          </span>
        ) : null}
      </label>

      <label className="grid gap-1.5 text-sm font-medium">
        Scope
        <MemoryScopeCombobox
          value={getScopeSelection(form)}
          scopeOptions={scopeOptions}
          onChange={(values) =>
            onChange({
              ...form,
              ...getScopeFormPatch(getScopeSelection(form), values),
            })
          }
        />
      </label>

      <button
        type="button"
        role="switch"
        aria-checked={form.pinnedToContext}
        aria-label="Pin to Context"
        className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-left"
        onClick={() =>
          onChange({
            ...form,
            pinnedToContext: !form.pinnedToContext,
          })
        }
      >
        <span className={mode === "add" ? "grid gap-0.5" : undefined}>
          <span className="text-sm font-medium">Pin to Context</span>
          {mode === "add" ? (
            <span className="text-xs text-muted-foreground">
              Always include in agent's context
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "flex h-5 w-9 items-center rounded-full border border-border p-0.5 transition-colors",
            form.pinnedToContext ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full bg-foreground transition-transform",
              form.pinnedToContext && "translate-x-4 bg-primary-foreground"
            )}
          />
        </span>
      </button>
    </>
  )
}

type MemoryFormDialogProps = {
  open: boolean
  categories: SavedMemoryCategory[]
  saving: boolean
  error: string | null
  scopeOptions: MemoryScopeOption[]
  title: string
  description: ReactElement | string
  submitLabel: string
  mode: "add" | "edit"
  initialForm: AddMemoryFormState
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CreateSavedMemoryRequest) => Promise<void>
}

function MemoryFormDialog({
  open,
  categories,
  saving,
  error,
  scopeOptions,
  title,
  description,
  submitLabel,
  mode,
  initialForm,
  onOpenChange,
  onSubmit,
}: MemoryFormDialogProps): ReactElement {
  const [form, setForm] = useState<AddMemoryFormState>(initialForm)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()
    await onSubmit(getMemoryRequestFromForm(form))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <MemoryFormFields
            form={form}
            categories={categories}
            scopeOptions={scopeOptions}
            mode={mode}
            onChange={setForm}
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.content.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type AddMemoryDialogProps = {
  open: boolean
  categories: SavedMemoryCategory[]
  saving: boolean
  error: string | null
  selectedCategory: SavedMemoryCategoryKey | null
  scopeOptions: MemoryScopeOption[]
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateSavedMemoryRequest) => Promise<void>
}

export function AddMemoryDialog({
  open,
  categories,
  saving,
  error,
  selectedCategory,
  scopeOptions,
  onOpenChange,
  onCreate,
}: AddMemoryDialogProps): ReactElement {
  return (
    <MemoryFormDialog
      open={open}
      categories={categories}
      saving={saving}
      error={error}
      scopeOptions={scopeOptions}
      title="Add Memory"
      description="Add something you want the agent to remember."
      submitLabel="Add Memory"
      mode="add"
      initialForm={{
        ...DEFAULT_ADD_MEMORY_FORM,
        category:
          selectedCategory ??
          categories[0]?.id ??
          DEFAULT_ADD_MEMORY_FORM.category,
      }}
      onOpenChange={onOpenChange}
      onSubmit={onCreate}
    />
  )
}

type EditMemoryDialogProps = {
  memory: SavedMemory
  open: boolean
  categories: SavedMemoryCategory[]
  saving: boolean
  error: string | null
  scopeOptions: MemoryScopeOption[]
  onOpenChange: (open: boolean) => void
  onUpdate: (memoryId: string, input: UpdateSavedMemoryRequest) => Promise<void>
}

export function EditMemoryDialog({
  memory,
  open,
  categories,
  saving,
  error,
  scopeOptions,
  onOpenChange,
  onUpdate,
}: EditMemoryDialogProps): ReactElement {
  return (
    <MemoryFormDialog
      open={open}
      categories={categories}
      saving={saving}
      error={error}
      scopeOptions={scopeOptions}
      title="Edit Memory"
      description="Update reusable context. Provenance stays tied to where the memory came from."
      submitLabel="Save Memory"
      mode="edit"
      initialForm={getMemoryFormState(memory)}
      onOpenChange={onOpenChange}
      onSubmit={(input) => onUpdate(memory.id, input)}
    />
  )
}
