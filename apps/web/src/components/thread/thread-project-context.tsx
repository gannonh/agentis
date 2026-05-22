import { Link } from "react-router"
import type { ProjectContextSummary } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export function ThreadProjectContext({
  context,
}: {
  context: ProjectContextSummary | null | undefined
}) {
  if (!context) return null

  return (
    <Card className="m-4 shrink-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Project context</CardTitle>
          {context.project.status === "archived" ? (
            <Badge variant="secondary">Archived</Badge>
          ) : null}
        </div>
        <CardDescription>
          <Link
            to={`/projects/${context.project.id}`}
            className="text-foreground font-medium hover:underline"
          >
            {context.project.name}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {context.empty ? (
          <p className="text-muted-foreground">No project context enabled</p>
        ) : (
          <>
            {context.goals?.trim() ? (
              <div>
                <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                  Goals
                </p>
                <p className="whitespace-pre-wrap">{context.goals}</p>
              </div>
            ) : null}
            {context.memories.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                  Enabled memories ({context.enabledMemoryCount})
                </p>
                <ul className="list-disc space-y-1 pl-4">
                  {context.memories.map((memory) => (
                    <li key={memory.id}>{memory.content}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {context.truncated ? (
              <p className="text-muted-foreground text-xs">
                Some context was truncated for prompt size limits.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
