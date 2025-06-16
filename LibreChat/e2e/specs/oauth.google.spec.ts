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
    await page.goto('http://localhost:3090/login');
    await page.getByTestId('google').click();
    await page.getByRole('textbox', { name: 'Email or phone' }).fill('agentis.test@gmail.com');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('textbox', { name: 'Enter your password' }).click();
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('KJHkh97HKH87jjfU');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('nav-user')).toBeVisible();
  });
});
