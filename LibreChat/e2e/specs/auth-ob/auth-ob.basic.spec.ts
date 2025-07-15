import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_EMAILS,
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
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

  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test.afterEach(async () => {
    await cleanDatabase();
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
      const newUserEmail = `new-user-${Date.now()}@example.com`;
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

  test('Google OAuth with public domain email to onboarding', async ({ browser }) => {
    logProgress('🚀 Testing Google OAuth with public domain journey...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Check if OAuth credentials are available
      const { requireOAuthCredentials, startOAuthAuthentication } = await import('../../utils/authOnboardingUtils');
      
      try {
        requireOAuthCredentials('PUBLIC_DOMAIN', 'Google OAuth with public domain');
      } catch (error) {
        logProgress('⚠️ Skipping test due to missing OAuth credentials');
        return;
      }

      // Step 2: Complete OAuth authentication flow
      await startOAuthAuthentication(page, 'PUBLIC_DOMAIN');

      // Step 3: Verify successful authentication and redirect
      // Public domain emails MUST go to onboarding (no organization detection)
      logProgress('📍 Verifying authentication redirect...');

      // Must be redirected to onboarding for public domain users
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ Successfully redirected to onboarding flow');

      // Verify specific onboarding content for organization creation
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Onboarding organization step displayed correctly');

      logProgress('✅ Journey 2 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });

  test('OAuth cancellation flow', async ({ browser }) => {
    logProgress('🚀 Testing OAuth cancellation journey...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Test OAuth cancellation using abstracted utility
      const { cancelOAuthFlow } = await import('../../utils/authOnboardingUtils');
      await cancelOAuthFlow(page);

      // Step 2: Verify login still works after cancellation
      await page.getByRole('textbox', { name: 'Email address' }).fill(TEST_EMAILS.GENERIC_TEST);
      await page.getByTestId('login-button').click();
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

      logProgress('✅ OAuth cancellation and recovery verified');
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

      // Valid email should proceed
      await page.getByRole('textbox', { name: 'Email address' }).clear();
      await page.getByRole('textbox', { name: 'Email address' }).fill(TEST_EMAILS.GENERIC_TEST);
      await page.getByTestId('login-button').click();
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

      logProgress('✅ Email validation journey verified');
    } finally {
      await context.close();
    }
  });

  // TODO: Implement the following test scenarios one by one:
});
