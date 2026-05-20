import { PageHeader } from "@/components/shell/page-header"
import { EmptyState } from "@/components/shell/empty-state"

export function SearchPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        title="Search"
        description="Find threads, agents, artifacts, and learnings across your workspace."
      />
      <EmptyState
        title="Search is coming soon"
        description="Full-text search across threads, agents, and the library will ship in a later milestone."
      />
    </div>
  )
}
