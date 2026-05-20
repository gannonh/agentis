import { RouterProvider } from "react-router"
import { RootErrorBoundary } from "@/components/shell/root-error-boundary"
import { router } from "@/router"

export function App() {
  return (
    <RootErrorBoundary>
      <RouterProvider router={router} />
    </RootErrorBoundary>
  )
}
