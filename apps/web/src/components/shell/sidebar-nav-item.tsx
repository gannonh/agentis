import type { ReactNode } from "react"
import { NavLink, useMatch } from "react-router"
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"

type SidebarNavItemProps = {
  to: string
  end?: boolean
  children: ReactNode
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(isActive && "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground")

export function SidebarNavItem({ to, end, children }: SidebarNavItemProps) {
  const match = useMatch({ path: to, end: end ?? false })

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={Boolean(match)}
        render={<NavLink to={to} className={navLinkClass} end={end} />}
      >
        {children}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
