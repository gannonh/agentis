import { expect, test } from "@playwright/test"

test("renders the starter app and toggles the theme", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Project ready!" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Button" })).toBeVisible()

  const root = page.locator("html")
  const initialTheme = await root.getAttribute("class")

  await page.keyboard.press("d")

  await expect(root).not.toHaveClass(initialTheme ?? "")
})
