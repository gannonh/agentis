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
  const stableLabel = import.meta.env.VITE_COMMAND_PALETTE_SHORTCUT_LABEL
  if (typeof stableLabel === "string" && stableLabel.length > 0) {
    return stableLabel
  }

  if (typeof navigator === "undefined") {
    return "⌘K"
  }

  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } })
      .userAgentData?.platform ??
    navigator.platform ??
    ""
  return /mac|iphone|ipad|ipod/i.test(platform) ? "⌘K" : "Ctrl+K"
}
