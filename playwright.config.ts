import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter api dev",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: false,
      timeout: process.env.CI ? 60_000 : 120_000,
      env: {
        AGENTIS_MOCK_RUNTIME: "1",
        DATABASE_URL: "./data/e2e-agentis.db",
        PORT: "3001",
      },
    },
    {
      command: process.env.CI
        ? "pnpm --filter web preview:e2e"
        : "pnpm --filter web dev:e2e",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: process.env.CI ? 60_000 : 120_000,
    },
  ],
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
    },
  },
})
