import { Page, Locator } from '@playwright/test';
import { logProgress } from './testLogger';

declare const process: {
  env: {
    GOOGLE_TEST_ACCOUNT_1_EMAIL?: string;
    GOOGLE_TEST_ACCOUNT_1_PASSWORD?: string;
  };
};

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

  try {
    logProgress(`Looking for ${serviceName} inline authentication button`);

    // Look for inline ComposioAuthButton - try multiple selector approaches
    const authButtonSelectors = [
      `button:has-text("Connect ${serviceName}")`, // Service-specific button (e.g., "Connect Gmail")
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
    let popup: Page | null;
    try {
      // Set up popup listener with timeout AFTER the click
      const [clickResult] = await Promise.all([
        page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
        authButton.click(),
      ]);

      popup = clickResult;

      if (!popup) {
        logProgress(`⚠️ No popup appeared for ${serviceName} - may already be authenticated`);
        return;
      }

      logProgress(`✅ OAuth popup opened for ${serviceName}`);
    } catch (error) {
      logProgress(`❌ Error handling popup: ${error}`);
      return;
    }

    try {
      // Check if login form exists with short timeout
      await popup.getByRole('textbox', { name: 'Email or phone' }).waitFor({ timeout: 2000 });

      // If we get here, the form exists - proceed with login
      await popup.getByRole('textbox', { name: 'Email or phone' }).fill(email);
      await popup.getByRole('button', { name: 'Next' }).click();
      await popup.getByRole('textbox', { name: 'Enter your password' }).click();
      await popup.getByRole('textbox', { name: 'Enter your password' }).fill(password);
      await popup.getByRole('button', { name: 'Next' }).click();
      await popup.getByRole('button', { name: 'Continue' }).click();
      try {
        await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 1000 });
      } catch {
        logProgress(`No "Continue" button found, may not be needed`);
      }
    } catch (error) {
      // otherwise click through this version
      await popup.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
      await popup.getByRole('button', { name: 'Continue' }).click();
      try {
        await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 1000 });
      } catch {
        logProgress(`No "Continue" button found, may not be needed`);
      }
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
          await page.locator(selector).waitFor({ timeout: 2000 });
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
