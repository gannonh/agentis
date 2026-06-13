export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const editableParent = target.closest(
    "input, textarea, select, [contenteditable='true']"
  )
  if (editableParent) {
    return true
  }

  return false
}

export function isCommandPaletteShortcut(event: KeyboardEvent) {
  return (
    (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
  )
}

export function commandPaletteShortcutLabel() {
  if (typeof navigator === "undefined") {
    return "⌘K"
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘K" : "Ctrl+K"
}
