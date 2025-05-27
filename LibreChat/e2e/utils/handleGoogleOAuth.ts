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
    await page.getByRole('link', { name: linkName }).click({ timeout });

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

    logProgress(`${serviceName} OAuth completed successfully`);
  } catch (e) {
    logProgress(`No ${serviceName} authorization required or already authorized`);
  }
}
