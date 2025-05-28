import { FullConfig } from '@playwright/test';
import authenticate from './authenticate';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded for VS Code GUI
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'LibreChat/.env'),
];

for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('🤖: SETUP - Loaded env from:', envPath);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

async function globalSetup(config: FullConfig) {
  console.log('🤖: GLOBAL SETUP -----------------');

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
  await authenticate(config, user);
  console.log('🤖: GLOBAL SETUP COMPLETE ✅');
}

export default globalSetup;
