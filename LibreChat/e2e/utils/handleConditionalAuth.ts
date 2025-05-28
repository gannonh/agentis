import { Page } from '@playwright/test';
import { logProgress } from './testLogger';

/**
 * Handles conditional authentication when running tests individually
 * Checks if the page is on login screen and performs authentication if needed
 * @param page - The Playwright page object
 * @returns Promise that resolves when authentication is complete or not needed
 */
export async function handleConditionalAuth(page: Page): Promise<void> {
  // Check if we need to authenticate (when running individually from VS Code)
  if (page.url().includes('/login')) {
    logProgress('Not authenticated, logging in...');

    // Use the same credentials as the setup
    let user;
    if (process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL && process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD) {
      user = {
        email: String(process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL),
        password: String(process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD),
      };
    } else if (process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD) {
      user = {
        email: String(process.env.E2E_USER_EMAIL),
        password: String(process.env.E2E_USER_PASSWORD),
      };
    } else {
      throw new Error('No test credentials available');
    }

    // Login
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.locator('input[name="password"]').press('Enter');

    // Handle TOS modal if it appears
    try {
      await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
      logProgress('Accepted Terms of Service');
    } catch (e) {
      logProgress('No TOS modal found');
    }
  }
}