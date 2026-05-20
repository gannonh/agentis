import { NavLink, useMatch } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  BookOpen01Icon,
  CommandIcon,
  HelpCircleIcon,
  Link01Icon,
  Search01Icon,
  SparklesIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import { SidebarNavItem } from "@/components/shell/sidebar-nav-item"
import { getNavAgents, getWorkspace } from "@/fixtures"
import type { Thread } from "@/fixtures/schema"

const agentIcons = {
  search: Search01Icon,
  command: CommandIcon,
} as const

function agentNavIcon(icon?: string) {
  const Icon =
    icon && icon in agentIcons ? agentIcons[icon as keyof typeof agentIcons] : Search01Icon
  return <HugeiconsIcon icon={Icon} strokeWidth={2} />
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(isActive && "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground")

function ThreadSidebarItem({ thread }: { thread: Thread }) {
  const match = useMatch({ path: "/threads/new", end: true })

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={Boolean(match)}
        render={<NavLink to="/threads/new" end className={navLinkClass} />}
      >
        <span
          className="size-2 shrink-0 rounded-full bg-sidebar-primary"
          aria-hidden
        />
        <span>{thread.title}</span>
      </SidebarMenuButton>
      <SidebarMenuBadge>
        {thread.status === "finished" ? "Finished" : thread.status}
      </SidebarMenuBadge>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const workspace = getWorkspace()
  const agents = getNavAgents().filter((a) => a.id !== "command-center")
  const activeThread = workspace.threads[0]

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="font-medium"
              render={<NavLink to="/threads/new" />}
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                A
              </span>
              <span>Agentis</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarNavItem to="/threads/new" end>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                <span>New thread</span>
              </SidebarNavItem>
              <SidebarNavItem to="/search">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                <span>Search</span>
              </SidebarNavItem>
              <SidebarNavItem to="/library">
                <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
                <span>Library</span>
              </SidebarNavItem>
              <SidebarNavItem to="/learning">
                <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                <span>Learning</span>
              </SidebarNavItem>
              <SidebarNavItem to="/integrations">
                <HugeiconsIcon icon={Link01Icon} strokeWidth={2} />
                <span>Integrations</span>
              </SidebarNavItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel
              render={
                <CollapsibleTrigger className="flex w-full items-center">
                  Agents
                </CollapsibleTrigger>
              }
            />
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarNavItem to="/command-center">
                    <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />
                    <span>Command Center</span>
                  </SidebarNavItem>
                  {agents.map((agent) => (
                    <SidebarNavItem key={agent.id} to={`/agents/${agent.id}`}>
                      {agentNavIcon(agent.icon)}
                      <span>{agent.name}</span>
                    </SidebarNavItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel
              render={
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  <span>Projects</span>
                  <HugeiconsIcon icon={Add01Icon} className="size-3.5" strokeWidth={2} />
                </CollapsibleTrigger>
              }
            />
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarNavItem to="/projects/new">
                    <span className="text-muted-foreground text-xs">New project</span>
                  </SidebarNavItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel
              render={
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  <span>Threads</span>
                  <HugeiconsIcon icon={Add01Icon} className="size-3.5" strokeWidth={2} />
                </CollapsibleTrigger>
              }
            />
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {activeThread ? <ThreadSidebarItem thread={activeThread} /> : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="opacity-70">
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} aria-hidden />
              <span>Teams</span>
              <span className="text-muted-foreground sr-only">(coming soon)</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="opacity-70">
              <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} aria-hidden />
              <span>Help</span>
              <span className="text-muted-foreground sr-only">(coming soon)</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {workspace.user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                <span className="truncate text-xs font-medium">
                  {workspace.user.displayName}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {workspace.user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
