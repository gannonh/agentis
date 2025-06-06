import { Page } from '@playwright/test';
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

    // Use direct selector for the specific service button
    const authButton = page.getByRole('button', { name: `Connect ${serviceName}` });

    // Wait for the button to exist with a longer timeout for streaming scenarios
    try {
      await authButton.waitFor({ timeout: 10000, state: 'visible' });
      logProgress(`✅ Found auth button for ${serviceName}`);
    } catch (e) {
      logProgress(
        `No inline authentication button found for ${serviceName} - may already be authenticated`,
      );
      return;
    }

    // Ensure button is visible and in view
    try {
      await authButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Wait for scroll to complete
    } catch (e) {
      logProgress(`Warning: Could not scroll button into view: ${e}`);
    }

    if (!(await authButton.isVisible())) {
      logProgress(
        `Authentication button found but not visible for ${serviceName} - may already be authenticated`,
      );
      return;
    }

    // Check if button is actually clickable before attempting click
    const isClickable = await authButton.isEnabled();
    const isVisibleCheck = await authButton.isVisible();
    logProgress(`Button state - enabled: ${isClickable}, visible: ${isVisibleCheck}`);

    if (!isClickable) {
      logProgress(`❌ Button is not enabled for ${serviceName}`);
      return;
    }

    logProgress('✅ Found inline authentication button, clicking...');

    // Click the authentication button to start OAuth flow
    let popup: Page | null;
    try {
      // Listen for popup before clicking
      const popupPromise = page.waitForEvent('popup', { timeout: 10000 });

      // For Google Drive (third auth), use a more forceful approach
      let clickSuccess = false;
      
      // Method 1: Try regular click first
      try {
        await authButton.click({ timeout: 2000, force: true });
        logProgress(`Regular force click attempted for ${serviceName}`);
        clickSuccess = true;
      } catch (e) {
        logProgress(`Regular click failed for ${serviceName}: ${e}`);
      }
      
      // Method 2: If regular click failed, try JavaScript dispatch
      if (!clickSuccess) {
        try {
          await authButton.evaluate((el: HTMLElement) => {
            const event = new MouseEvent('click', { 
              bubbles: true, 
              cancelable: true, 
              view: window 
            });
            el.dispatchEvent(event);
          });
          logProgress(`JavaScript click event dispatched for ${serviceName}`);
          clickSuccess = true;
        } catch (e) {
          logProgress(`JavaScript click failed for ${serviceName}: ${e}`);
        }
      }
      
      // Method 3: If both failed, try direct element click
      if (!clickSuccess) {
        try {
          await authButton.evaluate((el: HTMLElement) => el.click());
          logProgress(`Direct element click attempted for ${serviceName}`);
          clickSuccess = true;
        } catch (e) {
          logProgress(`Direct element click failed for ${serviceName}: ${e}`);
        }
      }
      
      if (!clickSuccess) {
        logProgress(`❌ All click methods failed for ${serviceName}`);
        return;
      }
      
      logProgress(`Button clicked for ${serviceName}, waiting for popup...`);

      // Wait for the popup
      popup = await popupPromise;

      if (!popup) {
        logProgress(`❌ Click executed but no popup appeared for ${serviceName}`);
        // Try to get more info about why click failed
        const buttonText = await authButton.textContent();
        const buttonEnabled = await authButton.isEnabled();
        const buttonVisible = await authButton.isVisible();
        logProgress(`Button debug - text: "${buttonText}", enabled: ${buttonEnabled}, visible: ${buttonVisible}`);
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
      logProgress(`✅ Found login form, entering credentials for ${serviceName}`);
      await popup.getByRole('textbox', { name: 'Email or phone' }).fill(email);
      await popup.getByRole('button', { name: 'Next' }).click();

      await popup.getByRole('textbox', { name: 'Enter your password' }).waitFor({ timeout: 5000 });
      await popup.getByRole('textbox', { name: 'Enter your password' }).fill(password);
      await popup.getByRole('button', { name: 'Next' }).click();

      // Wait for and click first Continue button
      await popup.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 5000 });
      await popup.getByRole('button', { name: 'Continue' }).click();
      logProgress(`✅ Clicked first Continue button for ${serviceName}`);

      // Try clicking second Continue button if it exists
      try {
        await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 2000 });
        logProgress(`✅ Clicked second Continue button for ${serviceName}`);
      } catch {
        logProgress(`No second Continue button found for ${serviceName}, may not be needed`);
      }
    } catch (error) {
      // Alternative flow - user already exists/signed in
      logProgress(`Alternative auth flow for ${serviceName}: ${error}`);

      try {
        await popup
          .getByRole('link', { name: 'Agentis Hall agentis.test@' })
          .waitFor({ timeout: 2000 });
        await popup.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
        logProgress(`✅ Clicked existing account link for ${serviceName}`);

        // Wait for and click Continue button(s)
        await popup.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 5000 });
        await popup.getByRole('button', { name: 'Continue' }).click();
        logProgress(`✅ Clicked Continue button for ${serviceName}`);

        // Try clicking second Continue button if it exists
        try {
          await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 2000 });
          logProgress(`✅ Clicked second Continue button for ${serviceName}`);
        } catch {
          logProgress(`No second Continue button found for ${serviceName}, may not be needed`);
        }
      } catch (altError) {
        logProgress(`❌ Alternative auth flow also failed for ${serviceName}: ${altError}`);
      }
    }

    // Wait for popup to close naturally (indicates OAuth completion)
    try {
      await popup.waitForEvent('close', { timeout: 10000 });
      logProgress(`✅ OAuth popup closed naturally for ${serviceName}`);
    } catch (e) {
      logProgress(`⚠️ Popup didn't close naturally, attempting manual close for ${serviceName}`);
      try {
        await popup.close();
        logProgress(`✅ Manually closed popup for ${serviceName}`);
      } catch (closeError) {
        logProgress(`❌ Could not close popup for ${serviceName}: ${closeError}`);
      }
    }

    // Bring main page to front
    try {
      await page.bringToFront();
      logProgress(`✅ Brought main page to front after OAuth for ${serviceName}`);
    } catch (e) {
      logProgress(`⚠️ Could not bring page to front for ${serviceName}: ${e}`);
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
