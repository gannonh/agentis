import { expect, test } from "@playwright/test"

test("renders the support-agent setup and toggles the theme", async ({
  page,
}) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Configure a support agent" })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Start with support agent" })
  ).toBeVisible()

  const root = page.locator("html")
  const initialTheme = await root.getAttribute("class")

  await page.keyboard.press("d")

  await expect(root).not.toHaveClass(initialTheme ?? "")

  await page.getByLabel("Template name").fill("Billing support")
  await expect(
    page.getByRole("heading", { name: "Billing support" })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Product documentation sample" })
    .click()
  await expect(
    page.getByText("Selected source: Product documentation sample")
  ).toBeVisible()
})
