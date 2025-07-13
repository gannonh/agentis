import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_EMAILS,
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
  createTestOrganization,
  TEST_PATTERNS,
  requireOAuthCredentials,
  startOAuthAuthentication,
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Organization Detection Tests - Issue #102', () => {



  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test.afterEach(async () => {
    await cleanDatabase();
  });

  /**
   * =================================================================================
   * ORGANIZATION DETECTION TESTS - ISSUE #102 SCOPE
   * =================================================================================
   * These tests focus on detection logic only - determining what UI to show.
   * Actual create/join actions are handled in issues #103/#104.
   * Invitation creation/management is handled in issue #106.
   */


  test('Corporate domain without existing organization shows create UI', async ({ browser }) => {
    logProgress('🚀 Testing corporate domain detection without existing organization...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Use corporate domain with no existing organization
      const corporateEmail = `test-${Date.now()}@newcompany.com`;
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(corporateEmail);
      await page.getByTestId('login-button').click();

      // Step 2: Follow magic link
      const magicLinkUrl = await captureMagicLink(corporateEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Step 3: Verify we reach onboarding (MUST happen)
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      logProgress('✅ Successfully redirected to onboarding');

      // Step 4: Verify organization creation UI is shown
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify domain auto-join option is available for corporate domain
      await expect(page.getByText(/let anyone with an @newcompany.com email join/i)).toBeVisible();
      logProgress('✅ Domain auto-join option shown for corporate domain');

      logProgress('✅ Journey 8 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });

  test('Public domain detection accuracy', async ({ browser }) => {
    logProgress('🚀 Testing public domain detection accuracy...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Test with Gmail (should be detected as public)
      const gmailEmail = `test-${Date.now()}@gmail.com`;
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(gmailEmail);
      await page.getByTestId('login-button').click();

      // Step 2: Follow magic link
      const magicLinkUrl = await captureMagicLink(gmailEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Step 3: Verify we reach onboarding (MUST happen)
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      logProgress('✅ Successfully redirected to onboarding');

      // Step 4: Verify organization creation form is shown for public domain
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify NO domain join option for public domains
      await expect(page.getByText(/let anyone with an @gmail.com email join/i)).not.toBeVisible();
      logProgress('✅ Public domain correctly detected - no domain join option shown');

      logProgress('✅ Journey 13 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * OAUTH CORPORATE DOMAIN DETECTION TESTS
   * =================================================================================
   * Tests OAuth authentication with corporate domains (PRIVATE_DOMAIN).
   * Extends Issue #102 scope to include OAuth flows.
   */

  test('OAuth → Corporate Domain → Organization Detection (No Existing Org)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain detection without existing organization...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Verify OAuth credentials are available (will fail test if missing)
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate domain detection');

      // Step 2: Complete OAuth authentication with corporate domain (astrolabs.llc)
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Step 3: Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Step 4: Verify organization creation UI is shown
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify domain auto-join option is available for corporate domain
      await expect(page.getByText(/let anyone with an @astrolabs.llc email join/i)).toBeVisible();
      logProgress('✅ Domain auto-join option shown for OAuth corporate domain');

      logProgress('✅ OAuth corporate domain detection test completed');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Existing Organization Detection (Auto-Join Enabled)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain with existing organization (auto-join enabled)...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Verify OAuth credentials are available (will fail test if missing)
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate domain with existing org');

      // Step 2: Create test organization with auto-join enabled
      const testOrg = await createTestOrganization('Astrolabs Test Corp', 'astrolabs.llc', true);
      logProgress(`✅ Created test organization: ${testOrg.name} with auto-join enabled`);

      // Step 3: Complete OAuth authentication with matching corporate domain
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Step 4: Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Step 5: Should show organization join preview (not creation form)
      await expect(page.getByRole('heading', { name: testOrg.name })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Existing organization preview displayed');

      // Step 6: Verify auto-join indicator
      await expect(page.getByText(/Auto-join enabled/i)).toBeVisible();
      logProgress('✅ Auto-join enabled indicator shown');

      // Step 7: Verify join button is available
      const joinButton = page.getByRole('button', { name: new RegExp(`Join ${testOrg.name}`, 'i') });
      await expect(joinButton).toBeVisible();
      logProgress('✅ Join organization button displayed');

      logProgress('✅ OAuth corporate domain existing organization detection test completed');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Existing Organization Detection (Auto-Join Disabled)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain with existing organization (auto-join disabled)...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Verify OAuth credentials are available (will fail test if missing)
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate domain manual approval');

      // Step 2: Create test organization with auto-join disabled
      const testOrg = await createTestOrganization('Astrolabs Manual Corp', 'astrolabs.llc', false);
      logProgress(`✅ Created test organization: ${testOrg.name} with auto-join disabled`);

      // Step 3: Complete OAuth authentication with matching corporate domain
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Step 4: Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Step 5: Should show organization join preview (not creation form)
      await expect(page.getByRole('heading', { name: testOrg.name })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Existing organization preview displayed');

      // Step 6: Verify auto-join disabled indicator
      await expect(page.getByText(/Auto-join enabled/i)).not.toBeVisible();
      logProgress('✅ Auto-join disabled correctly detected');

      // Step 7: Verify request to join button is available
      const requestJoinButton = page.getByRole('button', { name: 'Request to Join' });
      await expect(requestJoinButton).toBeVisible();
      logProgress('✅ Request to Join button displayed for manual approval');

      // Step 8: Verify continue with personal workspace option
      const continuePersonalButton = page.getByText('Continue with personal workspace');
      await expect(continuePersonalButton).toBeVisible();
      logProgress('✅ Continue with personal workspace option available');

      logProgress('✅ OAuth corporate domain manual approval detection test completed');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Public Domain → No Organization Join Options', async ({ browser }) => {
    logProgress('🚀 Testing OAuth public domain detection (no organization join)...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Verify OAuth credentials are available (will fail test if missing)
      requireOAuthCredentials('PUBLIC_DOMAIN', 'OAuth public domain detection');

      // Step 2: Complete OAuth authentication with public domain (gmail.com)
      await startOAuthAuthentication(page, 'PUBLIC_DOMAIN');

      // Step 3: Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Step 4: Verify organization creation UI is shown
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify NO domain join option for public domains
      await expect(page.getByText(/let anyone with an @gmail.com email join/i)).not.toBeVisible();
      logProgress('✅ Public domain correctly detected - no domain join option shown');

      // Step 7: Verify no organization join preview is shown
      await expect(page.getByText(/Auto-join enabled/i)).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Request to Join' })).not.toBeVisible();
      logProgress('✅ No organization join options shown for public domain');

      logProgress('✅ OAuth public domain detection test completed');
    } finally {
      await context.close();
    }
  });
});
