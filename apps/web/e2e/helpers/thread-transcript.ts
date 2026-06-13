import type { Locator, Page } from "@playwright/test"

/** Active thread transcript; avoids home-page recent-thread card text during navigation. */
export function threadTranscript(page: Page | Locator): Locator {
  return page.getByRole("log")
}
