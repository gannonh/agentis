import { Component, type ErrorInfo, type ReactNode } from "react"
import { Link } from "react-router"
import { Button } from "@workspace/ui/components/button"
import { PageLayout } from "@/components/shell/page-layout"
import { PageHeader } from "@/components/shell/page-header"

type RootErrorBoundaryProps = {
  children: ReactNode
}

type RootErrorBoundaryState = {
  error: Error | null
}

export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[agentis] Uncaught render error", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <PageLayout variant="narrow">
          <PageHeader
            title="Something went wrong"
            description="An unexpected error occurred while rendering this page."
          />
          <Button render={<Link to="/threads/new" />} variant="outline" size="sm">
            Back to home
          </Button>
        </PageLayout>
      )
    }

    return this.props.children
  }
}
