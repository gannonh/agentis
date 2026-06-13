/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  commandPaletteShortcutLabel,
  isCommandPaletteShortcut,
  isEditableTarget,
} from "@/lib/keyboard"

export type GlobalSearchContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  shortcutLabel: string
}

export const GlobalSearchContext =
  createContext<GlobalSearchContextValue | null>(null)

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCommandPaletteShortcut(event) || isEditableTarget(event.target)) {
        return
      }

      event.preventDefault()
      toggle()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggle])

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      shortcutLabel: commandPaletteShortcutLabel(),
    }),
    [open, toggle]
  )

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  )
}
