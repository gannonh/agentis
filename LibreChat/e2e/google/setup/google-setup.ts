import { FullConfig } from '@playwright/test';
import authenticate from '../../setup/authenticate';
import dotenv from 'dotenv';
import path from 'path';

// Ensure environment variables are loaded for VS Code GUI
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'LibreChat/.env'),
];

for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('🤖: GOOGLE SETUP - Loaded env from:', envPath);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

async function googleSetup(config: FullConfig) {
  console.log('🤖: GOOGLE SETUP -----------------');

  // Validate that required environment variables are available
  if (!process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || !process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD) {
    console.error('❌ Missing Google test credentials in environment variables');
    console.log('Required: GOOGLE_TEST_ACCOUNT_1_EMAIL, GOOGLE_TEST_ACCOUNT_1_PASSWORD');
    throw new Error('Missing required Google test account credentials');
  }

  const user = {
    name: 'Agentis Test',
    email: String(process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL),
    password: String(process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD),
  };

  console.log('🤖: Authenticating user:', user.email);
  await authenticate(config, user);
  console.log('🤖: GOOGLE SETUP COMPLETE ✅');
}

export default googleSetup;
