import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { formatRelativeTime, getWorkspace } from "@/fixtures"

export function LibraryPage() {
  const workspace = getWorkspace()

  return (
    <PageLayout>
      <PageHeader
        title="Library"
        description="Browse deliverables produced across threads and agent runs."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input placeholder="Search artifacts…" className="max-w-md" disabled />
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">All types</Badge>
          <Badge variant="outline">Documents</Badge>
          <Badge variant="outline">Webpages</Badge>
          <Badge variant="outline">Images</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workspace.artifacts.map((artifact) => (
          <Card key={artifact.id}>
            <div className="bg-muted aspect-video w-full rounded-t-lg" />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm leading-snug">
                  {artifact.title}
                </CardTitle>
                <Badge variant="outline" className="shrink-0 text-xs capitalize">
                  {artifact.type}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {[
                  artifact.projectName,
                  artifact.threadTitle,
                  artifact.agentName,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Workspace"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <span className="text-muted-foreground text-xs">
                {formatRelativeTime(artifact.createdAt)}
              </span>
              <Button variant="outline" size="sm" disabled>
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  )
}
