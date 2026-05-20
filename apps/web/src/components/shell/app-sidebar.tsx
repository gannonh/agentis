import { NavLink } from "react-router"
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
import { getNavAgents, getWorkspace } from "@/fixtures"

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(isActive && "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground")

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/threads/new" className={navLinkClass} />}
                  isActive={false}
                >
                  <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                  <span>New thread</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/search" className={navLinkClass} />}
                >
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                  <span>Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/library" className={navLinkClass} />}
                >
                  <HugeiconsIcon icon={BookOpen01Icon} strokeWidth={2} />
                  <span>Library</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/learning" className={navLinkClass} />}
                >
                  <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                  <span>Learning</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/integrations" className={navLinkClass} />}
                >
                  <HugeiconsIcon icon={Link01Icon} strokeWidth={2} />
                  <span>Integrations</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={
                        <NavLink to="/command-center" className={navLinkClass} />
                      }
                    >
                      <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />
                      <span>Command Center</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {agents.map((agent) => (
                    <SidebarMenuItem key={agent.id}>
                      <SidebarMenuButton
                        render={
                          <NavLink
                            to={`/agents/${agent.id}`}
                            className={navLinkClass}
                          />
                        }
                      >
                        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                        <span>{agent.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={
                        <NavLink to="/projects/new" className={navLinkClass} />
                      }
                    >
                      <span className="text-muted-foreground text-xs">
                        New project
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
                  {activeThread ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={
                          <NavLink to="/threads/new" className={navLinkClass} />
                        }
                      >
                        <span
                          className="size-2 shrink-0 rounded-full bg-[oklch(0.488_0.243_264.376)]"
                          aria-hidden
                        />
                        <span>{activeThread.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge>
                        {activeThread.status === "finished" ? "Finished" : activeThread.status}
                      </SidebarMenuBadge>
                    </SidebarMenuItem>
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="#teams">Teams</a>}>
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
              <span>Teams</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="#help">Help</a>}>
              <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />
              <span>Help</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="text-muted-foreground px-2 py-1 text-xs group-data-[collapsible=icon]:hidden">
          Earn $100 per referral
        </p>
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
