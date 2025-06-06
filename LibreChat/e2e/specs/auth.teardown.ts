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

    // Read the test user info from storage state
    const storageStatePath = path.resolve(process.cwd(), 'e2e/storageState.json');
    let user = { email: '', password: '' };
    
    if (fs.existsSync(storageStatePath)) {
      const storageState = JSON.parse(fs.readFileSync(storageStatePath, 'utf8'));
      const origin = storageState.origins?.find(o => o.origin === 'http://localhost:3080');
      if (origin?.localStorage) {
        const emailItem = origin.localStorage.find(item => item.name === 'testUserEmail');
        const passwordItem = origin.localStorage.find(item => item.name === 'testUserPassword');
        if (emailItem && passwordItem) {
          user.email = emailItem.value;
          user.password = passwordItem.value;
        }
      }
    }
    
    if (!user.email || !user.password) {
      console.log('⚠️ No test user found in storage state for cleanup');
      return;
    }
    
    console.log('🤖: Cleaning up test user:', user.email);
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
