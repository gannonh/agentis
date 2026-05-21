import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@workspace/ui/globals.css"
import { App } from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ThemeProvider defaultTheme="system">
        <App />
      </ThemeProvider>
    </StrictMode>
  )
}

async function startMockWorker() {
  if (!import.meta.env.DEV) {
    return
  }

  try {
    const { worker } = await import("@/mocks/browser")
    await worker.start({ onUnhandledRequest: "bypass", quiet: true })
  } catch (error) {
    console.warn(
      "[agentis] MSW mock worker failed to start; UI still uses local fixtures.",
      error
    )
  }
}

renderApp()
void startMockWorker()
