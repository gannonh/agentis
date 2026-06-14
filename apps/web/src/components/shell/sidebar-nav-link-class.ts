import { cn } from "@workspace/ui/lib/utils"

export const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    isActive &&
      "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
  )
