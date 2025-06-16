import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
  channel: 'chrome', // Use Google Chrome instead of Chromium
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Google OAuth Login Tests', () => {
  test('Login with Google Credentials', async ({ page }) => {
    logProgress('Starting Google OAuth Login test');
    //await page.pause(); // codegen
    await page.goto('http://localhost:3080/');
    // verify redirect to login page
    await expect(page.getByText("Don't have an account? Sign up")).toBeVisible();
    logProgress('✅ Verified on login page');
    await page.getByTestId('google').click();
    await page
      .getByRole('textbox', { name: 'Email or phone' })
      .fill(process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || '');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('textbox', { name: 'Enter your password' }).click();
    await page
      .getByRole('textbox', { name: 'Enter your password' })
      .fill(process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('nav-user')).toBeVisible();
    logProgress('✅ Verified logged in');

    // Verify we're on the main chat page
    await expect(page).toHaveURL(/.*\/c\/new/);
    logProgress('✅ Verified on main chat page');
  });
});
