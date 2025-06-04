import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cleanupUser from '../setup/cleanupUser';
import cleanupAgents, { cleanupChats, cleanupConnections } from '../utils/cleanupUser';

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'LibreChat/.env'),
];

for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('🤖: AUTH TEARDOWN - Loaded env from:', envPath);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

test('cleanup test user', async () => {
  try {
    console.log('🤖: AUTH TEARDOWN PROJECT -----------------');

    // Clean up the appropriate test user based on what credentials are available
    let user;
    if (process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL && process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD) {
      user = {
        email: process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL,
        password: process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD,
      };
      console.log('🤖: Cleaning up Google test user:', user.email);
    } else if (process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD) {
      user = {
        email: String(process.env.E2E_USER_EMAIL),
        password: String(process.env.E2E_USER_PASSWORD),
      };
      console.log('🤖: Cleaning up E2E test user:', user.email);
    } else {
      console.log('⚠️ No test user credentials found for cleanup');
      return;
    }
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
    console.log('🤖: AUTH TEARDOWN PROJECT COMPLETE ✅');
  } catch (error) {
    console.error('Error during auth teardown:', error);
  }
});
