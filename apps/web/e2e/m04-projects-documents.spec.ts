import { expect, test } from "@playwright/test"

test.describe("M04 projects and documents", () => {
  test("creates and updates a global document from another thread", async ({
    page,
  }, testInfo) => {
    const title = `Global Playbook ${testInfo.workerIndex}-${Date.now()}`

    await page.goto("/threads/new")
    const firstComposer = page.getByPlaceholder("What's the task?")
    await expect(firstComposer).toBeEnabled({ timeout: 30_000 })
    await firstComposer.fill(
      `Create a global document named "${title}" about onboarding with next steps`
    )
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(page.getByText(/Created document/i)).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(`Document created: ${title}`)).toBeVisible()

    await page.goto("/threads/new")
    const secondComposer = page.getByPlaceholder("What's the task?")
    await expect(secondComposer).toBeEnabled({ timeout: 30_000 })
    await secondComposer.fill(
      `Find and read the global document named "${title}", then update it with a cross-thread access section`
    )
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(page.getByText(/Updated document/i)).toBeVisible({
      timeout: 30_000,
    })

    const documents = await page.evaluate(async (query) => {
      const response = await fetch(`/api/documents?query=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Failed to load documents")
      return response.json() as Promise<Array<{ id: string; title: string; currentVersion?: number }>>
    }, title)
    const document = documents.find((entry) => entry.title === title)
    expect(document?.currentVersion).toBe(2)

    await page.goto(`/library?documentId=${document?.id}`)
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/markdown · global · version 2/i)).toBeVisible()
    await expect(page.locator("pre")).toContainText("cross-thread access section")
    await expect(page.getByText(/Versions: v1, v2/i)).toBeVisible()
  })

  test("creates project thread, generates document, and downloads from library", async ({
    page,
  }) => {
    await page.goto("/projects/new")
    await page.getByLabel(/^name/i).fill("E2E Launch")
    await page.getByLabel(/^goals$/i).fill("Validate document workflow")
    await page.getByRole("button", { name: /create project/i }).click()

    await expect(page).toHaveURL(/\/threads\/new\?projectId=project_/)

    const composer = page.getByPlaceholder("What's the task?")
    await expect(composer).toBeEnabled({ timeout: 30_000 })
    await composer.fill("Write a project report document for the launch")
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(page.getByText(/Project context/i)).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/Created document/i)).toBeVisible({
      timeout: 30_000,
    })

    await page.goto("/library")
    const documentTitle = page.locator('[data-slot="card-title"]', {
      hasText: "Project report",
    })
    await expect(documentTitle.first()).toBeVisible({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Download" }).first().click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBeTruthy()

    await page.reload()
    await expect(documentTitle.first()).toBeVisible()
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
    await composer.fill("Write a project report document")
    await page.getByRole("button", { name: /send message/i }).click()
    await expect(page).toHaveURL(/\/threads\/thread_/)
    await expect(page.getByText(/Created document/i)).toBeVisible({
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
