import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

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

  // Always use unique test user to avoid race conditions in parallel tests
  const testId = randomUUID();
  const user = {
    name: `Test User ${testId.slice(0, 8)}`,
    email: `test-${testId}@test.com`,
    password: testId, // Using UUID as password (>9 chars requirement)
  };
  console.log('🤖: Generated unique test user:', user.email);

  console.log('🤖: Authenticating user:', user.email);

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
      // With unique users, if login fails it means user doesn't exist - this is expected
      console.log('🤖: Login failed (expected for new unique user), registration was successful');
      throw new Error('Login failed after registration - this should not happen with unique users');
    }
  }

  // Save the storage state with user info embedded
  const storageState = await page.context().storageState();
  // Add custom data to localStorage to persist user info for teardown
  storageState.origins = storageState.origins || [];
  const origin = storageState.origins.find((o) => o.origin === 'http://localhost:3080') || {
    origin: 'http://localhost:3080',
    localStorage: [],
  };
  if (!storageState.origins.includes(origin)) {
    storageState.origins.push(origin);
  }
  origin.localStorage = origin.localStorage || [];
  origin.localStorage.push(
    { name: 'testUserEmail', value: user.email },
    { name: 'testUserPassword', value: user.password },
  );

  // Write the enhanced storage state
  fs.writeFileSync(STORAGE_STATE, JSON.stringify(storageState, null, 2));
  console.log('🤖: ✔️  authentication state successfully saved in', STORAGE_STATE);
  console.log('🤖: AUTH SETUP PROJECT COMPLETE ✅');
});
