import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

type PageLayoutVariant = "workspace" | "fixed" | "focused" | "narrow"

type PageLayoutProps = {
  variant?: PageLayoutVariant
  children: ReactNode
  className?: string
}

const variantClass: Record<PageLayoutVariant, string> = {
  workspace: "flex w-full flex-col gap-8",
  fixed: "mx-auto flex w-full max-w-[974px] flex-col gap-8",
  focused: "mx-auto flex w-full max-w-3xl flex-col gap-8",
  narrow: "mx-auto flex w-full max-w-lg flex-col gap-8",
}

/** Route-level width and rhythm. Workspace routes use full inset width; centered routes stay constrained. */
export function PageLayout({
  variant = "workspace",
  children,
  className,
}: PageLayoutProps) {
  return <div className={cn(variantClass[variant], className)}>{children}</div>
}
