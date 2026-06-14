import { NavLink, useMatch } from "react-router"
import type { ThreadListItem } from "@workspace/shared"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { cn } from "@workspace/ui/lib/utils"
import { navLinkClass } from "@/components/shell/sidebar-nav-link-class"
import { ThreadListStarButton } from "@/components/thread/thread-list-star-button"
import {
  threadAgentDisplayName,
  threadListStatusLabel,
} from "@/lib/thread-list-display"

function ThreadSidebarItem({
  thread,
  onToggleStar,
}: {
  thread: ThreadListItem
  onToggleStar: (threadId: string) => void
}) {
  const match = useMatch({ path: `/threads/${thread.id}`, end: true })
  const agentName = threadAgentDisplayName(thread)
  const statusLabel = threadListStatusLabel(thread)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={Boolean(match)}
        render={
          <NavLink to={`/threads/${thread.id}`} end className={navLinkClass} />
        }
      >
        <ThreadListStarButton
          starred={thread.starred ?? false}
          onToggle={() => onToggleStar(thread.id)}
        />
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            thread.status === "finished"
              ? "bg-muted-foreground"
              : "bg-sidebar-primary"
          )}
          aria-hidden
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate">{thread.title}</span>
          {agentName ? (
            <span className="truncate text-[10px] text-muted-foreground">
              {agentName}
            </span>
          ) : null}
        </span>
      </SidebarMenuButton>
      <SidebarMenuBadge>{statusLabel}</SidebarMenuBadge>
    </SidebarMenuItem>
  )
}

export function ThreadSidebarGroup({
  label,
  threads,
  onToggleStar,
  showAddIcon = false,
}: {
  label: string
  threads: ThreadListItem[]
  onToggleStar: (threadId: string) => void
  showAddIcon?: boolean
}) {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel
          render={
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <span>{label}</span>
              {showAddIcon ? (
                <HugeiconsIcon
                  icon={Add01Icon}
                  className="size-3.5"
                  strokeWidth={2}
                />
              ) : null}
            </CollapsibleTrigger>
          }
        />
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.map((thread) => (
                <ThreadSidebarItem
                  key={`${label}-${thread.id}`}
                  thread={thread}
                  onToggleStar={onToggleStar}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}
