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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
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
            <Textarea
              placeholder="What's the task?"
              className="min-h-24 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              disabled
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Connect your integrations → Slack, Gmail, Drive…
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
          <h2 className="text-sm font-medium">Recent threads</h2>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{recentThread.title}</CardTitle>
              <CardDescription>
                {recentThread.agentName} ·{" "}
                {recentThread.status === "finished" ? "Finished" : recentThread.status}{" "}
                · {formatRelativeTime(recentThread.updatedAt)}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-center text-sm font-medium">
          See what Agentis is capable of building
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspace.capabilityExamples.map((example) => (
            <Card key={example.id} className="overflow-hidden">
              <div className="bg-muted aspect-video w-full" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{example.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {example.description}
                </CardDescription>
              </CardHeader>
              {example.duration || example.cost ? (
                <CardContent className="text-muted-foreground flex gap-3 pt-0 text-xs">
                  {example.duration ? <span>{example.duration}</span> : null}
                  {example.cost ? <span>{example.cost}</span> : null}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
