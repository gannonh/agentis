import { useEffect, useMemo, useState } from "react"
import {
  Link,
  NavLink,
  useLocation,
  useMatch,
  useSearchParams,
} from "react-router"
import type { Project, ThreadListItem } from "@workspace/shared"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  BookOpen01Icon,
  CommandIcon,
  Folder01Icon,
  HelpCircleIcon,
  Link01Icon,
  Search01Icon,
  SparklesIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
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
import { ThreadSidebarGroup } from "@/components/shell/thread-sidebar-section"
import { ThreadStarErrorNotice } from "@/components/thread/thread-list-star-button"
import { getWorkspace } from "@/fixtures"
import { useGlobalSearch } from "@/hooks/use-global-search"
import { useAgents } from "@/hooks/use-agents"
import { useProjects } from "@/hooks/use-projects"
import { useThreadStarToggle } from "@/hooks/use-thread-star-toggle"
import { listThreads } from "@/lib/api/client"

const agentIcons = {
  search: Search01Icon,
  command: CommandIcon,
} as const

function agentNavIcon(icon?: string) {
  const Icon =
    icon && icon in agentIcons
      ? agentIcons[icon as keyof typeof agentIcons]
      : Search01Icon
  return <HugeiconsIcon icon={Icon} strokeWidth={2} />
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    isActive &&
      "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
  )

function useActiveProjectId(threads: ThreadListItem[]) {
  const projectMatch = useMatch({ path: "/projects/:projectId", end: false })
  const threadMatch = useMatch({ path: "/threads/:threadId", end: true })
  const [searchParams] = useSearchParams()

  return useMemo(() => {
    const fromRoute = projectMatch?.params.projectId
    if (fromRoute) return fromRoute

    const fromQuery = searchParams.get("projectId")
    if (fromQuery) return fromQuery

    const threadId = threadMatch?.params.threadId
    if (threadId) {
      return threads.find((thread) => thread.id === threadId)?.projectId ?? null
    }

    return null
  }, [
    projectMatch?.params.projectId,
    searchParams,
    threadMatch?.params.threadId,
    threads,
  ])
}

function ProjectSidebarItem({
  project,
  isActive,
  threadCount,
}: {
  project: Project
  isActive: boolean
  threadCount: number
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={
          <NavLink to={`/projects/${project.id}`} className={navLinkClass} />
        }
      >
        <HugeiconsIcon
          icon={Folder01Icon}
          className="size-4 shrink-0"
          strokeWidth={2}
        />
        <span className="truncate">{project.name}</span>
      </SidebarMenuButton>
      <SidebarMenuBadge>{threadCount}</SidebarMenuBadge>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const workspace = getWorkspace()
  const {
    agents,
    loading: loadingAgents,
    error: agentsError,
    refresh: refreshAgents,
  } = useAgents()
  const location = useLocation()
  const { setOpen, shortcutLabel } = useGlobalSearch()
  const [threads, setThreads] = useState<ThreadListItem[]>([])
  const { toggleStar, starError } = useThreadStarToggle(setThreads)
  const { projects, refresh: refreshProjects } = useProjects()
  const activeProjectId = useActiveProjectId(threads)

  const starredThreads = useMemo(
    () => threads.filter((thread) => thread.starred),
    [threads]
  )

  const threadCountByProject = useMemo(() => {
    const counts = new Map<string, number>()
    for (const thread of threads) {
      if (!thread.projectId) continue
      counts.set(thread.projectId, (counts.get(thread.projectId) ?? 0) + 1)
    }
    return counts
  }, [threads])

  useEffect(() => {
    void listThreads()
      .then(setThreads)
      .catch(() => setThreads([]))
    void refreshProjects()
    void refreshAgents()
  }, [location.pathname, location.search, refreshAgents, refreshProjects])
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
              <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
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
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setOpen(true)}>
                  <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
                  <span>Search</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{shortcutLabel}</SidebarMenuBadge>
              </SidebarMenuItem>
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
            <SidebarGroupLabel className="flex w-full items-center justify-between gap-1">
              <CollapsibleTrigger className="flex flex-1 items-center gap-1">
                <span>Agents</span>
              </CollapsibleTrigger>
              <Link
                to="/agents/new"
                aria-label="New agent"
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
              </Link>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarNavItem to="/command-center">
                    <HugeiconsIcon icon={CommandIcon} strokeWidth={2} />
                    <span>Command Center</span>
                  </SidebarNavItem>
                  {loadingAgents ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        disabled
                        className="h-8 text-muted-foreground"
                      >
                        <span className="text-xs">Loading agents…</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : agentsError ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        disabled
                        className="h-8 text-muted-foreground"
                      >
                        <span className="text-xs">Agents unavailable</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    agents.map((agent) => (
                      <SidebarNavItem key={agent.id} to={`/agents/${agent.id}`}>
                        {agentNavIcon()}
                        <span>{agent.name}</span>
                      </SidebarNavItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel className="flex w-full items-center justify-between gap-1">
              <CollapsibleTrigger className="flex flex-1 items-center gap-1">
                <span>Projects</span>
              </CollapsibleTrigger>
              <Link
                to="/projects/new"
                aria-label="New project"
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
              </Link>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projects.map((project) => (
                    <ProjectSidebarItem
                      key={project.id}
                      project={project}
                      isActive={activeProjectId === project.id}
                      threadCount={threadCountByProject.get(project.id) ?? 0}
                    />
                  ))}
                  {projects.length === 0 ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className="h-8 text-muted-foreground"
                        render={<NavLink to="/projects/new" />}
                      >
                        <span className="text-xs">
                          Create your first project
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {starredThreads.length > 0 ? (
          <ThreadSidebarGroup
            label="Starred"
            threads={starredThreads}
            onToggleStar={toggleStar}
          />
        ) : null}

        <ThreadSidebarGroup
          label="Threads"
          threads={threads}
          onToggleStar={toggleStar}
          showAddIcon
        />
        <ThreadStarErrorNotice message={starError} className="px-3" />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="opacity-70">
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} aria-hidden />
              <span>Teams</span>
              <span className="sr-only text-muted-foreground">
                (coming soon)
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="opacity-70">
              <HugeiconsIcon
                icon={HelpCircleIcon}
                strokeWidth={2}
                aria-hidden
              />
              <span>Help</span>
              <span className="sr-only text-muted-foreground">
                (coming soon)
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<NavLink to="/debug/seeding" className={navLinkClass} />}
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs">
                  {workspace.user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                <span className="truncate text-xs font-medium">
                  {workspace.user.displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
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
