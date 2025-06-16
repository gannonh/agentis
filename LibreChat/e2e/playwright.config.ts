import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0, // Set to 0 for Google tests to avoid issues
  /* Enable multiple workers for parallel execution */
  // TODO: Optimize worker count based on system resources and test performance
  workers: process.env.CI ? 4 : 1, // 4 workers for CI, 1 for local development
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
  timeout: 5 * 60 * 1000, // 5 minutes
  /* Configure projects for major browsers */
  projects: [
    // Main test project with worker-scoped authentication
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],

        // channel: 'chrome', // Use Google Chrome instead of Chromium
        // Worker-scoped storage state will be handled by fixtures
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `node ${absolutePath}`,
    port: 3080,
    stdout: 'pipe',
    ignoreHTTPSErrors: true,
    // url: 'http://localhost:3080',
    timeout: 120_000, // Increased timeout for MCP initialization in CI
    reuseExistingServer: false, // Don't reuse to ensure clean state
    // SEE /Users/gannonhall/dev/agentis/LibreChat/e2e/fixtures/fixtures.ts
    env: {
      ...process.env,
      NODE_ENV: 'CI',
      EMAIL_HOST: '',
      SEARCH: 'false',
      SESSION_EXPIRY: '60000',
      ALLOW_REGISTRATION: 'true',
      REFRESH_TOKEN_EXPIRY: '300000',
      // Disable registration rate limiting for E2E tests
      REGISTER_WINDOW: '1', // 1 minute window
      REGISTER_MAX: '1000', // Allow 1000 registrations per window
      REGISTRATION_VIOLATION_SCORE: '0', // Don't score violations
      // Explicitly set critical variables to ensure they're passed to the server
      MONGO_URI: 'mongodb://admin:password@localhost:27017/Agentis?authSource=admin',
      GOOGLE_TEST_ACCOUNT_1_EMAIL: 'agentis.test@gmail.com',
      GOOGLE_TEST_ACCOUNT_1_PASSWORD: 'KJHkh97HKH87jjfU',
    },
  },
});
