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
    console.log(`🔧 File ${testFileName}: ✔️ Registration successful - auto-authenticated`);
    return true; // Indicate registration was successful and user is authenticated
  } catch (error) {
    console.log(`🔧 File ${testFileName}: Registration may have failed, will try login...`);

    // Navigate to login page if not already there
    if (!page.url().includes('/login')) {
      await page.goto('http://localhost:3080/login');
    }
    return false; // Indicate registration failed, need to login
  }
}

/**
 * Performs user login in the LibreChat application
 */
async function performLogin(page: any, user: FileAuthConfig['user'], testFileName: string): Promise<void> {
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

    // Perform complete authentication flow
    const registrationSuccessful = await performRegistration(page, user, testFileName);
    
    if (!registrationSuccessful) {
      // Only perform login if registration didn't auto-authenticate
      await performLogin(page, user, testFileName);
    }
    
    await handleTermsOfService(page, testFileName);

    // Verify final authentication state
    await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
    console.log(`🔧 File ${testFileName}: ✔️ User successfully authenticated`);

    // Save the storage state for reuse
    await context.storageState({ path: storageStatePath });
    console.log(`🔧 File ${testFileName}: ✔️ Authentication state saved: ${storageStatePath}`);
  } catch (error) {
    console.error(`🔧 File ${testFileName}: ❌ Authentication failed for ${user.email}:`, error);
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