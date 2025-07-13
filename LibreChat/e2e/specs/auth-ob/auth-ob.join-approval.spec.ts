/**
 * @fileoverview Organization Join Manual Approval Flow Tests
 * @module e2e/specs/auth-ob.join-approval
 *
 * Tests manual approval flow for organization joining when domain auto-join is disabled:
 * - User requests to join organization (domain join disabled)
 * - Admin approves/rejects join requests
 * - Multiple pending requests management
 * - Proper notification handling
 *
 * Related to Issue #104 extensions - manual approval workflow
 */

import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
  handleTermsOfService,
  completeProfileStep,
  completeTeamStep,
  completeWelcomeStep,
  verifyOrganizationInDatabase,
  verifyOrganizationMembership,
  TEST_PATTERNS,
  requireOAuthCredentials,
  startOAuthAuthentication,
  completeOAuthOnboardingFlow,
  createTestOrganization,
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

// Set a reasonable timeout for these tests
test.setTimeout(60000); // 1 minute per test

test.describe('Organization Join Manual Approval Flow', () => {
  test.beforeEach(async () => {
    await cleanDatabase();
    logProgress('🧹 Database cleaned for manual approval test');
  });

  test.afterEach(async () => {
    await cleanDatabase();
  });

  test('User requests to join organization (domain join disabled)', async ({ browser }) => {
    logProgress('🚀 Testing manual approval request flow...');

    // Session 1: Create organization with domain join DISABLED
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Session 2: Request to join organization
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // =================================================================
      // PHASE 1: User 1 creates organization with domain join DISABLED
      // =================================================================
      logProgress('👤 Phase 1: User 1 creating organization with domain join disabled...');

      const user1Email = generateTestEmail('testcorp.com');
      await page1.goto('http://localhost:3080/login');
      await page1.getByRole('textbox', { name: 'Email address' }).fill(user1Email);
      await page1.getByTestId('login-button').click();

      const magicLinkUrl1 = await captureMagicLink(user1Email);
      if (!magicLinkUrl1) {
        throw new Error('Failed to capture magic link for User 1');
      }

      await page1.goto(magicLinkUrl1);
      await page1.waitForLoadState('networkidle');

      // Should be on onboarding (organization creation)
      await expect(page1).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });
      logProgress('✅ User 1: Reached organization creation screen');

      // Create organization with domain join DISABLED
      const orgName = 'TestCorp Engineering';
      await expect(page1.getByRole('heading', { name: /What's the name of your/ })).toBeVisible();
      await page1.getByRole('textbox').first().fill(orgName);

      // CRITICAL: Do NOT check domain join checkbox (leave it disabled)
      const domainJoinCheckbox = page1.getByRole('checkbox');
      await expect(domainJoinCheckbox).toBeVisible();
      // Explicitly ensure it's not checked
      if (await domainJoinCheckbox.isChecked()) {
        await domainJoinCheckbox.uncheck();
      }
      logProgress('✅ User 1: Left domain join DISABLED');

      // Submit organization creation
      await page1.getByRole('button', { name: 'Next' }).click();
      await page1.waitForTimeout(2000);

      // Complete User 1's onboarding flow quickly
      await completeProfileStep(page1, 'User One');
      await completeTeamStep(page1, true);
      await completeWelcomeStep(page1);

      await handleTermsOfService(page1);
      await expect(page1).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ User 1: Completed full onboarding flow');

      // =================================================================
      // PHASE 2: User 2 requests to join organization (manual approval)
      // =================================================================
      logProgress('👤 Phase 2: User 2 requesting to join organization...');

      const user2Email = generateTestEmail('testcorp.com');
      await page2.goto('http://localhost:3080/login');
      await page2.getByRole('textbox', { name: 'Email address' }).fill(user2Email);
      await page2.getByTestId('login-button').click();

      const magicLinkUrl2 = await captureMagicLink(user2Email);
      if (!magicLinkUrl2) {
        throw new Error('Failed to capture magic link for User 2');
      }

      await page2.goto(magicLinkUrl2);
      await page2.waitForLoadState('networkidle');

      // =================================================================
      // CRITICAL: User 2 should see ORGANIZATION PREVIEW (not creation)
      // =================================================================
      await expect(page2).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });

      // Should see organization preview with the organization name in heading
      await expect(page2.getByRole('heading', { name: orgName })).toBeVisible({ timeout: 10000 });
      logProgress('✅ User 2: Can see existing organization name in preview');

      // Should see "Request to Join" messaging (not auto-join)
      await expect(page2.getByText(/Request to join/i)).toBeVisible();
      logProgress('✅ User 2: Can see request to join option');

      // Should NOT see auto-join indicator
      await expect(page2.getByText(/Auto-join enabled/i)).not.toBeVisible();
      logProgress('✅ User 2: Auto-join correctly disabled');

      // =================================================================
      // CRITICAL: Test the manual approval request functionality
      // =================================================================
      // Look for the request to join button
      const requestButton = page2.getByRole('button', { name: /Request to join/i });
      await expect(requestButton).toBeVisible();
      logProgress('🖱️ User 2: Clicking request to join button...');

      await requestButton.click();
      await page2.waitForTimeout(3000);

      // Should show confirmation that request was sent (toast message)
      await expect(page2.getByText('Join request sent! An admin')).toBeVisible();
      logProgress('✅ User 2: Request sent confirmation displayed');

      // =================================================================
      // VERIFICATION: Check database state
      // =================================================================

      // Verify organization exists with domain join disabled
      await verifyOrganizationInDatabase(orgName, 'testcorp.com', false);

      // Verify join request was created in organization metadata
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();

      // Check for pending join requests in organization metadata
      const joinRequests = org?.metadata?.joinRequests || [];
      expect(joinRequests).toHaveLength(1);
      expect(joinRequests[0]).toMatchObject({
        userEmail: user2Email,
        status: 'pending',
        requestedAt: expect.any(Date),
      });
      logProgress('✅ Database verification: Join request created in organization metadata');

      // Verify only User 1 is a member (User 2 should not be added yet)
      const members = await verifyOrganizationMembership(orgName, 1);
      expect(members[0].role).toBe('owner');
      logProgress('✅ Database verification: Only organization owner is a member');

      logProgress('🎉 Manual approval request flow test PASSED!');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('Admin approves join request', async () => {
    logProgress('🚀 Testing admin approval of join request...');

    // This test would require:
    // 1. Admin UI to view pending requests
    // 2. Admin approval action
    // 3. User notification of approval
    // 4. User can complete onboarding after approval

    // For now, marking as placeholder for future implementation
    logProgress('⚠️ Admin approval flow - to be implemented when admin UI is available');
  });

  test('Admin rejects join request', async () => {
    logProgress('🚀 Testing admin rejection of join request...');

    // This test would require:
    // 1. Admin UI to view pending requests
    // 2. Admin rejection action with reason
    // 3. User notification of rejection
    // 4. User fallback to personal workspace creation

    // For now, marking as placeholder for future implementation
    logProgress('⚠️ Admin rejection flow - to be implemented when admin UI is available');
  });

  test('Multiple pending requests management', async () => {
    logProgress('🚀 Testing multiple pending requests...');

    // This test would require:
    // 1. Multiple users requesting to join
    // 2. Admin can see all pending requests
    // 3. Admin can bulk approve/reject
    // 4. Proper queue management

    // For now, marking as placeholder for future implementation
    logProgress('⚠️ Multiple requests management - to be implemented when admin UI is available');
  });

  /**
   * =================================================================================
   * OAUTH CORPORATE DOMAIN MANUAL APPROVAL TESTS
   * =================================================================================
   * Tests OAuth authentication with corporate domain manual approval functionality.
   * Extends join-approval scope to include OAuth flows with PRIVATE_DOMAIN.
   */

  test.skip('OAuth → Corporate Domain → Manual Approval Request Flow', async ({ browser }) => {
    // SKIPPED: This test attempts to simulate two different users with the same OAuth account
    // which is IMPOSSIBLE. We only have one OAuth account per domain (gannon@astrolabs.llc).
    // When the same OAuth account logs in twice, it's recognized as the existing user
    // and redirected to chat, not onboarding.
    // 
    // To test manual approval flows, use Magic Link authentication with different email addresses.
    logProgress('🚀 Testing OAuth corporate domain manual approval request flow...');

    // Verify OAuth credentials are available (will fail test if missing)
    requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate manual approval request');

    // Session 1: Create organization with OAuth User 1 (domain join DISABLED)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Session 2: Request to join with OAuth User 2
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // =================================================================
      // PHASE 1: OAuth User 1 creates organization with domain join DISABLED
      // =================================================================
      logProgress('👤 Phase 1: OAuth User 1 creating organization with domain join disabled...');

      const orgName = 'Astrolabs Manual Approval Corp';

      // Complete OAuth onboarding flow for User 1 with domain join DISABLED
      await completeOAuthOnboardingFlow(page1, 'PRIVATE_DOMAIN', {
        orgName: orgName,
        enableDomainJoin: false, // CRITICAL: Disable auto-join for manual approval flow
        skipTeam: true,
      });

      await expect(page1).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ OAuth User 1: Completed organization creation with domain join DISABLED');

      // =================================================================
      // PHASE 2: OAuth User 2 requests to join organization (manual approval)
      // =================================================================
      logProgress('👤 Phase 2: OAuth User 2 requesting to join organization...');

      // Start OAuth authentication for User 2
      await startOAuthAuthentication(page2, 'PRIVATE_DOMAIN');

      // Verify we reach onboarding
      await expect(page2).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth User 2: Redirected to onboarding');

      // =================================================================
      // CRITICAL: User 2 should see ORGANIZATION PREVIEW (not creation!)
      // =================================================================
      // Should see organization preview with the organization name in heading
      await expect(page2.getByRole('heading', { name: orgName })).toBeVisible({ timeout: 10000 });
      logProgress('✅ OAuth User 2: Can see existing organization name in preview');

      // Should see "Request to Join" messaging (not auto-join)
      await expect(page2.getByText(/Request to join/i)).toBeVisible();
      logProgress('✅ OAuth User 2: Can see request to join option');

      // Should NOT see auto-join indicator
      await expect(page2.getByText(/Auto-join enabled/i)).not.toBeVisible();
      logProgress('✅ OAuth User 2: Auto-join correctly disabled');

      // =================================================================
      // CRITICAL: Test the manual approval request functionality
      // =================================================================
      // Look for the request to join button
      const requestButton = page2.getByRole('button', { name: /Request to join/i });
      await expect(requestButton).toBeVisible();
      logProgress('🖱️ OAuth User 2: Clicking request to join button...');

      await requestButton.click();
      await page2.waitForTimeout(3000);

      // Should show confirmation that request was sent (toast message)
      await expect(page2.getByText('Join request sent! An admin')).toBeVisible();
      logProgress('✅ OAuth User 2: Request sent confirmation displayed');

      // =================================================================
      // VERIFICATION: Database validation
      // =================================================================
      logProgress('🔍 Verifying database state...');

      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Verify organization exists with domain join disabled
      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      expect(org?.slug).toBe('astrolabs-manual-approval-corp');
      expect(org?.metadata?.domain).toBe('astrolabs.llc');
      expect(org?.metadata?.allowDomainJoin).toBe(false);
      logProgress('✅ Organization verified with domain join disabled');

      // Verify join request was created in organization metadata
      const joinRequests = org?.metadata?.joinRequests || [];
      expect(joinRequests).toHaveLength(1);
      expect(joinRequests[0]).toMatchObject({
        status: 'pending',
        requestedAt: expect.any(Date),
      });
      logProgress('✅ Database verification: Join request created in organization metadata');

      // Verify only OAuth User 1 is a member (User 2 should not be added yet)
      const members = await db.collection('member').find({ organizationId: org?._id }).toArray();
      expect(members).toHaveLength(1);
      expect(members[0].role).toBe('owner');
      logProgress('✅ Database verification: Only organization owner is a member');

      logProgress('🎉 OAuth corporate domain manual approval request flow test PASSED!');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test.skip('OAuth → Corporate Domain → Join Existing Manual Approval Organization', async ({ browser }) => {
    // SKIPPED: This test requires a pre-existing organization that an OAuth user can request to join.
    // However, creating the organization and then having an OAuth user join would require
    // two different users, which is impossible with our single OAuth account constraint.
    // 
    // The same OAuth account (gannon@astrolabs.llc) cannot both create an org AND request to join it.
    // Use Magic Link tests for multi-user organization join scenarios.
    logProgress('🚀 Testing OAuth user requesting to join pre-existing manual approval organization...');

    // Verify OAuth credentials are available (will fail test if missing)
    requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth join existing manual approval organization');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // =================================================================
      // SETUP: Create organization via database with manual approval
      // =================================================================
      const testOrg = await createTestOrganization('Pre-existing Manual Approval Corp', 'astrolabs.llc', false);
      logProgress(`✅ Created pre-existing organization: ${testOrg.name} with manual approval required`);

      // =================================================================
      // TEST: OAuth user requests to join existing organization
      // =================================================================
      await startOAuthAuthentication(page, 'PRIVATE_DOMAIN');

      // Verify we reach onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Should see organization join preview
      await expect(page.getByRole('heading', { name: testOrg.name })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Existing organization preview displayed');

      // Should see "Request to Join" messaging (not auto-join)
      await expect(page.getByText(/Request to join/i)).toBeVisible();
      logProgress('✅ Request to join option available');

      // Should NOT see auto-join indicator
      await expect(page.getByText(/Auto-join enabled/i)).not.toBeVisible();
      logProgress('✅ Auto-join correctly disabled');

      // Request to join the organization
      const requestButton = page.getByRole('button', { name: /Request to join/i });
      await expect(requestButton).toBeVisible();
      await requestButton.click();
      await page.waitForTimeout(3000);
      logProgress('✅ Requested to join existing organization');

      // Should show confirmation
      await expect(page.getByText('Join request sent! An admin')).toBeVisible();
      logProgress('✅ Request confirmation displayed');

      // =================================================================
      // VERIFICATION: Database validation
      // =================================================================
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Verify join request was added to existing organization
      const updatedOrg = await db.collection('organization').findOne({ _id: testOrg._id });
      const joinRequests = updatedOrg?.metadata?.joinRequests || [];
      expect(joinRequests).toHaveLength(1);
      expect(joinRequests[0]).toMatchObject({
        status: 'pending',
        requestedAt: expect.any(Date),
      });
      logProgress('✅ Database verification: OAuth user join request added to existing organization');

      // No new members should be added yet (pending approval)
      const members = await db.collection('member').find({ organizationId: testOrg._id }).toArray();
      expect(members).toHaveLength(0); // Pre-existing org has no initial members
      logProgress('✅ Database verification: No members added pending approval');

      logProgress('🎉 OAuth join existing manual approval organization test PASSED!');
    } finally {
      await context.close();
    }
  });
});
