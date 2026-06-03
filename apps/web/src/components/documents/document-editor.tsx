import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"

type DocumentEditorProps = {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  saving?: boolean
  disabled?: boolean
  error?: string | null
}

export function DocumentEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving = false,
  disabled = false,
  error,
}: DocumentEditorProps) {
  const canSave = !disabled && !saving && value.trim().length > 0

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || saving}
        className="min-h-[min(70vh,48rem)] font-mono text-xs"
        aria-label="Markdown editor"
      />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={!canSave}>
          {saving ? "Saving…" : "Save new version"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
