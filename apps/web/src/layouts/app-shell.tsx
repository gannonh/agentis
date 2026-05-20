import { Outlet } from "react-router"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import { AppSidebar } from "@/components/shell/app-sidebar"

export function AppShell() {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen className="min-h-svh">
        <AppSidebar />
        <SidebarInset className="min-h-svh">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 lg:hidden">
            <SidebarTrigger />
            <span className="text-sm font-medium">Agentis</span>
          </header>
          <main className="flex flex-1 flex-col overflow-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
