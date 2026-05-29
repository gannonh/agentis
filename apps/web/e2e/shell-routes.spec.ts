import { test, expect } from "@playwright/test"

const routes = [
  { path: "/threads/new", name: "new-thread" },
  { path: "/command-center", name: "command-center" },
  { path: "/agents/senior-reviewer", name: "agent-detail" },
  { path: "/learning", name: "learning" },
  { path: "/integrations", name: "integrations" },
  { path: "/projects/new", name: "project-create" },
  { path: "/library", name: "library" },
  { path: "/search", name: "search" },
] as const

for (const route of routes) {
  test(`shell screenshot: ${route.name}`, async ({ page }) => {
    await page.goto(route.path)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("body")).toBeVisible()
    await expect(page.locator("#main-content")).toBeVisible()
    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: false,
      maxDiffPixelRatio: route.name === "learning" ? 0.05 : undefined,
    })
  })
}
