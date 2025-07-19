import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_EMAILS,
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  cleanTestData,
  generateTestEmail,
  generateTestId,
  createTestContext,
  TEST_PATTERNS,
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Basic Auth & Onboarding Tests', () => {
  // Test data imported from authOnboardingUtils

  // Magic link capture helper imported from authOnboardingUtils

  // Database cleanup helper imported from authOnboardingUtils

  // Store test IDs for cleanup
  const testIds: string[] = [];

  test.beforeEach(async () => {
    // Clean any leftover data from previous runs
    await cleanDatabase();
  });

  test.afterEach(async () => {
    // Clean up test-specific data
    for (const testId of testIds) {
      await cleanTestData(testId).catch((err) =>
        logProgress(`⚠️ Cleanup failed for testId ${testId}: ${err.message}`),
      );
    }
    testIds.length = 0; // Clear the array
  });

  /**
   * =================================================================================
   * CORE AUTHENTICATION FLOWS
   * =================================================================================
   */

  // =================================================================================
  // STRATEGIC USER JOURNEY TESTS
  // =================================================================================
  // These tests follow complete user flows from start to finish, building on each other

  test('New user magic link authentication to onboarding', async ({ browser }) => {
    logProgress('🚀 Testing complete new user magic link journey...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Verify login page design
      await page.goto('http://localhost:3080/login');
      await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
      await expect(page.getByText('Sign in or register')).toBeVisible();
      await expect(page.getByTestId('login-button')).toBeVisible();

      // Step 2: Request magic link with new user email
      const testContext = createTestContext({ emailPrefix: 'new-user' });
      testIds.push(testContext.testId);
      const newUserEmail = testContext.emails.primary;

      await page.getByRole('textbox', { name: 'Email address' }).fill(newUserEmail);
      await page.getByTestId('login-button').click();

      // Step 3: Verify magic link confirmation screen
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
      await expect(page.getByText(newUserEmail)).toBeVisible();

      // Step 4: Test resend functionality
      await page.getByRole('button', { name: 'Resend link' }).click();
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

      // Step 5: Capture and follow magic link
      logProgress('📧 Capturing magic link from MailHog...');
      const magicLinkUrl = await captureMagicLink(newUserEmail);

      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link from MailHog');
      }

      logProgress(`🔗 Found magic link: ${magicLinkUrl}`);

      // Step 6: Navigate to magic link URL
      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Step 7: NEW USERS MUST be redirected to onboarding - no exceptions
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });
      logProgress('✅ Successfully redirected to onboarding flow');

      // Step 8: Verify specific onboarding organization step content
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Onboarding organization step displayed correctly');

      logProgress('✅ Journey 1 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });



  test('Email validation prevents bad submissions', async ({ browser }) => {
    logProgress('🚀 Testing email validation journey...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/login');

      // Test multiple invalid formats in sequence
      const invalidEmails = ['invalid', 'no@', '@domain.com', 'spaces @email.com'];

      for (const email of invalidEmails) {
        await page.getByRole('textbox', { name: 'Email address' }).clear();
        await page.getByRole('textbox', { name: 'Email address' }).fill(email);
        await page.getByTestId('login-button').click();
        await page.waitForTimeout(500);

        // Should stay on login page
        await expect(page).toHaveURL(/.*localhost:3080\/login.*/, { timeout: 5000 });
        await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
      }

      // Valid email should proceed - use a unique test email
      const testContext = createTestContext({ emailPrefix: 'validation-test' });
      testIds.push(testContext.testId);

      await page.getByRole('textbox', { name: 'Email address' }).clear();
      await page.getByRole('textbox', { name: 'Email address' }).fill(testContext.emails.primary);
      await page.getByTestId('login-button').click({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

      logProgress('✅ Email validation journey verified');
    } finally {
      await context.close();
    }
  });

  // TODO: Implement the following test scenarios one by one:
});
