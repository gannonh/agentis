import cleanupUser from './cleanupUser';
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function googleTeardown() {
  try {
    console.log('🤖: GOOGLE TEARDOWN -----------------');
    // Clean up the Google test user
    if (process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL && process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD) {
      const googleTestUser = {
        email: process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL,
        password: process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD,
      };
      await cleanupUser(googleTestUser);
    }

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
  } catch (error) {
    console.error('Error during Google teardown:', error);
  }
}

export default googleTeardown;
