import { createBrowserRouter, Navigate } from "react-router"
import { AppShell } from "@/layouts/app-shell"
import { isDebugSeedingEnabled } from "@/lib/debug-seeding"
import { AgentCreatePage } from "@/routes/agent-create"
import { AgentDetailPage } from "@/routes/agent-detail"
import { AgentPromotionDraftPage } from "@/routes/agent-promotion-draft"
import { CommandCenterPage } from "@/routes/command-center"
import { DebugSeedingPage } from "@/routes/debug-seeding"
import { IntegrationsPage } from "@/routes/integrations"
import { LearningPage } from "@/routes/learning"
import { LibraryPage } from "@/routes/library"
import { MemoriesPage } from "@/routes/memories"
import { NewThreadPage } from "@/routes/new-thread"
import { ThreadDetailPage } from "@/routes/thread-detail"
import { ProjectCreatePage } from "@/routes/project-create"
import { ProjectDetailPage } from "@/routes/project-detail"
import { SearchPage } from "@/routes/search"
import { NotFoundPage } from "@/routes/not-found"
import { RouteErrorPage } from "@/routes/route-error"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/threads/new" replace /> },
      { path: "threads/new", element: <NewThreadPage /> },
      { path: "threads/:threadId", element: <ThreadDetailPage /> },
      { path: "command-center", element: <CommandCenterPage /> },
      { path: "agents/new", element: <AgentCreatePage /> },
      {
        path: "agents/new/from-thread/:draftId",
        element: <AgentPromotionDraftPage />,
      },
      { path: "agents/promote/:draftId", element: <AgentPromotionDraftPage /> },
      { path: "agents/:agentId", element: <AgentDetailPage /> },
      { path: "learning", element: <LearningPage /> },
      { path: "memories", element: <MemoriesPage /> },
      { path: "integrations", element: <IntegrationsPage /> },
      ...(isDebugSeedingEnabled()
        ? [{ path: "debug/seeding", element: <DebugSeedingPage /> }]
        : []),
      { path: "projects/new", element: <ProjectCreatePage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
