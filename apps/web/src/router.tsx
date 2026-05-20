import { createBrowserRouter, Navigate } from "react-router"
import { AppShell } from "@/layouts/app-shell"
import { AgentDetailPage } from "@/routes/agent-detail"
import { CommandCenterPage } from "@/routes/command-center"
import { IntegrationsPage } from "@/routes/integrations"
import { LearningPage } from "@/routes/learning"
import { LibraryPage } from "@/routes/library"
import { NewThreadPage } from "@/routes/new-thread"
import { ProjectCreatePage } from "@/routes/project-create"
import { SearchPage } from "@/routes/search"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/threads/new" replace /> },
      { path: "threads/new", element: <NewThreadPage /> },
      { path: "command-center", element: <CommandCenterPage /> },
      { path: "agents/:agentId", element: <AgentDetailPage /> },
      { path: "learning", element: <LearningPage /> },
      { path: "integrations", element: <IntegrationsPage /> },
      { path: "projects/new", element: <ProjectCreatePage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "search", element: <SearchPage /> },
    ],
  },
])
