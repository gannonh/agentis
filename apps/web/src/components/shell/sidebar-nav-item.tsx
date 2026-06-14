import type { ReactNode } from "react"
import { NavLink, useMatch } from "react-router"
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { navLinkClass } from "@/components/shell/sidebar-nav-link-class"

type SidebarNavItemProps = {
  to: string
  end?: boolean
  children: ReactNode
}

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
