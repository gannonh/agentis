import { expect, test } from "@playwright/test"

const API_BASE = "http://127.0.0.1:3002"

async function ensureGithubConnected(request: import("@playwright/test").APIRequestContext) {
  const list = await request.get(`${API_BASE}/api/integrations`)
  expect(list.ok()).toBeTruthy()
  const listed = (await list.json()) as {
    toolkits: { slug: string; status: string }[]
  }
  const github = listed.toolkits.find((toolkit) => toolkit.slug === "github")
  if (github?.status === "connected") {
    return
  }

  const connect = await request.post(`${API_BASE}/api/integrations/github/connect`)
  if (!connect.ok() && github?.status === "pending") {
    const refresh = await request.post(`${API_BASE}/api/integrations/refresh`)
    expect(refresh.ok()).toBeTruthy()
    return
  }
  expect(connect.ok()).toBeTruthy()
  const body = (await connect.json()) as { redirectUrl: string }
  const callback = await request.get(body.redirectUrl)
  expect(callback.ok()).toBeTruthy()
}

test.describe("composio integrations", () => {
  test("connects GitHub, grants to thread, and executes mock tool", async ({
    page,
    request,
  }) => {
    await ensureGithubConnected(request)

    await page.goto("/threads/new")
    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })
    await composer.fill("Help me plan a short status update")
    await page.getByRole("button", { name: /send message/i }).click()
    await expect(page).toHaveURL(/\/threads\/thread_/, { timeout: 30_000 })
    await expect(page.getByText(/Hello from Agentis mock runtime/i)).toBeVisible({
      timeout: 30_000,
    })

    await page.getByRole("button", { name: "Tools" }).click()
    await expect(page.getByRole("menu")).toBeVisible()
    await page.getByRole("menuitem", { name: /GitHub/i }).click()
    await expect(page.getByText(/GitHub connected/i)).toBeVisible()

    await composer.fill("List my GitHub repositories")
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(
      page
        .getByRole("log")
        .getByText(/GitHub tool completed|Found \d+ repositories/i)
        .first()
    ).toBeVisible({ timeout: 30_000 })

    const url = page.url()
    await page.reload()
    await expect(page.getByText(/GitHub connected/i)).toBeVisible()
    await expect(page).toHaveURL(url)
  })

  test("shows remediation when Slack is requested without connection", async ({
    page,
  }) => {
    await page.goto("/threads/new")
    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })
    await composer.fill("Send this message to Slack")
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(
      page.locator("p").filter({ hasText: /Slack is not connected/i }).first()
    ).toBeVisible({
      timeout: 30_000,
    })
  })
})
