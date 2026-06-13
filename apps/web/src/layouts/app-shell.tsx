import { Agentation } from "agentation"
import { Outlet } from "react-router"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { GlobalSearchDialog } from "@/components/shell/global-search-dialog"
import { GlobalSearchProvider } from "@/components/shell/global-search-provider"

export function AppShell() {
  return (
    <TooltipProvider>
      <GlobalSearchProvider>
        <SidebarProvider defaultOpen className="min-h-svh">
          <a
            href="#main-content"
            className="bg-background text-foreground focus-visible:ring-ring sr-only fixed top-4 left-4 z-50 rounded-md border border-border px-3 py-2 text-sm font-medium shadow-sm focus:not-sr-only focus-visible:ring-2 focus-visible:outline-none"
          >
            Skip to main content
          </a>
          <AppSidebar />
          <SidebarInset
            id="main-content"
            tabIndex={-1}
            className="min-h-svh outline-none"
          >
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 lg:hidden">
              <SidebarTrigger />
              <span className="text-sm font-medium">Agentis</span>
            </header>
            <div className="flex flex-1 flex-col overflow-auto p-6">
              <Outlet />
            </div>
          </SidebarInset>
          <GlobalSearchDialog />
        </SidebarProvider>
        {import.meta.env.DEV && import.meta.env.MODE !== "test" ? (
          <Agentation />
        ) : null}
      </GlobalSearchProvider>
    </TooltipProvider>
  )
}
