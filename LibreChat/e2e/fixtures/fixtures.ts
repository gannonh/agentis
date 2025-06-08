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

// Test user interface for UUID-based unique users
interface TestUser {
  name: string;
  email: string;
  password: string;
}
import cleanupAgents, { cleanupChats, cleanupConnections } from '../utils/cleanupUser';
import connectDb from '@librechat/backend/lib/db/connectDb';
import { User } from '@librechat/backend/models';

export * from '@playwright/test';

// Complete user cleanup function
async function cleanupCompleteUser(userEmail: string): Promise<void> {
  try {
    console.log(`🧹 File: Starting complete cleanup for ${userEmail}`);

    // Clean up all user data
    await cleanupAgents(userEmail);
    await cleanupChats(userEmail);
    await cleanupConnections(userEmail);

    // Delete the user account itself
    const db = await connectDb();
    const user = await User.findOne({ email: userEmail });
    if (user) {
      await User.deleteOne({ email: userEmail });
      console.log(`🧹 File: ✅ Deleted user account: ${userEmail}`);
    } else {
      console.log(`🧹 File: ⚠️ User ${userEmail} not found, cleanup not needed`);
    }
    await db.connection.close();
  } catch (error) {
    console.error(`🧹 File: ❌ Error during cleanup for ${userEmail}:`, error);
  }
}

// Extend base test with file-scoped authentication
export const test = baseTest.extend<object, { fileStorageState: string }>({
  // Returns storage state file path unique for the test file
  fileStorageState: [
    async ({ browser }, use, testInfo) => {
      // Create unique user for each test file using UUID
      const uuid = crypto.randomUUID().substring(0, 8);
      const user: TestUser = {
        name: `Test User ${uuid}`,
        email: `test-${uuid}@librechat.test`,
        password: 'TestPassword123!'
      };
      const storageStatePath = path.join(__dirname, `storageState-${uuid}.json`);
      const testFileName = testInfo?.file?.split('/').pop() || testInfo?.title || 'unknown';

      console.log(`🔧 File ${testFileName}: Creating auth for unique user: ${user.email}`);

      // Check if storage state file already exists and validate it
      const fs = await import('fs');
      if (fs.existsSync(storageStatePath)) {
        console.log(`🔧 File ${testFileName}: ✔️ Storage state exists, validating...`);

        // Test if storage state is still valid
        const testContext = await browser.newContext({ storageState: storageStatePath });
        const testPage = await testContext.newPage();
        await testPage.goto('http://localhost:3080/');

        if (testPage.url().includes('/login')) {
          console.log(`🔧 File ${testFileName}: ⚠️ Storage state expired, recreating...`);
          await testContext.close();
          fs.unlinkSync(storageStatePath);
          // Continue with fresh authentication below...
        } else {
          console.log(`🔧 File ${testFileName}: ✔️ Storage state valid, reusing ${storageStatePath}`);
          await testContext.close();
          await use(storageStatePath);
          return;
        }
      }

      console.log(`🔧 File ${testFileName}: No existing storage state, creating fresh authentication`);

      // Clean up any existing user data first to ensure a fresh start
      await cleanupCompleteUser(user.email);

      // Initialize user authentication in the browser
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // Set localStorage before navigating to the page
        await page.addInitScript(() => {
          localStorage.setItem('navVisible', 'true');
        });

        await page.goto('http://localhost:3080/');

        // Register the clean user - use the exact same flow as authenticate.ts
        await page.getByRole('link', { name: 'Sign up' }).click();
        await page.getByLabel('Full name').click();
        await page.getByLabel('Full name').fill('test'); // Use hardcoded value like authenticate.ts
        await page.getByText('Username (optional)').click();
        await page.getByLabel('Username (optional)').fill('test'); // Use hardcoded value like authenticate.ts
        await page.getByLabel('Email').click();
        await page.getByLabel('Email').fill(user.email);
        await page.getByLabel('Email').press('Tab');
        await page.getByTestId('password').click();
        await page.getByTestId('password').fill(user.password);
        await page.getByTestId('confirm_password').click();
        await page.getByTestId('confirm_password').fill(user.password);
        await page.getByLabel('Submit registration').click();

        // Try to wait for registration success first, handle user exists case
        try {
          await page.waitForURL('/c/new', { timeout: 6000 });
          console.log(`🔧 File ${testFileName}: ✔️ Registration successful`);
        } catch (error) {
          console.log(
            `🔧 File ${testFileName}: Registration may have failed, checking if user exists...`,
          );

          // Check if we're on login page (user might already exist)
          const currentUrl = page.url();
          if (
            currentUrl.includes('/login') ||
            (await page.locator('input[name="email"]').isVisible())
          ) {
            console.log(`🔧 File ${testFileName}: User may already exist, trying login...`);
          } else {
            // Navigate to login page
            await page.goto('http://localhost:3080/login');
          }
        }

        // Always do login step after registration (registration never auto-logs in)
        console.log(`🔧 File ${testFileName}: Registration complete, now performing login step`);
        
        // Navigate to login if not already there
        if (!page.url().includes('/login')) {
          await page.goto('http://localhost:3080/login');
        }
        
        console.log(`🔧 File ${testFileName}: Performing login step`);
        await page.getByRole('textbox', { name: 'Email' }).fill(user.email);
        await page.getByRole('textbox', { name: 'Password' }).fill(user.password);
        await page.getByTestId('login-button').click();
        console.log(`🔧 File ${testFileName}: Clicked login button`);

        // Wait for authentication to complete by checking for the user nav element
        // instead of waiting for URL change (which might already be /c/new)
        try {
          await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
          console.log(`🔧 File ${testFileName}: ✔️ Login successful - found nav-user element`);
        } catch (error) {
          // Fallback: check if we're on /c/new
          if (page.url().includes('/c/new')) {
            console.log(`🔧 File ${testFileName}: ✔️ Login successful - already on /c/new`);
          } else {
            throw new Error(
              `Login failed - nav-user not found and not on /c/new. Current URL: ${page.url()}`,
            );
          }
        }

        // Handle TOS modal that appears after successful registration
        try {
          await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
          console.log(`🔧 File ${testFileName}: ✔️ Accepted Terms of Service`);
        } catch (e) {
          console.log(`🔧 File ${testFileName}: No TOS modal found`);
        }

        // Wait for authentication to be established
        await page.waitForSelector('[data-testid="nav-user"]', { timeout: 10000 });
        console.log(`🔧 File ${testFileName}: ✔️ User successfully registered and authenticated`);

        // Save the storage state
        await context.storageState({ path: storageStatePath });
        console.log(`🔧 File ${testFileName}: ✔️ Authentication state saved in ${storageStatePath}`);
      } catch (error) {
        console.error(`🔧 File ${testFileName}: ❌ Authentication failed for ${user.email}:`, error);
        throw error;
      } finally {
        console.log(`🔧 File ${testFileName}: Closing browser context...`);
        try {
          await Promise.race([
            context.close(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Context close timeout')), 5000),
            ),
          ]);
          console.log(`🔧 File ${testFileName}: ✔️ Browser context closed`);
        } catch (closeError) {
          console.log(`🔧 File ${testFileName}: ⚠️ Context close error: ${closeError.message}`);
          // Continue anyway - the context will be cleaned up by Playwright
        }
      }

      console.log(`🔧 File ${testFileName}: Calling use() with storage state...`);
      await use(storageStatePath);
      console.log(`🔧 File ${testFileName}: ✔️ use() completed, preserving storage state for reuse`);

      // DON'T clean up storage state file - we want to reuse it for subsequent tests!
      console.log(
        `🔧 File ${testFileName}: ✔️ Storage state preserved at ${storageStatePath} for test reuse`,
      );
    },
    { scope: 'worker' },
  ],
});
