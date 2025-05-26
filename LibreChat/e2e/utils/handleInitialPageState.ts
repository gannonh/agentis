import { Page } from '@playwright/test';

/**
 * Handles the initial page state including Terms of Service modal and login form
 * @param page - The Playwright page object
 * @param options - Optional configuration for login credentials
 */
export async function handleInitialPageState(
  page: Page,
  options?: {
    email?: string;
    password?: string;
  },
) {
  // Handle Terms of Service modal if it appears
  try {
    await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
  } catch (e) {
    // Modal might not appear, continue
    console.log('No TOS modal found or could not click accept button');
  }

  // Handle login if it appears
  try {
    const email =
      options?.email || process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
    const password = options?.password || process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '';

    await page.locator('input[name="email"]').fill(email, { timeout: 5000 });
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="password"]').press('Enter');
    // Wait for the page to load after login
    await page.waitForURL(/.*\/c\/new/, { timeout: 10000 });
  } catch (e) {
    // Login might not be required, continue
    console.log('No login required or could not click login button');
  }
}
