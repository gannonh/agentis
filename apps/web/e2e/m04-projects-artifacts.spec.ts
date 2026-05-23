import { expect, test } from "@playwright/test"

test.describe("M04 projects and artifacts", () => {
  test("creates project thread, generates artifact, and downloads from library", async ({
    page,
  }) => {
    await page.goto("/projects/new")
    await page.getByLabel(/^name/i).fill("E2E Launch")
    await page.getByLabel(/^goals$/i).fill("Validate artifact workflow")
    await page.getByRole("button", { name: /create project/i }).click()

    await expect(page).toHaveURL(/\/threads\/new\?projectId=project_/)

    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })
    await composer.fill("Write a project report artifact for the launch")
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(page.getByText(/Project context/i)).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/Created artifact/i)).toBeVisible({
      timeout: 30_000,
    })

    await page.goto("/library")
    const artifactTitle = page.locator('[data-slot="card-title"]', {
      hasText: "Project report",
    })
    await expect(artifactTitle.first()).toBeVisible({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Download" }).first().click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBeTruthy()

    await page.reload()
    await expect(artifactTitle.first()).toBeVisible()
  })

  test("archived project is hidden from new-thread selector but provenance remains", async ({
    page,
  }) => {
    await page.goto("/projects/new")
    await page.getByLabel(/^name/i).fill("Archive Me")
    await page.getByRole("button", { name: /create project/i }).click()
    await expect(page).toHaveURL(/projectId=project_/)
    const projectId = new URL(page.url()).searchParams.get("projectId")
    expect(projectId).toBeTruthy()

    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })
    await composer.fill("Write a project report artifact")
    await page.getByRole("button", { name: /send message/i }).click()
    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(page.getByText(/Created artifact/i)).toBeVisible({
      timeout: 30_000,
    })

    await page.goto(`/projects/${projectId}`)
    await page.getByRole("button", { name: /edit project/i }).click()
    await page.getByRole("button", { name: /archive project/i }).click()
    await expect(page).toHaveURL("/threads/new")

    await page.goto("/threads/new")
    await expect(
      page.locator("#thread-project option", { hasText: "Archive Me" })
    ).toHaveCount(0)

    await page.goto("/library")
    await expect(
      page
        .locator('[data-slot="card-description"]', { hasText: "Archive Me" })
        .first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
