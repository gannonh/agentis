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
  query: string
  setQuery: (query: string) => void
}

export const GlobalSearchContext =
  createContext<GlobalSearchContextValue | null>(null)

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false)
  const [query, setQuery] = useState("")

  const setOpen = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery("")
    }
    setOpenState(nextOpen)
  }, [])

  const toggle = useCallback(() => {
    const nextOpen = !open
    if (!nextOpen) {
      setQuery("")
    }
    setOpenState(nextOpen)
  }, [open])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isCommandPaletteShortcut(event)) {
        return
      }

      if (!open && isEditableTarget(event.target)) {
        return
      }

      event.preventDefault()
      toggle()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, toggle])

  const value = useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      shortcutLabel: commandPaletteShortcutLabel(),
      query,
      setQuery,
    }),
    [open, query, setOpen, toggle]
  )

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  )
}
