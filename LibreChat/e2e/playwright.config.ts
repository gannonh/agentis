import { defineConfig, devices } from '@playwright/test';
import path from 'path';
const absolutePath = path.resolve(__dirname, '../api/server/index.js');
import dotenv from 'dotenv';

// Simple env loading - try the most common path first
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
      MONGO_URI: 'mongodb://admin:password@localhost:27017/Agentis?authSource=admin',
      GOOGLE_TEST_ACCOUNT_1_EMAIL: 'agentis.test@gmail.com',
      GOOGLE_TEST_ACCOUNT_1_PASSWORD: 'KJHkh97HKH87jjfU',
    },
  },
});
