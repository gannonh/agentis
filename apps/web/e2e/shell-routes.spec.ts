import { test, expect, type Page, type Route } from "@playwright/test"

const EMPTY_MEMORY_CATEGORIES = [
  ["memory_category_user_fact", "User Fact"],
  ["memory_category_preference", "Preference"],
  ["memory_category_project_context", "Project Context"],
  ["memory_category_domain_knowledge", "Domain Knowledge"],
  ["memory_category_people", "People"],
  ["memory_category_active_work", "Active Work"],
  ["memory_category_tools_workflows", "Tools & Workflows"],
  ["memory_category_organization", "Organization"],
].map(([id, name]) => ({
  id,
  name,
  description: "",
  count: 0,
}))

async function fulfillJson(route: Route, json: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(json),
  })
}

async function mockShellRouteData(page: Page, routeName: string) {
  if (routeName === "command-center") {
    await page.route(/\/api\/agents$/, (route) => fulfillJson(route, []))
    await page.route(/\/api\/command-center\/summary$/, (route) =>
      fulfillJson(route, {
        totalCostUsd: 0,
        totalRuns: 0,
        activeRuns: 0,
        agentCount: 0,
      })
    )
    await page.route(/\/api\/command-center\/roster$/, (route) =>
      fulfillJson(route, [])
    )
    await page.route(/\/api\/command-center\/recent-runs\?limit=20$/, (route) =>
      fulfillJson(route, [])
    )
  }

  if (routeName === "learning") {
    await page.route(/\/api\/threads$/, (route) => fulfillJson(route, []))
    await page.route(/\/api\/memories$/, (route) =>
      fulfillJson(route, {
        categories: EMPTY_MEMORY_CATEGORIES,
        memories: [],
      })
    )
    await page.route(/\/api\/learning\/summary$/, (route) =>
      fulfillJson(route, {
        skillsCount: 0,
        pinnedSkillsCount: 0,
        memoriesCount: 0,
        rubricsCount: 0,
        pendingSuggestionsCount: 0,
      })
    )
    await page.route(/\/api\/learning\/skills\?page=1&pageSize=5$/, (route) =>
      fulfillJson(route, {
        page: 1,
        pageSize: 5,
        totalCount: 0,
        totalPages: 0,
        skills: [],
      })
    )
  }
}

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
    await mockShellRouteData(page, route.name)
    await page.goto(route.path)
    await page.waitForLoadState("domcontentloaded")
    await expect(page.locator("body")).toBeVisible()
    await expect(page.locator("#main-content")).toBeVisible()
    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: false,
    })
  })
}
