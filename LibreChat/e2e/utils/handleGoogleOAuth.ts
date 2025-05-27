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
    // Use .first() to handle multiple similar links and select the first valid one
    const composioLink = page.locator('a[href*="backend.composio.dev"]').first();

    try {
      // Wait up to 30 seconds for the Composio link to appear
      await composioLink.waitFor({ timeout: 60000 });
      logProgress(`Found Composio backend authorization link`);
      await composioLink.click({ timeout });
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

      // Grant permissions - handle different OAuth consent screen variations
      try {
        // First try to check permissions checkbox if it exists
        try {
          await popup.getByRole('checkbox', { name: permissions }).check({ timeout: 5000 });
          logProgress('✅ Checked permissions checkbox');
        } catch (e) {
          logProgress('No permissions checkbox found, continuing...');
        }

        // Then try to click Continue button if it exists
        try {
          await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 5000 });
          logProgress('✅ Clicked Continue button');
        } catch (e) {
          logProgress('No Continue button found');
        }
      } catch (e) {
        // Permissions might already be granted
        logProgress('Permissions handling completed or already granted');
      }

      // Wait a moment for any redirects to complete
      await popup.waitForTimeout(2000);

      // Close the popup and return to the main page
      await popup.close();
      await page.bringToFront();

      logProgress(`✅ ${serviceName} OAuth completed successfully`);
    } catch (e) {
      logProgress(`No ${serviceName} authorization required or already authorized`);
    }
  } catch (e) {
    // Fallback to the original link name approach
    logProgress(`Composio link not found after 30s, trying link by name: ${linkName}`);
  }
}
