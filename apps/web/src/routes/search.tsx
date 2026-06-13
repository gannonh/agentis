import { useEffect } from "react"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"
import { EmptyState } from "@/components/shell/empty-state"
import { useGlobalSearch } from "@/hooks/use-global-search"

export function SearchPage() {
  const { setOpen, shortcutLabel } = useGlobalSearch()

  useEffect(() => {
    setOpen(true)
  }, [setOpen])

  return (
    <PageLayout variant="focused">
      <PageHeader
        title="Search"
        description="Find threads, agents, library artifacts, and projects across your workspace."
      />
      <EmptyState
        title="Workspace search is open"
        description={`Use the search palette to jump to threads, library items, agents, and projects. Press ${shortcutLabel} from any screen to reopen it.`}
      />
    </PageLayout>
  )
}
