import { expect, test } from "@playwright/test"

test.describe("research golden path", () => {
  test("researches a topic and creates a library document", async ({ page }) => {
    await page.goto("/threads/new")
    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })

    await page.getByRole("button", { name: /research a topic/i }).click()
    await expect(composer).toHaveValue(/Research how small businesses/i)

    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(page.getByText(/saved .* to the Library|Created document/i)).toBeVisible({
      timeout: 30_000,
    })

    await page.goto("/library")
    await expect(
      page.locator('[data-slot="card-title"]', {
        hasText: /Research brief/i,
      }).first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
