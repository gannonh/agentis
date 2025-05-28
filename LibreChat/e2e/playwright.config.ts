import { defineConfig, devices } from '@playwright/test';
import path from 'path';
const absolutePath = path.resolve(__dirname, '../api/server/index.js');
import dotenv from 'dotenv';

// Load environment variables from .env file - try multiple possible paths
const envPaths = [
  path.resolve(__dirname, '../.env'), // From e2e/ -> LibreChat/.env
  path.resolve(process.cwd(), '.env'), // From current working directory
  path.resolve(process.cwd(), 'LibreChat/.env'), // From parent directory
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
const requiredVars = ['MONGO_URI'];
const googleVars = ['GOOGLE_TEST_ACCOUNT_1_EMAIL', 'GOOGLE_TEST_ACCOUNT_1_PASSWORD'];
const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log(
    'Available MONGO vars:',
    Object.keys(process.env).filter((key) => key.includes('MONGO')),
  );
} else {
  console.log('✅ All required environment variables are present');
}

// Check for Google test credentials
const missingGoogleVars = googleVars.filter((varName) => !process.env[varName]);
if (missingGoogleVars.length > 0) {
  console.log('⚠️ Google test credentials not found:', missingGoogleVars);
  console.log('Google-specific tests may not work without these credentials');
} else {
  console.log('✅ Google test credentials are present');
}

export default defineConfig({
  testDir: 'specs/',
  outputDir: 'specs/.test-results',
  /* Run tests in files in parallel.
  NOTE: This sometimes causes issues on Windows.
  Set to false if you experience issues running on a Windows machine. */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0, // Set to 0 for Google tests to avoid issues
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: 'http://localhost:3080',
    video: 'on-first-retry',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    headless: true,
    screenshot: 'only-on-failure',
  },
  expect: {
    timeout: 10000,
  },
  timeout: 5 * 60 * 1000, // 5 minutes for Google tests
  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
      use: {
        // Don't use storage state for setup - it doesn't exist yet
        storageState: undefined,
      },
    },
    // Teardown project for cleanup
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
      use: {
        // Don't need storage state for cleanup
        storageState: undefined,
      },
    },
    // Main test project
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use the storage state created by the setup project
        storageState: path.resolve(__dirname, 'storageState.json'),
      },
      dependencies: ['setup'],
    },
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    //   dependencies: ['setup'],
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `node ${absolutePath}`,
    port: 3080,
    stdout: 'pipe',
    ignoreHTTPSErrors: true,
    // url: 'http://localhost:3080',
    timeout: 60_000, // More generous timeout for Google tests
    reuseExistingServer: false, // Don't reuse to ensure clean state
    env: {
      ...process.env,
      NODE_ENV: 'CI',
      EMAIL_HOST: '',
      SEARCH: 'false',
      SESSION_EXPIRY: '60000',
      ALLOW_REGISTRATION: 'true',
      REFRESH_TOKEN_EXPIRY: '300000',
      // Explicitly set critical variables to ensure they're passed to the server
      MONGO_URI: process.env.MONGO_URI || '',
      GOOGLE_TEST_ACCOUNT_1_EMAIL: process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || '',
      GOOGLE_TEST_ACCOUNT_1_PASSWORD: process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '',
    },
  },
});
