import { Link, isRouteErrorResponse, useRouteError } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@/components/shell/page-header"
import { PageLayout } from "@/components/shell/page-layout"

export function RouteErrorPage() {
  const error = useRouteError()
  const description = isRouteErrorResponse(error)
    ? error.statusText || "The page could not be loaded."
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred."

  return (
    <PageLayout variant="narrow">
      <PageHeader title="Something went wrong" description={description} />
      <Button render={<Link to="/threads/new" />} variant="outline" size="sm">
        Back to home
      </Button>
    </PageLayout>
  )
}
