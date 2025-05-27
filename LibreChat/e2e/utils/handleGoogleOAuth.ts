import { Page } from '@playwright/test';
import { logProgress } from './testLogger';

/**
 * Handles Google OAuth authentication flow for Google Workspace services
 * @param page - The main Playwright page object
 * @param serviceName - The name of the service (e.g., 'Google Docs', 'Google Sheets')
 * @param options - Optional configuration for authentication
 */
export async function handleGoogleOAuth(
  page: Page,
  serviceName: string,
  options?: {
    email?: string;
    password?: string;
    linkName?: string;
    permissions?: string;
    timeout?: number;
  },
) {
  const email =
    options?.email || process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  const password = options?.password || process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '';
  const linkName = options?.linkName || `${serviceName} Authorization Link`;
  const permissions = options?.permissions || 'See, edit, create, and delete';
  const timeout = options?.timeout || 20000;

  try {
    logProgress(`Looking for ${serviceName} authorization link`);

    // First try to find the Composio backend link with a longer wait
    const composioLink = page.locator('a[href*="backend.composio.dev"]');

    try {
      // Wait up to 30 seconds for the Composio link to appear
      await composioLink.waitFor({ timeout: 60000 });
      logProgress(`Found Composio backend authorization link`);
      await composioLink.click({ timeout });
    } catch (e) {
      // Fallback to the original link name approach
      logProgress(`Composio link not found after 30s, trying link by name: ${linkName}`);
      await page.getByRole('link', { name: linkName }).click({ timeout });
    }

    const popupPromise = page.waitForEvent('popup');
    const popup = await popupPromise;

    logProgress(`Handling Google OAuth for ${serviceName}`);

    // Enter email
    await popup.getByRole('textbox', { name: 'Email or phone' }).click();
    await popup.getByRole('textbox', { name: 'Email or phone' }).fill(email);
    await popup.getByRole('button', { name: 'Next' }).click();

    // Enter password
    await popup.getByRole('textbox', { name: 'Enter your password' }).click();
    await popup.getByRole('textbox', { name: 'Enter your password' }).fill(password);
    await popup.getByRole('button', { name: 'Next' }).click();

    // Handle consent screens
    try {
      await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 5000 });
    } catch (e) {
      // Continue button might not appear on subsequent auth
    }

    // Grant permissions
    try {
      await popup.getByRole('checkbox', { name: permissions }).check({ timeout: 5000 });
      await popup.getByRole('button', { name: 'Continue' }).click();
    } catch (e) {
      // Permissions might already be granted
    }

    // Wait a moment for any redirects to complete
    await popup.waitForTimeout(2000);

    // Close the popup and return to the main page
    await popup.close();
    await page.bringToFront();

    logProgress(`${serviceName} OAuth completed successfully`);
  } catch (e) {
    logProgress(`No ${serviceName} authorization required or already authorized`);
  }
}
