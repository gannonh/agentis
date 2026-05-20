import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"

export function NotFoundPage() {
  return (
    <PageLayout variant="narrow">
      <PageHeader
        title="Page not found"
        description="That URL is not part of this workspace yet. Use the sidebar or return home."
      />
      <Button render={<Link to="/threads/new" />} variant="outline" size="sm">
        New thread
      </Button>
    </PageLayout>
  )
}
