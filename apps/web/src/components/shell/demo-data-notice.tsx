import type { ReactNode } from "react"

export function DemoDataNotice({ children }: { children: ReactNode }) {
  return (
    <aside
      role="note"
      aria-label="Demo data notice"
      className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
    >
      <span className="font-medium text-foreground">Demo data:</span> {children}
    </aside>
  )
}
