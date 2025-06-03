import { Page, Locator } from '@playwright/test';
import { logProgress } from './testLogger';

/**
 * Handles Google OAuth authentication flow using the new inline ComposioAuthButton
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
    timeout?: number;
  },
) {
  const email =
    options?.email || process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  const password = options?.password || process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '';
  const timeout = options?.timeout || 20000;

  try {
    logProgress(`Looking for ${serviceName} inline authentication button`);

    // Look for inline ComposioAuthButton - try multiple selector approaches
    const authButtonSelectors = [
      'button:has-text("Connect to Google")',
      'button:has-text("Authenticate")',
      'button[data-testid*="composio-auth"]',
      'button:has-text("Connect Google")',
      'button[aria-label*="Connect"]',
      'button:has-text("🔐")', // Icon-based buttons
    ];

    let authButton: Locator | null = null;
    for (const selector of authButtonSelectors) {
      try {
        const candidate = page.locator(selector).first();
        await candidate.waitFor({ timeout: 1000 });
        authButton = candidate;
        logProgress(`✅ Found auth button with selector: ${selector}`);
        break;
      } catch (e) {
        // Try next selector
      }
    }

    if (!authButton) {
      logProgress(
        `No inline authentication button found for ${serviceName} - may already be authenticated`,
      );
      return;
    }

    if (!(await authButton.isVisible())) {
      logProgress(
        `Authentication button found but not visible for ${serviceName} - may already be authenticated`,
      );
      return;
    }

    logProgress('✅ Found inline authentication button, clicking...');

    // Click the authentication button to start OAuth flow
    const popupPromise = page.waitForEvent('popup');
    await authButton.click();
    const popup = await popupPromise;

    logProgress(`✅ OAuth popup opened for ${serviceName}`);

    // Handle Google OAuth flow in popup
    await handleGoogleOAuthPopup(popup, email, password);

    // Wait for popup to close and authentication to complete
    try {
      await popup.waitForEvent('close');
    } catch (e) {
      logProgress(`popup not closed`);
    }
    try {
      await page.bringToFront();
    } catch (e) {
      logProgress(`page not brought to front`);
    }

    // Wait for the authentication button to update to show success state
    try {
      // Look for success indicators
      const successSelectors = [
        'button:has-text("✓ Connected")',
        'button:has-text("Connected")',
        'text="Authentication successful"',
        'text="Connected successfully"',
        'text="✅"', // Success emoji
      ];

      for (const selector of successSelectors) {
        try {
          await page.locator(selector).waitFor({ timeout: 10000 });
          logProgress(`✅ ${serviceName} authentication completed successfully`);
          return;
        } catch (e) {
          // Try next selector
        }
      }

      // If no explicit success indicator, wait a moment and check if auth button is gone/changed
      await page.waitForTimeout(3000);
      logProgress(`✅ ${serviceName} OAuth flow completed`);
    } catch (e) {
      logProgress(`Warning: Could not verify authentication success state for ${serviceName}`);
    }
  } catch (e) {
    logProgress(`Error during ${serviceName} authentication: ${e}`);
    // Don't throw - authentication might not be required or already completed
  }
}

/**
 * Handles the Google OAuth flow inside a popup window
 * @param popup - The popup window page object
 * @param email - Google account email
 * @param password - Google account password
 */
async function handleGoogleOAuthPopup(popup: Page, email: string, password: string) {
  try {
    logProgress('Handling Google OAuth popup flow...');

    // Enter email
    await popup.getByRole('textbox', { name: 'Email or phone' }).click();
    await popup.getByRole('textbox', { name: 'Email or phone' }).fill(email);
    await popup.getByRole('button', { name: 'Next' }).click();
    logProgress('✅ Entered email');

    // Enter password
    await popup.getByRole('textbox', { name: 'Enter your password' }).click();
    await popup.getByRole('textbox', { name: 'Enter your password' }).fill(password);
    await popup.getByRole('button', { name: 'Next' }).click();
    logProgress('✅ Entered password');

    // Handle consent screens
    try {
      await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 1000 });
      logProgress('✅ Clicked Continue button');
    } catch (e) {
      logProgress('No Continue button found, proceeding...');
    }

    // Grant permissions - handle different OAuth consent screen variations
    try {
      // Try to check permissions checkboxes
      const checkboxSelectors = ['See, edit, create, and delete', 'Select all', 'All scopes'];

      for (const checkboxName of checkboxSelectors) {
        try {
          await popup.getByRole('checkbox', { name: checkboxName }).check({ timeout: 1000 });
          logProgress(`✅ Checked "${checkboxName}" checkbox`);
          break;
        } catch (e) {
          logProgress(`No "${checkboxName}" checkbox found`);
        }
      }

      // Click permission grant buttons
      const buttonSelectors = ['Continue', 'Allow', 'Accept', 'Grant access'];
      for (const buttonText of buttonSelectors) {
        try {
          await popup.getByRole('button', { name: buttonText }).click({ timeout: 1000 });
          logProgress(`✅ Clicked ${buttonText} button`);
          break;
        } catch (e) {
          logProgress(`No ${buttonText} button found`);
        }
      }
    } catch (e) {
      logProgress('Permissions handling completed or already granted');
    }

    logProgress('✅ Google OAuth popup flow completed');
  } catch (e) {
    logProgress(`Error in OAuth popup: ${e}`);
    throw e;
  }
}
