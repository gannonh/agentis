import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { getWorkspace } from "@/fixtures"

export function MemoriesPage() {
  const workspace = getWorkspace()

  return (
    <PageLayout className="gap-6">
      <PageHeader title="Memories" />

      <section className="rounded-lg border border-border bg-card px-4 py-4">
        <p className="text-sm font-medium">{workspace.memories.length} saved memories</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Detailed memory browsing is coming soon.
        </p>
      </section>
    </PageLayout>
  )
}
