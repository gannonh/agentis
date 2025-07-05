import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Auth & Onboarding Tests', () => {
  // Test data for consistent use across tests
  const TEST_EMAILS = {
    GMAIL_PUBLIC: 'agentis.test@gmail.com',
    CORPORATE: 'gannon@astrolabs.llc',
    GENERIC_TEST: 'test@example.com',
    YAHOO_PUBLIC: 'test@yahoo.com',
    OUTLOOK_PUBLIC: 'test@outlook.com',
  };

  // Helper to capture magic link using MailHog
  async function captureMagicLink(email: string): Promise<string | null> {
    const { createMailHog } = await import('../utils/mailhog.js');
    const mailhog = createMailHog();

    try {
      logProgress(`📧 Waiting for magic link email to ${email}`);
      const magicLink = await mailhog.waitForMagicLink(email, 15000);

      if (magicLink) {
        logProgress(`✅ Found magic link: ${magicLink}`);
        return magicLink;
      } else {
        logProgress(`❌ No magic link found for ${email}`);
        return null;
      }
    } catch (error) {
      logProgress(`❌ Error getting magic link from MailHog: ${error}`);
      return null;
    }
  }

  // Helper to clean database between tests
  async function cleanDatabase() {
    const { getTestDatabase } = await import('../utils/testAuth');
    const { db } = await getTestDatabase();

    // Clean up test data in proper order (foreign keys matter)
    // 1. Delete sessions first
    await db.collection('session').deleteMany({
      $or: [
        { userId: { $regex: /test.*/ } },
        {}, // Clean all sessions for now since we're testing
      ],
    });

    // 2. Delete member records
    await db.collection('member').deleteMany({
      $or: [{ userId: { $regex: /test.*/ } }, { organizationId: { $regex: /test.*/ } }],
    });

    // 3. Delete account records (OAuth linkages)
    await db.collection('account').deleteMany({
      userId: { $regex: /test.*/ },
    });

    // 4. Delete organizations
    await db.collection('organization').deleteMany({
      $or: [{ name: { $regex: /Test.*/ } }, { slug: { $regex: /test.*/ } }],
    });

    // 5. Delete users last
    await db.collection('user').deleteMany({
      email: { $regex: /test.*@/ },
    });
  }

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

  test('Journey 1: New user magic link authentication to onboarding', async ({ browser }) => {
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
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
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

  test('Journey 2: Google OAuth with public domain email to onboarding', async ({ browser }) => {
    logProgress('🚀 Testing Google OAuth with public domain journey...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Navigate to login
      await page.goto('http://localhost:3080/login');

      // Step 2: Initiate Google OAuth
      await page.getByTestId('google').click();
      await page.waitForLoadState('networkidle');

      // Step 3: Verify we reach Google OAuth page
      expect(page.url()).toContain('accounts.google.com');
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      await expect(page.getByText('to continue to Agentis')).toBeVisible();
      logProgress('✅ Successfully redirected to Google OAuth');

      // Step 4: Complete OAuth with test credentials
      const { GOOGLE_CREDS } = await import('../utils/oAuth');

      if (!GOOGLE_CREDS.email || !GOOGLE_CREDS.password) {
        logProgress('⚠️ OAuth credentials not available - skipping authentication');
        return;
      }

      logProgress('🔐 Completing Google OAuth authentication...');

      // Fill email (with click first)
      await page.getByRole('textbox', { name: 'Email or phone' }).click();
      await page.getByRole('textbox', { name: 'Email or phone' }).fill(GOOGLE_CREDS.email);
      await page.getByRole('button', { name: 'Next' }).click();

      // Fill password (with click first)
      await page.getByRole('textbox', { name: 'Enter your password' }).click();
      await page.getByRole('textbox', { name: 'Enter your password' }).fill(GOOGLE_CREDS.password);
      await page.getByRole('button', { name: 'Next' }).click();

      // Step 5: Handle final Continue button
      logProgress('🔒 Handling OAuth consent...');
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForLoadState('networkidle');

      // Step 6: Verify successful authentication and redirect
      // Public domain emails MUST go to onboarding (no organization detection)
      logProgress('📍 Verifying authentication redirect...');

      // Must NOT be on Google OAuth page anymore
      await expect(page).not.toHaveURL(/.*accounts\.google\.com.*/, { timeout: 10000 });
      
      // Must be redirected to onboarding for public domain users
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 15000 });
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

  test('Journey 3: OAuth cancellation flow', async ({ browser }) => {
    logProgress('🚀 Testing OAuth cancellation journey...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Start OAuth flow
      await page.goto('http://localhost:3080/login');
      await page.getByTestId('google').click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('accounts.google.com');

      // Step 2: Cancel by going back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Step 3: Verify graceful return to login
      await expect(page).toHaveURL(/.*localhost:3080\/login.*/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
      await expect(page.getByTestId('google')).toBeVisible();

      // Step 4: Verify login still works after cancellation
      await page.getByRole('textbox', { name: 'Email address' }).fill(TEST_EMAILS.GENERIC_TEST);
      await page.getByTestId('login-button').click();
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

      logProgress('✅ OAuth cancellation and recovery verified');
    } finally {
      await context.close();
    }
  });

  test('Journey 4: Email validation prevents bad submissions', async ({ browser }) => {
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
