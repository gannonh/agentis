import { useParams } from "react-router"
import { PageLayout } from "@/components/shell/page-layout"

export function AgentPromotionDraftPage() {
  const { draftId } = useParams()

  return (
    <PageLayout>
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">Agent draft</p>
        <h1 className="text-lg font-medium">Review promoted agent</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Draft {draftId} is ready for review before creating an agent.
        </p>
      </div>
    </PageLayout>
  )
}
