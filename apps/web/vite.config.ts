import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"

import { supportAgentDevPlugin } from "./support-agent-dev-plugin"

const workspaceRoot = path.resolve(__dirname, "../..")

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const workspaceEnv = loadEnv(mode, workspaceRoot, "")
  const appEnv = loadEnv(mode, __dirname, "")
  const serverEnv = {
    ...workspaceEnv,
    ...appEnv,
    ...process.env,
  }

  return {
    plugins: [react(), tailwindcss(), supportAgentDevPlugin(serverEnv)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**", "src/main.tsx"],
        thresholds: {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  }
})
