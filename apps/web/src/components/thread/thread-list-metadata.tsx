import type { ThreadListItem } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import {
  threadAgentDisplayName,
  threadListStatusLabel,
} from "@/lib/thread-list-display"

type ThreadListMetadataProps = {
  thread: ThreadListItem
  showStatus?: boolean
}

export function ThreadListMetadata({
  thread,
  showStatus = true,
}: ThreadListMetadataProps) {
  const agentName = threadAgentDisplayName(thread)
  const statusLabel = threadListStatusLabel(thread)

  let statusContent = null
  if (statusLabel === "Waiting") {
    statusContent = (
      <Badge variant="secondary" className="text-[10px] font-medium">
        Waiting
      </Badge>
    )
  } else if (showStatus) {
    statusContent = (
      <span className="capitalize">{statusLabel.replace(/-/g, " ")}</span>
    )
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
      {agentName ? (
        <Badge variant="outline" className="text-[10px] font-normal">
          {agentName}
        </Badge>
      ) : null}
      {statusContent}
    </div>
  )
}
