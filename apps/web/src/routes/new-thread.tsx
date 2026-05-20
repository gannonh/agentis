import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Textarea } from "@workspace/ui/components/textarea"
import { PageLayout } from "@/components/shell/page-layout"
import { formatRelativeTime, getWorkspace } from "@/fixtures"

const quickActions = [
  "Design a website",
  "Source candidates",
  "Research a topic",
  "Generate images",
  "More...",
]

export function NewThreadPage() {
  const workspace = getWorkspace()
  const recentThread = workspace.threads[0]

  return (
    <PageLayout variant="focused" className="gap-10">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-medium tracking-tight">
          Let&apos;s get to work.
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Agentis</Badge>
          <Badge variant="outline">Plan</Badge>
        </div>
        <Card className="w-full text-left">
          <CardContent className="flex flex-col gap-3 p-4">
            <label htmlFor="thread-task" className="sr-only">
              Task
            </label>
            <Textarea
              id="thread-task"
              placeholder="What's the task?"
              className="min-h-24 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              disabled
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Connect integrations in Settings when you are ready to run work.
              </p>
              <Button size="sm" disabled>
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-center gap-2">
          {quickActions.map((action) => (
            <Button key={action} variant="outline" size="sm" disabled>
              {action}
            </Button>
          ))}
        </div>
      </div>

      {recentThread ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Recent thread</h2>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{recentThread.title}</CardTitle>
              <CardDescription>
                {recentThread.agentName} ·{" "}
                {recentThread.status === "finished"
                  ? "Finished"
                  : recentThread.status}{" "}
                · {formatRelativeTime(recentThread.updatedAt)}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      ) : null}
    </PageLayout>
  )
}
