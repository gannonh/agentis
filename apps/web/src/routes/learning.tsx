import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import { formatRelativeTime, getWorkspace } from "@/fixtures"

export function LearningPage() {
  const workspace = getWorkspace()
  const pinnedCount = workspace.skills.filter((s) => s.pinned).length
  const visibleSkills = workspace.skills.slice(0, 5)

  return (
    <PageLayout>
      <PageHeader
        title="Learning"
        description="Your agents learn from conversations. Review suggestions below and accept the ones worth keeping."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
            <CardDescription>
              {workspace.skills.length} total · {pinnedCount} pinned
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {visibleSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="font-mono text-xs">{skill.name}</span>
                {skill.pinned ? (
                  <Badge variant="secondary" className="text-xs">
                    pinned
                  </Badge>
                ) : null}
              </div>
            ))}
            <Button variant="link" className="h-auto p-0 text-xs" disabled>
              View all {workspace.skills.length} skills
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Memories</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No memories stored yet"
              description="Memories are created when the agent learns about you and your preferences."
              action={
                <Button variant="outline" size="sm" disabled>
                  Browse Memories
                </Button>
              }
              className="border-0 bg-transparent py-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rubrics</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No evaluations yet"
              description="Run an eval on any thread to start tracking quality."
              action={
                <Button variant="outline" size="sm" disabled>
                  Browse Rubrics
                </Button>
              }
              className="border-0 bg-transparent py-2"
            />
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Agent</span>
          <Badge variant="secondary">All</Badge>
          <Badge variant="outline">Senior Reviewer</Badge>
        </div>
        {workspace.learningConversations.map((conversation) => (
          <Card key={conversation.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium">{conversation.title}</p>
                <p className="text-muted-foreground text-xs">
                  {conversation.agentName} · {conversation.messageCount} messages
                  · {formatRelativeTime(conversation.updatedAt)}
                </p>
              </div>
              <div className="text-muted-foreground flex gap-2 text-xs">
                <span aria-hidden>⋯</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </PageLayout>
  )
}
