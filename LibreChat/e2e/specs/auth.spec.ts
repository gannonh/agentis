import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

if (!process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || !process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD) {
  throw new Error(
    'GOOGLE_TEST_ACCOUNT_1_EMAIL and GOOGLE_TEST_ACCOUNT_1_PASSWORD must be set in environment',
  );
}

const testEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL;
const testPassword = process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD;

test('user registration and login flow', async ({ page }) => {
  await page.goto('http://localhost:3081/login');

  // Pause here to interact with TOS modal
  // await page.pause();

  // Handle Terms of Service modal if it appears
  try {
    await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
  } catch (e) {
    // Modal might not appear, continue
    console.log('No TOS modal found or could not click accept button');
  }

  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByTestId('name').click();
  await page.getByTestId('name').fill('Agentis Test');
  await page.getByTestId('username').click();
  await page.getByTestId('username').fill('Agentis');
  await page.getByTestId('email').click();
  await page.getByTestId('email').fill(testEmail);
  await page.getByTestId('password').click();
  await page.getByTestId('password').fill(testPassword);
  await page.getByTestId('confirm_password').click();
  await page.getByTestId('confirm_password').fill(testPassword);
  await page.getByRole('button', { name: 'Submit registration' }).click();
  await page.locator('input[name="email"]').click();
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill(testPassword);
  await page.locator('input[name="email"]').click();
  await page.locator('input[name="email"]').fill(testEmail);
  await page.getByTestId('login-button').click();
});
