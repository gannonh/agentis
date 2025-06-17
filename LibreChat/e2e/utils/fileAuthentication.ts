/**
 * @fileoverview File-scoped authentication helper for e2e tests
 * 
 * Provides a simple way for each test file to create its own unique user
 * and authentication storage state, ensuring complete test isolation.
 */

import { Browser } from '@playwright/test';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import cleanupAgents, { cleanupChats, cleanupConnections } from './cleanupUser';
import connectDb from '@librechat/backend/lib/db/connectDb';
import { User } from '@librechat/backend/models';

export interface FileAuthConfig {
  storageStatePath: string;
  user: {
    name: string;
    email: string;
    password: string;
  };
  uuid: string;
}

/**
 * Performs user registration in the LibreChat application
 */
async function performRegistration(page: any, user: FileAuthConfig['user'], testFileName: string): Promise<boolean> {
  console.log(`🔧 File ${testFileName}: Starting user registration`);

  // Navigate with retry logic - use domcontentloaded instead of networkidle
  let retries = 3;
  while (retries > 0) {
    try {
      await page.goto('http://localhost:3080/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      await page.waitForLoadState('domcontentloaded');
      console.log(`🔧 File ${testFileName}: Successfully navigated to homepage. Current URL: ${page.url()}`);
      break;
    } catch (error) {
      retries--;
      console.log(`🔧 File ${testFileName}: Navigation failed, ${retries} retries left. Error: ${error}`);
      if (retries === 0) {
        console.error(`🔧 File ${testFileName}: Failed to navigate to homepage after all retries. Current URL: ${page.url()}`);
        throw error;
      }
      await page.waitForTimeout(2000); // Wait 2 seconds before retry
    }
  }

  // Check if we're already on the login page (redirect scenario)
  if (page.url().includes('/login')) {
    console.log(`🔧 File ${testFileName}: Redirected to login page, navigating to registration`);
    try {
      await page.getByRole('link', { name: 'Sign up' }).click();
      await page.waitForLoadState('domcontentloaded');
    } catch (error) {
      console.log(`🔧 File ${testFileName}: Sign up link not found, trying direct navigation to /register`);
      await page.goto('http://localhost:3080/register', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    }
  } else {
    // Try to find and click Sign up link
    try {
      await page.getByRole('link', { name: 'Sign up' }).click();
    } catch (error) {
      console.log(`🔧 File ${testFileName}: Sign up link not found on homepage, navigating directly to /register`);
      await page.goto('http://localhost:3080/register', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    }
  }

  // Fill registration form
  await page.getByLabel('Full name').fill('test');
  await page.getByLabel('Username (optional)').fill('test');
  await page.getByLabel('Email').fill(user.email);
  await page.getByTestId('password').fill(user.password);
  await page.getByTestId('confirm_password').fill(user.password);
  await page.getByLabel('Submit registration').click();

  // Handle registration response
  try {
    await page.waitForURL('/c/new', { timeout: 10000 });
    console.log(`🔧 File ${testFileName}: ✔️ Registration successful - auto-authenticated`);
    return true; // Indicate registration was successful and user is authenticated
  } catch (error) {
    console.log(`🔧 File ${testFileName}: Registration may have failed, will try login... Current URL: ${page.url()}`);

    // Navigate to login page if not already there
    if (!page.url().includes('/login')) {
      await page.goto('http://localhost:3080/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    }
    return false; // Indicate registration failed, need to login
  }
}

/**
 * Performs user login in the LibreChat application
 */
async function performLogin(page: any, user: FileAuthConfig['user'], testFileName: string): Promise<void> {
  console.log(`🔧 File ${testFileName}: Starting user login`);

  // Ensure we're on the login page with retry logic
  if (!page.url().includes('/login')) {
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto('http://localhost:3080/login', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await page.waitForLoadState('domcontentloaded');
        console.log(`🔧 File ${testFileName}: Successfully navigated to login page`);
        break;
      } catch (error) {
        retries--;
        console.log(`🔧 File ${testFileName}: Login page navigation failed, ${retries} retries left. Error: ${error}`);
        if (retries === 0) {
          console.error(`🔧 File ${testFileName}: Failed to navigate to login page. Current URL: ${page.url()}`);
          throw error;
        }
        await page.waitForTimeout(2000); // Wait 2 seconds before retry
      }
    }
  }

  // Wait for the email field to be visible and fill login form
  try {
    console.log(`🔧 File ${testFileName}: Waiting for email field... Current URL: ${page.url()}`);
    await page.waitForSelector('[role="textbox"][name="Email"]', { timeout: 15000 });
    await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(user.password);
    await page.getByTestId('login-button').click();
  } catch (error) {
    console.error(`🔧 File ${testFileName}: Failed to find or fill login form. Current URL: ${page.url()}`);
    console.error(`🔧 File ${testFileName}: Page content: ${await page.content().then((c: string) => c.substring(0, 500))}`);
    throw new Error(`Login form interaction failed: ${error}`);
  }

  // Wait for authentication to complete
  try {
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 15000 });
    console.log(`🔧 File ${testFileName}: ✔️ Login successful`);
  } catch (error) {
    if (page.url().includes('/c/new')) {
      console.log(`🔧 File ${testFileName}: ✔️ Login successful - already on /c/new`);
    } else {
      console.error(`🔧 File ${testFileName}: Login failed. Current URL: ${page.url()}`);
      throw new Error(
        `Login failed - nav-user not found and not on /c/new. Current URL: ${page.url()}`,
      );
    }
  }
}

/**
 * Handles Terms of Service modal that may appear after authentication
 */
async function handleTermsOfService(page: any, testFileName: string): Promise<void> {
  try {
    await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
    console.log(`🔧 File ${testFileName}: ✔️ Accepted Terms of Service`);
  } catch (e) {
    console.log(`🔧 File ${testFileName}: No TOS modal found`);
  }
}

/**
 * Clean up user data from database
 */
async function cleanupCompleteUser(userEmail: string): Promise<void> {
  try {
    console.log(`🧹 Starting complete cleanup for ${userEmail}`);

    // Clean up all user data
    await cleanupAgents(userEmail);
    await cleanupChats(userEmail);
    await cleanupConnections(userEmail);

    // Delete the user account itself
    const db = await connectDb();
    const user = await User.findOne({ email: userEmail });
    if (user) {
      await User.deleteOne({ email: userEmail });
      console.log(`🧹 ✅ Deleted user account: ${userEmail}`);
    } else {
      console.log(`🧹 ⚠️ User ${userEmail} not found, cleanup not needed`);
    }
    await db.connection.close();
  } catch (error) {
    console.error(`🧹 ❌ Error during cleanup for ${userEmail}:`, error);
  }
}

/**
 * Create file-scoped authentication for a test file
 * 
 * @param browser - Playwright browser instance
 * @param testFileName - Name of the test file (for logging)
 * @returns Authentication configuration with storage state path and user details
 */
export async function createFileAuth(browser: Browser, testFileName: string): Promise<FileAuthConfig> {
  // Generate unique UUID for this test file execution
  const uuid = crypto.randomUUID().substring(0, 8);
  const user = {
    name: `Test User ${uuid}`,
    email: `test-${uuid}@librechat.test`,
    password: 'TestPassword123!',
  };
  const storageStatePath = path.join(__dirname, '../fixtures', `storageState-${uuid}.json`);

  console.log(`🔧 File ${testFileName}: Creating auth for unique user: ${user.email}`);

  // Check if storage state already exists
  const fs = await import('fs');
  if (fs.existsSync(storageStatePath)) {
    console.log(`🔧 File ${testFileName}: ✔️ Storage state exists, reusing: ${storageStatePath}`);
    return { storageStatePath, user, uuid };
  }

  console.log(`🔧 File ${testFileName}: Creating fresh authentication`);

  // Clean up any existing user data to ensure a fresh start
  await cleanupCompleteUser(user.email);

  // Initialize browser context and perform authentication
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Set required localStorage before authentication
    await page.addInitScript(() => {
      localStorage.setItem('navVisible', 'true');
    });

    // Add page event listeners for better debugging
    page.on('pageerror', (err: Error) => {
      console.error(`🔧 File ${testFileName}: Page error: ${err.message}`);
    });
    
    page.on('requestfailed', (request: any) => {
      console.error(`🔧 File ${testFileName}: Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    console.log(`🔧 File ${testFileName}: Starting authentication flow for ${user.email}`);

    // Perform complete authentication flow
    const registrationSuccessful = await performRegistration(page, user, testFileName);
    
    if (!registrationSuccessful) {
      // Only perform login if registration didn't auto-authenticate
      await performLogin(page, user, testFileName);
    }
    
    await handleTermsOfService(page, testFileName);

    // Verify final authentication state
    console.log(`🔧 File ${testFileName}: Verifying authentication state...`);
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 15000 });
    console.log(`🔧 File ${testFileName}: ✔️ User successfully authenticated`);

    // Save the storage state for reuse
    await context.storageState({ path: storageStatePath });
    console.log(`🔧 File ${testFileName}: ✔️ Authentication state saved: ${storageStatePath}`);
  } catch (error) {
    console.error(`🔧 File ${testFileName}: ❌ Authentication failed for ${user.email}:`, error);
    console.error(`🔧 File ${testFileName}: Final URL: ${page.url()}`);
    // Take a screenshot for debugging
    try {
      const screenshotPath = path.join(__dirname, '../fixtures', `auth-failure-${uuid}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`🔧 File ${testFileName}: Screenshot saved to: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error(`🔧 File ${testFileName}: Failed to take screenshot: ${screenshotError}`);
    }
    throw error;
  } finally {
    // Ensure context is properly closed
    try {
      await Promise.race([
        context.close(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Context close timeout')), 5000),
        ),
      ]);
      console.log(`🔧 File ${testFileName}: ✔️ Browser context closed`);
    } catch (closeError) {
      console.log(
        `🔧 File ${testFileName}: ⚠️ Context close error: ${closeError instanceof Error ? closeError.message : String(closeError)}`,
      );
      // Continue anyway - Playwright will clean up
    }
  }

  return { storageStatePath, user, uuid };
}