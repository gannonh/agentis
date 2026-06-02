import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"

export function SearchPage() {
  return (
    <PageLayout variant="focused">
      <PageHeader
        title="Search"
        description="Find threads, agents, documents, and learnings across your workspace."
      />
      <EmptyState
        title="Search is coming soon"
        description="Full-text search across threads, agents, and the library will ship in a later milestone."
      />
    </PageLayout>
  )
}
