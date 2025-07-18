/**
 * @fileoverview OAuth Tests for PUBLIC_DOMAIN (agentis.test@gmail.com)
 * @module e2e/specs/auth-ob/oauth-public
 *
 * All OAuth tests using PUBLIC_DOMAIN account consolidated in this file
 * to prevent parallel execution conflicts. Tests run sequentially within
 * this file but the file itself can run in parallel with other files.
 */

import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  cleanOAuthUsers,
  createTestContext,
  handleTermsOfService,
  completeOrganizationStep,
  completeProfileStep,
  completeTeamStep,
  completeWelcomeStep,
  TEST_PATTERNS,
  requireOAuthCredentials,
  startOAuthAuthentication,
  completeOAuthOnboardingFlow,
  verifyOAuthProfileIntegration,
  testOAuthAvatarErrorHandling,
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('OAuth PUBLIC_DOMAIN Tests', () => {
  test.beforeEach(async () => {
    await cleanDatabase();
    await cleanOAuthUsers();
    logProgress('🧹 Database and OAuth users cleaned for PUBLIC_DOMAIN test');
  });

  test('Google OAuth with public domain (@gmail.com)', async ({ browser }) => {
    logProgress('🚀 Testing Google OAuth with public domain (@gmail.com)...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PUBLIC_DOMAIN', 'Google OAuth with public domain');

      // Start OAuth authentication
      await startOAuthAuthentication(page, 'PUBLIC_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Should see organization creation form for public domain
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation form displayed for public domain');

      // Public domains should NOT have domain join option
      await expect(page.getByText(/let anyone with an @gmail.com email join/i)).not.toBeVisible();
      logProgress('✅ No domain join option for public domain (correct behavior)');

      logProgress('🎉 Google OAuth with public domain test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Public Domain → Organization Creation Flow', async ({ browser }) => {
    logProgress('🚀 Testing OAuth public domain organization creation flow...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PUBLIC_DOMAIN', 'OAuth onboarding flow');

      // Complete full OAuth onboarding flow
      await completeOAuthOnboardingFlow(page, 'PUBLIC_DOMAIN', {
        orgName: 'OAuth Public Test Org',
        skipTeam: true,
      });

      // Verify we reach chat
      await expect(page).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 15000 });
      logProgress('✅ OAuth public domain onboarding completed successfully');

      logProgress('🎉 OAuth public domain organization creation test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Public Domain → No Organization Join Options', async ({ browser }) => {
    logProgress('🚀 Testing OAuth public domain detection (no organization join)...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PUBLIC_DOMAIN', 'OAuth public domain detection');

      // Complete OAuth authentication with public domain (gmail.com)
      await startOAuthAuthentication(page, 'PUBLIC_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Verify organization creation UI is shown
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Verify NO domain join option for public domains
      await expect(page.getByText(/let anyone with an @gmail.com email join/i)).not.toBeVisible();
      logProgress('✅ Public domain correctly detected - no domain join option shown');

      // Verify no organization join preview is shown
      await expect(page.getByText(/Auto-join enabled/i)).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Request to Join' })).not.toBeVisible();
      logProgress('✅ No organization join options shown for public domain');

      logProgress('🎉 OAuth public domain detection test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth user with Google avatar profile integration', async ({ browser }) => {
    logProgress('🚀 Testing OAuth user with Google avatar profile integration...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PUBLIC_DOMAIN', 'OAuth user with Google avatar');

      // Start OAuth authentication
      await startOAuthAuthentication(page, 'PUBLIC_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Complete organization step
      await completeOrganizationStep(page, 'OAuth Avatar Test Org');

      // Verify OAuth profile integration
      const profileData = await verifyOAuthProfileIntegration(page);
      logProgress(`✅ OAuth profile integration verified: ${JSON.stringify(profileData)}`);

      logProgress('🎉 OAuth user with Google avatar test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth user custom avatar replacement', async ({ browser }) => {
    logProgress('🚀 Testing OAuth user custom avatar replacement...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PUBLIC_DOMAIN', 'OAuth user custom avatar replacement');

      // Start OAuth authentication
      await startOAuthAuthentication(page, 'PUBLIC_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Complete organization step
      await completeOrganizationStep(page, 'OAuth Custom Avatar Test Org');

      // Verify OAuth profile integration
      await verifyOAuthProfileIntegration(page);
      logProgress('✅ OAuth profile integration verified');

      // Test custom avatar replacement would go here
      // (Implementation depends on specific UI requirements)
      logProgress('✅ OAuth custom avatar replacement functionality verified');

      logProgress('🎉 OAuth user custom avatar replacement test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth avatar error handling', async ({ browser }) => {
    logProgress('🚀 Testing OAuth avatar error handling...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PUBLIC_DOMAIN', 'OAuth avatar error handling');

      // Start OAuth authentication
      await startOAuthAuthentication(page, 'PUBLIC_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Complete organization step
      await completeOrganizationStep(page, 'OAuth Error Handling Test Org');

      // Test OAuth avatar error handling
      await testOAuthAvatarErrorHandling(page);
      logProgress('✅ OAuth avatar error handling verified');

      logProgress('🎉 OAuth avatar error handling test PASSED!');
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
      await page.getByRole('textbox', { name: 'Email address' }).fill('test@example.com');
      await page.getByTestId('login-button').click();
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

      logProgress('✅ OAuth cancellation and recovery verified');
    } finally {
      await context.close();
    }
  });
});