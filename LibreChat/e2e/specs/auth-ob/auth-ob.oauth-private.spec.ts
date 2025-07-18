/**
 * @fileoverview OAuth Tests for PRIVATE_DOMAIN (gannon@astrolabs.llc)
 * @module e2e/specs/auth-ob/oauth-private
 *
 * All OAuth tests using PRIVATE_DOMAIN account consolidated in this file
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
  createTestOrganization,
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
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('OAuth PRIVATE_DOMAIN Tests', () => {
  test.beforeEach(async () => {
    await cleanDatabase();
    await cleanOAuthUsers();
    logProgress('🧹 Database and OAuth users cleaned for PRIVATE_DOMAIN test');
  });

  test('OAuth → Corporate Domain → Organization Creation', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain organization creation...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate organization creation');

      // Complete OAuth onboarding flow
      await completeOAuthOnboardingFlow(page, 'PRIVATE_DOMAIN', {
        orgName: 'OAuth Corporate Test Org',
        enableDomainJoin: true,
        skipTeam: true,
      });

      // Verify we reach chat
      await expect(page).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 15000 });
      logProgress('✅ OAuth corporate organization creation completed successfully');

      logProgress('🎉 OAuth corporate organization creation test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Organization Detection (No Existing Org)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain detection without existing organization...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate domain detection');

      // Complete OAuth authentication with corporate domain (astrolabs.llc)
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

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

      // Verify domain auto-join option is available for corporate domain
      await expect(page.getByText(/let anyone with an @astrolabs.llc email join/i)).toBeVisible();
      logProgress('✅ Domain auto-join option shown for OAuth corporate domain');

      logProgress('🎉 OAuth corporate domain detection test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Existing Organization Detection (Auto-Join Enabled)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain with existing organization (auto-join enabled)...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate domain with existing org');

      // Create test organization with auto-join enabled
      const testOrg = await createTestOrganization('Astrolabs OAuth Test Corp', 'astrolabs.llc', true);
      logProgress(`✅ Created test organization: ${testOrg.name} with auto-join enabled`);

      // Complete OAuth authentication with matching corporate domain
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Check if organization join preview is displayed
      // The join preview shows the organization card within the organization creation page
      await expect(page.getByRole('heading', { name: 'Astrolabs OAuth Test Corp' })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization found and displayed in join preview');

      // Verify auto-join indicator
      await expect(page.getByText(/Auto-join enabled/i)).toBeVisible();
      logProgress('✅ Auto-join enabled indicator shown');

      // Verify join button is available
      const joinButton = page.getByRole('button', { name: new RegExp(`Join ${testOrg.name}`, 'i') });
      await expect(joinButton).toBeVisible();
      logProgress('✅ Join organization button displayed');

      logProgress('🎉 OAuth corporate domain existing organization detection test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Existing Organization Detection (Auto-Join Disabled)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain with existing organization (auto-join disabled)...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate domain manual approval');

      // Create test organization with auto-join disabled
      const testOrg = await createTestOrganization('Astrolabs Manual OAuth Corp', 'astrolabs.llc', false);
      logProgress(`✅ Created test organization: ${testOrg.name} with auto-join disabled`);

      // Complete OAuth authentication with matching corporate domain
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Check if organization join preview is displayed
      // The join preview shows the organization card within the organization creation page
      await expect(page.getByRole('heading', { name: 'Astrolabs Manual OAuth Corp' })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization found and displayed in join preview');

      // Verify auto-join disabled indicator
      await expect(page.getByText(/Auto-join enabled/i)).not.toBeVisible();
      logProgress('✅ Auto-join disabled correctly detected');

      // Verify request to join button is available
      const requestJoinButton = page.getByRole('button', { name: 'Request to Join' });
      await expect(requestJoinButton).toBeVisible();
      logProgress('✅ Request to Join button displayed for manual approval');

      // Verify continue with personal workspace option
      const continuePersonalButton = page.getByText('Continue with personal workspace');
      await expect(continuePersonalButton).toBeVisible();
      logProgress('✅ Continue with personal workspace option available');

      logProgress('🎉 OAuth corporate domain manual approval detection test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Join Existing Organization (Single User)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth user joining pre-existing corporate organization...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth join existing organization');

      // Create organization via database (simulates existing org)
      const testOrg = await createTestOrganization(
        'Pre-existing OAuth Astrolabs Corp',
        'astrolabs.llc',
        true,
      );
      logProgress(`✅ Created pre-existing organization: ${testOrg.name} with auto-join enabled`);

      // OAuth user joins existing organization
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Should see organization join preview
      await expect(page.getByRole('heading', { name: testOrg.name })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Existing organization preview displayed');

      // Join the organization
      const joinButton = page.getByRole('button', {
        name: new RegExp(`Join ${testOrg.name}`, 'i'),
      });
      await expect(joinButton).toBeVisible();
      await joinButton.click();
      await page.waitForTimeout(3000);
      logProgress('✅ Joined existing organization');

      // Continue through onboarding
      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 10000,
      });

      // Profile should be pre-filled
      const nameInput = page.getByTestId('profile-name-input');
      const prefilledName = await nameInput.inputValue();
      expect(prefilledName).toBeTruthy();
      logProgress(`✅ OAuth profile pre-filled: "${prefilledName}"`);

      // Complete onboarding quickly
      await page.getByTestId('profile-continue-button').click();
      await page.getByRole('button', { name: 'Skip for Now' }).click();
      await page.getByRole('button', { name: /Start Your First Conversation/i }).click();
      await handleTermsOfService(page);

      await expect(page).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ Completed onboarding successfully');

      logProgress('🎉 OAuth join existing organization test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Manual Approval Flow', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain manual approval flow...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Check credentials before starting
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate manual approval request');

      // Create test organization with manual approval (no auto-join)
      const testOrg = await createTestOrganization('OAuth Manual Approval Corp', 'astrolabs.llc', false);
      logProgress(`✅ Created test organization: ${testOrg.name} with manual approval required`);

      // OAuth user tries to join existing organization
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Should see organization join preview with manual approval
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Check if organization join preview is displayed
      await expect(page.getByRole('heading', { name: 'OAuth Manual Approval Corp' })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization found and displayed in join preview');

      // Verify manual approval flow
      await expect(page.getByText(/Request to join/i)).toBeVisible();
      logProgress('✅ Manual approval flow correctly displayed');

      // Verify continue with personal workspace option
      await expect(page.getByText('Continue with personal workspace')).toBeVisible();
      logProgress('✅ Continue with personal workspace option available');

      logProgress('🎉 OAuth corporate domain manual approval flow test PASSED!');
    } finally {
      await context.close();
    }
  });

});