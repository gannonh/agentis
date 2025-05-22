import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Google MCP authentication and landing page', async ({ page }) => {
  await page.goto('http://localhost:3081/');

  // Handle Terms of Service modal if it appears
  try {
    await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
  } catch (e) {
    // Modal might not appear, continue
    console.log('No TOS modal found or could not click accept button');
  }

  // Verify successful authentication by checking for main app elements
  await expect(page.locator('nav')).toBeVisible();
  await expect(page.locator('form')).toBeVisible(); // Chat form should be visible

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
});
