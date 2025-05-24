import { PlaywrightTestConfig } from '@playwright/test';
import mainConfig from '../playwright.config';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file - try multiple possible paths
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'LibreChat/.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    console.log('Trying to load env from:', envPath);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('✅ Successfully loaded env from:', envPath);
      envLoaded = true;
      break;
    }
  } catch (error) {
    console.log('❌ Failed to load env from:', envPath);
  }
}

if (!envLoaded) {
  console.error('❌ Could not load .env file from any attempted path');
}

// Validate critical environment variables
const requiredVars = ['MONGO_URI', 'GOOGLE_TEST_ACCOUNT_1_EMAIL', 'GOOGLE_TEST_ACCOUNT_1_PASSWORD'];
const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log(
    'Available MONGO vars:',
    Object.keys(process.env).filter((key) => key.includes('MONGO')),
  );
  console.log(
    'Available GOOGLE vars:',
    Object.keys(process.env).filter((key) => key.includes('GOOGLE')),
  );
} else {
  console.log('✅ All required environment variables are present');
}

const absolutePath = path.join(__dirname, '../../api/server/index.js');

const config: PlaywrightTestConfig = {
  ...mainConfig,
  retries: 0,
  globalSetup: require.resolve('../setup/google-setup'),
  globalTeardown: require.resolve('../setup/google-teardown'),
  webServer: {
    ...mainConfig.webServer,
    command: `node ${absolutePath}`,
    port: 3080,
    env: {
      ...process.env,
      NODE_ENV: 'CI',
      // Explicitly set critical variables to ensure they're passed to the server
      MONGO_URI: process.env.MONGO_URI || '',
      GOOGLE_TEST_ACCOUNT_1_EMAIL: process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || '',
      GOOGLE_TEST_ACCOUNT_1_PASSWORD: process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '',
    },
    // More generous timeout for VS Code GUI usage
    timeout: 60_000,
    // Don't reuse existing server to ensure clean state
    reuseExistingServer: false,
  },
  fullyParallel: false,
};

export default config;
