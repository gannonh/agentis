import { expect, test } from "@playwright/test"
import { threadTranscript } from "./helpers/thread-transcript"

test.describe("thread lifecycle", () => {
  test("creates thread, completes mock response, and persists on reload", async ({
    page,
  }) => {
    await page.goto("/threads/new")
    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })
    await composer.fill("Summarize the workspace")
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(
      threadTranscript(page).getByText(/Hello from Agentis mock runtime/i)
    ).toBeVisible({
      timeout: 30_000,
    })

    const url = page.url()
    await page.reload()
    await expect(
      threadTranscript(page).getByText(/Hello from Agentis mock runtime/i)
    ).toBeVisible()
    await expect(page).toHaveURL(url)
  })

  test("aborts a running response and preserves partial transcript", async ({
    page,
  }) => {
    await page.goto("/threads/new")
    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })
    await composer.fill("Draft a long plan")
    await page.getByRole("button", { name: /send message/i }).click()
    await expect(page).toHaveURL(/\/threads\/thread_/)
    const abortButton = page.getByRole("button", { name: "Abort" })
    await expect(abortButton).toBeVisible({ timeout: 10_000 })
    await abortButton.click()

    await expect(threadTranscript(page).getByText("Aborted")).toBeVisible({
      timeout: 20_000,
    })

    const url = page.url()
    await page.reload()
    await expect(threadTranscript(page).getByText("Aborted")).toBeVisible()
    await expect(page).toHaveURL(url)
  })
})
