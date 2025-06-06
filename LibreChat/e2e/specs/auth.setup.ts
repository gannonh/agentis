import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { chromium } from '@playwright/test';
import fs from 'fs';
import cleanupUser from '../setup/cleanupUser';
import cleanupAgents, { cleanupChats, cleanupConnections } from '../utils/cleanupUser';

const STORAGE_STATE = path.join(__dirname, '../storageState.json');
const timeout = 6000;

// Ensure environment variables are loaded
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'LibreChat/.env'),
];

for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('🤖: AUTH SETUP - Loaded env from:', envPath);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

async function register(page, user) {
  await page.getByRole('link', { name: 'Sign up' }).click();
  await page.getByLabel('Full name').click();
  await page.getByLabel('Full name').fill(user.name);
  await page.getByText('Username (optional)').click();
  await page.getByLabel('Username (optional)').fill(user.name);
  await page.getByLabel('Email').click();
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Email').press('Tab');
  await page.getByTestId('password').click();
  await page.getByTestId('password').fill(user.password);
  await page.getByTestId('confirm_password').click();
  await page.getByTestId('confirm_password').fill(user.password);
  await page.getByLabel('Submit registration').click();
}

async function login(page, user) {
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page.locator('input[name="password"]').press('Enter');
}

test('authenticate test user', async ({ page }) => {
  console.log('🤖: AUTH SETUP PROJECT -----------------');

  // Check if we have Google test credentials, otherwise fallback to E2E credentials
  let user;
  if (process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL && process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD) {
    // Use Google test credentials if available
    user = {
      name: 'Agentis Test',
      email: String(process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL),
      password: String(process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD),
    };
    console.log('🤖: Using Google test credentials for user:', user.email);
  } else if (process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD) {
    // Fallback to standard E2E credentials
    user = {
      name: 'test',
      email: String(process.env.E2E_USER_EMAIL),
      password: String(process.env.E2E_USER_PASSWORD),
    };
    console.log('🤖: Using E2E test credentials for user:', user.email);
  } else {
    console.error('❌ Missing test credentials in environment variables');
    console.log(
      'Required: Either (GOOGLE_TEST_ACCOUNT_1_EMAIL, GOOGLE_TEST_ACCOUNT_1_PASSWORD) or (E2E_USER_EMAIL, E2E_USER_PASSWORD)',
    );
    throw new Error('Missing required test account credentials');
  }

  console.log('🤖: Authenticating user:', user.email);

  // Run full teardown/cleanup process before setup (same as auth.teardown.ts)
  try {
    console.log('🤖: Running full cleanup before setup...');
    const testUserEmail = user.email;
    await cleanupAgents(testUserEmail);
    console.log('🤖: ✔️  Cleaned up agents for user:', testUserEmail);
    await cleanupChats(testUserEmail);
    console.log('🤖: ✔️  Cleaned up chats for user:', testUserEmail);
    await cleanupConnections(testUserEmail);
    console.log('🤖: ✔️  Cleaned up connections for user:', testUserEmail);
    await cleanupUser(user);
    console.log('🤖: ✔️  Cleaned up user:', testUserEmail);

    // Clear browser storage state
    const storageStatePath = path.resolve(process.cwd(), 'e2e/storageState.json');
    if (fs.existsSync(storageStatePath)) {
      fs.unlinkSync(storageStatePath);
      console.log('🤖: ✔️  Cleared browser storage state');
    }

    // Clear any browser cookies and local storage
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    await context.clearCookies();
    await browser.close();
    console.log('🤖: ✔️  Cleared browser cookies and storage');
    console.log('🤖: ✔️  Full cleanup complete - fresh state guaranteed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('🤖: Cleanup failed or no data to clean:', errorMessage);
  }

  // Set localStorage before navigating to the page
  await page.addInitScript(() => {
    localStorage.setItem('navVisible', 'true');
  });
  console.log('🤖: ✔️  localStorage: set Nav as Visible');

  await page.goto('http://localhost:3080/', { timeout });

  try {
    await register(page, user);
    console.log('🤖: Registration form submitted, waiting for navigation...');

    // Wait a moment to see where we end up after registration
    await page.waitForTimeout(2000);
    console.log('🤖: Current URL after registration:', page.url());

    // Check if registration succeeded (redirected to /c/new) or failed (stayed on /register)
    if (page.url().includes('/register')) {
      console.log('🤖: Registration failed - user already exists, proceeding to login...');
      throw new Error('User already exists, need to login instead');
    }

    // If we reach here, registration succeeded and auto-logged us in
    await page.waitForURL('http://localhost:3080/c/new', { timeout });

    // Handle TOS modal that appears after successful registration auto-login
    try {
      await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
      console.log('🤖: ✔️  Accepted Terms of Service after registration');
    } catch (e) {
      console.log('🤖: No TOS modal found after registration');
    }

    // Wait for authentication to be established
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
    console.log('🤖: ✔️  user successfully registered and authenticated');
  } catch (error) {
    console.log('🤖: Registration failed, trying login for existing user...');

    // Always try login if registration fails - simpler and more reliable
    await page.goto('http://localhost:3080/', { timeout });
    await login(page, user);

    try {
      await page.waitForURL('http://localhost:3080/c/new', { timeout });

      // Handle Terms of Service modal if it appears after login
      try {
        await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
        console.log('🤖: ✔️  Accepted Terms of Service after login');
      } catch (e) {
        console.log('🤖: No TOS modal found after login');
      }

      // Wait for authentication to be established after login
      await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
      console.log('🤖: ✔️  user successfully logged in and authenticated');
    } catch (loginError) {
      // If login also fails, clean up user and try registration again
      console.log('🤖: Login failed, cleaning up user and retrying registration...');
      const { default: cleanupUser } = await import('../setup/cleanupUser');
      await cleanupUser(user);
      await page.goto('http://localhost:3080/', { timeout });
      await register(page, user);
      await page.waitForURL('http://localhost:3080/c/new', { timeout });

      // Handle Terms of Service modal if it appears after cleanup registration
      try {
        await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
        console.log('🤖: ✔️  Accepted Terms of Service after cleanup registration');
      } catch (e) {
        console.log('🤖: No TOS modal found after cleanup registration');
      }

      // Wait for authentication to be established after cleanup registration
      await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
      console.log('🤖: ✔️  user successfully registered after cleanup and authenticated');
    }
  }

  // Save the storage state
  await page.context().storageState({ path: STORAGE_STATE });
  console.log('🤖: ✔️  authentication state successfully saved in', STORAGE_STATE);
  console.log('🤖: AUTH SETUP PROJECT COMPLETE ✅');
});
