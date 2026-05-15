import { expect, test } from "@playwright/test"

test("renders the support-agent setup and toggles the theme", async ({
  page,
}) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Configure a support agent" })
  ).toBeVisible()
  const nextButton = page.getByRole("button", { name: "Next" })
  await expect(nextButton).toBeVisible()
  await expect(nextButton).toBeDisabled()
  await expect(nextButton).toHaveAttribute(
    "title",
    "The next setup step is not available in this demo yet."
  )

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
