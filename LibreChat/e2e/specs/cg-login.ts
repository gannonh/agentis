import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('basic', async ({ page }) => {
  await page.goto('http://localhost:3090/');
  await page.getByTestId('google').click();
  await page.getByRole('textbox', { name: 'Email or phone' }).click();
  await page.getByRole('textbox', { name: 'Email or phone' }).fill('agentis.test@gmail.com');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'Enter your password' }).click();
  await page.getByRole('textbox', { name: 'Enter your password' }).fill('KJHkh97HKH87jjfU');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
});
