/**
 * @fileoverview Playwright test fixtures with UUID-based user isolation
 * 
 * This module provides a file-scoped authentication fixture that creates unique users
 * for each test file using UUIDs. This ensures complete test isolation where each
 * test file gets its own user account and data, preventing cross-contamination.
 * 
 * Authentication Flow:
 * 1. Generate UUID for unique user identification
 * 2. Check if storage state exists and is valid
 * 3. If not, create fresh user: Registration → Login → Accept TOS → Save Storage State
 * 4. Reuse storage state for subsequent tests in the same file
 * 
 * @see {@link /Users/gannonhall/dev/agentis/LibreChat/e2e/README.md#test-isolation-pattern-definitive} for pattern documentation
 */

// Set environment variables FIRST, before any imports that might load backend models
import playwrightConfig from '../playwright.config';

// Extract environment variables from playwright config to ensure consistency
const webServerConfig = Array.isArray(playwrightConfig.webServer)
  ? playwrightConfig.webServer[0]
  : playwrightConfig.webServer;
const webServerEnv = webServerConfig?.env || {};
Object.assign(process.env, {
  NODE_ENV: webServerEnv.NODE_ENV,
  EMAIL_HOST: webServerEnv.EMAIL_HOST,
  SEARCH: webServerEnv.SEARCH,
  SESSION_EXPIRY: webServerEnv.SESSION_EXPIRY,
  ALLOW_REGISTRATION: webServerEnv.ALLOW_REGISTRATION,
  REFRESH_TOKEN_EXPIRY: webServerEnv.REFRESH_TOKEN_EXPIRY,
});

import { test as baseTest, expect } from '@playwright/test';
import path from 'path';
import cleanupAgents, { cleanupChats, cleanupConnections } from '../utils/cleanupUser';
import connectDb from '@librechat/backend/lib/db/connectDb';
import { User } from '@librechat/backend/models';

export * from '@playwright/test';

/**
 * Test user interface for UUID-based unique users
 */
interface TestUser {
  /** Display name for the test user */
  name: string;
  /** Unique email address using UUID pattern: test-{uuid}@librechat.test */
  email: string;
  /** Standard test password for all test users */
  password: string;
}

/**
 * Performs complete cleanup of user data and account
 * 
 * This function removes all user-related data from the database including:
 * - Agents created by the user
 * - Chat conversations and messages
 * - External service connections
 * - User account itself
 * 
 * @param userEmail - The email address of the user to clean up
 * @returns Promise that resolves when cleanup is complete
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
 * Validates that a storage state file contains valid authentication
 * 
 * @param browser - Playwright browser instance
 * @param storageStatePath - Path to the storage state file to validate
 * @param testFileName - Name of the test file for logging
 * @returns Promise<boolean> - true if storage state is valid, false otherwise
 */
async function validateStorageState(
  browser: any,
  storageStatePath: string,
  testFileName: string
): Promise<boolean> {
  try {
    const testContext = await browser.newContext({ storageState: storageStatePath });
    const testPage = await testContext.newPage();
    await testPage.goto('http://localhost:3080/');

    const isValid = !testPage.url().includes('/login');
    await testContext.close();
    
    if (isValid) {
      console.log(`🔧 File ${testFileName}: ✔️ Storage state valid, reusing`);
    } else {
      console.log(`🔧 File ${testFileName}: ⚠️ Storage state expired, recreating...`);
    }
    
    return isValid;
  } catch (error) {
    // TODO: Add more specific error handling for different failure types
    console.log(`🔧 File ${testFileName}: ⚠️ Storage state validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Performs user registration in the LibreChat application
 * 
 * @param page - Playwright page instance
 * @param user - Test user object with registration details
 * @param testFileName - Name of the test file for logging
 * @returns Promise that resolves when registration is complete
 */
async function performRegistration(page: any, user: TestUser, testFileName: string): Promise<void> {
  console.log(`🔧 File ${testFileName}: Starting user registration`);
  
  await page.goto('http://localhost:3080/');
  await page.getByRole('link', { name: 'Sign up' }).click();
  
  // Fill registration form
  await page.getByLabel('Full name').fill('test');
  await page.getByLabel('Username (optional)').fill('test');
  await page.getByLabel('Email').fill(user.email);
  await page.getByTestId('password').fill(user.password);
  await page.getByTestId('confirm_password').fill(user.password);
  await page.getByLabel('Submit registration').click();

  // Handle registration response
  try {
    await page.waitForURL('/c/new', { timeout: 6000 });
    console.log(`🔧 File ${testFileName}: ✔️ Registration successful`);
  } catch (error) {
    console.log(`🔧 File ${testFileName}: Registration may have failed, will try login...`);
    
    // Navigate to login page if not already there
    if (!page.url().includes('/login')) {
      await page.goto('http://localhost:3080/login');
    }
  }
}

/**
 * Performs user login in the LibreChat application
 * 
 * @param page - Playwright page instance
 * @param user - Test user object with login credentials
 * @param testFileName - Name of the test file for logging
 * @returns Promise that resolves when login is complete
 */
async function performLogin(page: any, user: TestUser, testFileName: string): Promise<void> {
  console.log(`🔧 File ${testFileName}: Starting user login`);
  
  // Ensure we're on the login page
  if (!page.url().includes('/login')) {
    await page.goto('http://localhost:3080/login');
  }
  
  // Fill login form
  await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(user.password);
  await page.getByTestId('login-button').click();

  // Wait for authentication to complete
  try {
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
    console.log(`🔧 File ${testFileName}: ✔️ Login successful`);
  } catch (error) {
    if (page.url().includes('/c/new')) {
      console.log(`🔧 File ${testFileName}: ✔️ Login successful - already on /c/new`);
    } else {
      throw new Error(
        `Login failed - nav-user not found and not on /c/new. Current URL: ${page.url()}`
      );
    }
  }
}

/**
 * Handles Terms of Service modal that may appear after authentication
 * 
 * @param page - Playwright page instance
 * @param testFileName - Name of the test file for logging
 * @returns Promise that resolves when TOS handling is complete
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
 * Extended Playwright test with file-scoped authentication fixture
 * 
 * The fileStorageState fixture creates a unique user for each test file using UUIDs,
 * ensuring complete test isolation. The authentication state is saved and reused
 * for all tests within the same file.
 */
export const test = baseTest.extend<object, { fileStorageState: string }>({
  /**
   * File-scoped storage state fixture that provides unique authentication per test file
   * 
   * This fixture:
   * 1. Generates a unique UUID for the test file
   * 2. Creates a unique user account: test-{uuid}@librechat.test
   * 3. Performs authentication: Registration → Login → Accept TOS
   * 4. Saves browser storage state for reuse within the file
   * 5. Provides complete test isolation between different test files
   * 
   * @param browser - Playwright browser instance
   * @param use - Fixture use function to provide storage state path
   * @param testInfo - Playwright test information object
   */
  fileStorageState: [
    async ({ browser }, use, testInfo) => {
      // Generate unique user for each test file
      const uuid = crypto.randomUUID().substring(0, 8);
      const user: TestUser = {
        name: `Test User ${uuid}`,
        email: `test-${uuid}@librechat.test`,
        password: 'TestPassword123!'
      };
      const storageStatePath = path.join(__dirname, `storageState-${uuid}.json`);
      const testFileName = testInfo?.file?.split('/').pop() || testInfo?.title || 'unknown';

      console.log(`🔧 File ${testFileName}: Creating auth for unique user: ${user.email}`);

      // Check if storage state already exists and is valid
      const fs = await import('fs');
      if (fs.existsSync(storageStatePath)) {
        console.log(`🔧 File ${testFileName}: ✔️ Storage state exists, validating...`);
        
        const isValid = await validateStorageState(browser, storageStatePath, testFileName);
        if (isValid) {
          await use(storageStatePath);
          return;
        } else {
          // Remove invalid storage state
          // TODO: Add logging for why storage state was invalid
          fs.unlinkSync(storageStatePath);
        }
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

        // Perform complete authentication flow
        await performRegistration(page, user, testFileName);
        await performLogin(page, user, testFileName);
        await handleTermsOfService(page, testFileName);

        // Verify final authentication state
        await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
        console.log(`🔧 File ${testFileName}: ✔️ User successfully authenticated`);

        // Save the storage state for reuse
        await context.storageState({ path: storageStatePath });
        console.log(`🔧 File ${testFileName}: ✔️ Authentication state saved`);
        
      } catch (error) {
        console.error(`🔧 File ${testFileName}: ❌ Authentication failed for ${user.email}:`, error);
        throw error;
      } finally {
        // Ensure context is properly closed
        try {
          await Promise.race([
            context.close(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Context close timeout')), 5000)
            ),
          ]);
          console.log(`🔧 File ${testFileName}: ✔️ Browser context closed`);
        } catch (closeError) {
          console.log(`🔧 File ${testFileName}: ⚠️ Context close error: ${closeError.message}`);
          // Continue anyway - Playwright will clean up
        }
      }

      // Provide storage state to tests
      await use(storageStatePath);
      console.log(`🔧 File ${testFileName}: ✔️ Storage state preserved for test reuse`);
      
      // TODO: Add cleanup strategy for old storage state files (remove files older than 7 days)
      // TODO: Add retry logic for flaky authentication steps with exponential backoff
      // TODO: Consider adding performance metrics for authentication time tracking
    },
    { scope: 'worker' },
  ],
});