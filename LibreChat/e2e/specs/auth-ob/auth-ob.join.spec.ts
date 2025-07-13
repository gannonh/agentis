/**
 * @fileoverview E2E tests for Issue #104 - Organization Join Flow
 * Tests the organization join functionality when users with matching email domains
 * attempt to join existing organizations.
 */

import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
  handleTermsOfService,
  completeFullOnboarding,
  verifyOrganizationJoinPreview,
  joinOrganization,
  verifyOrganizationInDatabase,
  verifyOrganizationMembership,
  TEST_PATTERNS,
  requireOAuthCredentials,
  startOAuthAuthentication,
  completeOAuthOnboardingFlow,
  createTestOrganization,
} from '../../utils/authOnboardingUtils';

// Use the same test configuration as other tests
test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

test.describe('Organization Join Flow - Issue #104', () => {
  // Helper to handle Terms of Service modal if it appears

  test.beforeEach(async () => {
    await cleanDatabase();
    logProgress('🧹 Database cleaned for Issue #104 test');
  });

  test('Complete organization join flow with domain auto-join', async ({ browser }) => {
    logProgress('🚀 Testing Issue #104 organization join flow with two users...');

    // Session 1: Create organization with domain join enabled
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Session 2: Join existing organization
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // =================================================================
      // PHASE 1: User 1 creates organization with domain join enabled
      // =================================================================
      logProgress('👤 Phase 1: User 1 creating organization with domain join...');

      const user1Email = `user1-${Date.now()}@testcorp.com`;
      await page1.goto('http://localhost:3080/login');
      await page1.getByRole('textbox', { name: 'Email address' }).fill(user1Email);
      await page1.getByTestId('login-button').click();

      // Follow magic link for User 1
      const magicLinkUrl1 = await captureMagicLink(user1Email);
      if (!magicLinkUrl1) {
        throw new Error('Failed to capture magic link for User 1');
      }

      await page1.goto(magicLinkUrl1);
      await page1.waitForLoadState('networkidle');

      // Should be on onboarding (organization creation)
      await expect(page1).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });
      logProgress('✅ User 1: Reached organization creation screen');

      // Create organization with domain join enabled
      const orgName = 'TestCorp Engineering';
      await expect(page1.getByRole('heading', { name: /What's the name of your/ })).toBeVisible();
      await page1.getByRole('textbox').first().fill(orgName);

      // Enable domain join checkbox
      const domainJoinLabel = page1.getByText(/let anyone with an @testcorp.com email join/i);
      await expect(domainJoinLabel).toBeVisible();
      await page1.getByRole('checkbox').check();
      logProgress('✅ User 1: Enabled domain join for @testcorp.com');

      // Submit organization creation
      await page1.getByRole('button', { name: 'Next' }).click();
      await expect(page1.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({ timeout: 10000 });

      // Complete User 1's onboarding flow quickly
      await expect(page1.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible();
      await page1.getByRole('textbox', { name: /your name/i }).fill('User One');
      await page1.getByRole('button', { name: 'Continue' }).click();
      await expect(page1.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible({ timeout: 10000 });

      await expect(page1.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible();
      await page1.getByRole('button', { name: 'Skip for Now' }).click();
      await expect(page1.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible({ timeout: 10000 });

      await expect(page1.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible();
      await page1.getByRole('button', { name: /Start Your First Conversation/i }).click();

      await handleTermsOfService(page1);
      await expect(page1).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ User 1: Completed full onboarding flow');

      // =================================================================
      // PHASE 2: User 2 joins existing organization (THE CRITICAL TEST)
      // =================================================================
      logProgress('👤 Phase 2: User 2 attempting to join existing organization...');

      const user2Email = `user2-${Date.now()}@testcorp.com`;
      await page2.goto('http://localhost:3080/login');
      await page2.getByRole('textbox', { name: 'Email address' }).fill(user2Email);
      await page2.getByTestId('login-button').click();

      // Follow magic link for User 2
      const magicLinkUrl2 = await captureMagicLink(user2Email);
      if (!magicLinkUrl2) {
        throw new Error('Failed to capture magic link for User 2');
      }

      await page2.goto(magicLinkUrl2);
      await page2.waitForLoadState('networkidle');

      // =================================================================
      // CRITICAL: User 2 should see ORGANIZATION PREVIEW (not creation!)
      // =================================================================
      await expect(page2).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });

      // Should see organization preview with the organization name in heading
      await expect(page2.getByRole('heading', { name: orgName })).toBeVisible({ timeout: 10000 });
      logProgress('✅ User 2: Can see existing organization name in preview');

      // Should see auto-join indicator
      await expect(page2.getByText(/Auto-join enabled/i)).toBeVisible();
      logProgress('✅ User 2: Can see auto-join is enabled');

      // Should see domain information in the organization details
      await expect(
        page2.getByText(
          /You can automatically join this organization with your testcorp\.com email/,
        ),
      ).toBeVisible();
      logProgress('✅ User 2: Can see domain information');

      // =================================================================
      // CRITICAL: Test the auto-join functionality
      // =================================================================
      // Look for the specific join button with organization name
      const joinButton = page2.getByRole('button', { name: new RegExp(`Join ${orgName}`, 'i') });
      await expect(joinButton).toBeVisible();
      logProgress('🖱️ User 2: Clicking join organization button...');

      await joinButton.click();

      // =================================================================
      // CRITICAL: Verify no redirect loops after join
      // =================================================================
      // Should advance to profile step (not loop back to preview)
      await expect(page2.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 15000,
      });
      logProgress('✅ User 2: Successfully joined org and advanced to profile (no redirect loop!)');

      // Complete User 2's remaining onboarding
      await page2.getByRole('textbox', { name: /your name/i }).fill('User Two');
      await page2.getByRole('button', { name: 'Continue' }).click();
      await expect(page2.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible({ timeout: 10000 });

      await expect(page2.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible();
      await page2.getByRole('button', { name: 'Skip for Now' }).click();
      await expect(page2.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible({ timeout: 10000 });

      await expect(page2.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible();
      await page2.getByRole('button', { name: /Start Your First Conversation/i }).click();

      await handleTermsOfService(page2);
      await expect(page2).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ User 2: Completed full onboarding flow after joining organization');

      // =================================================================
      // VERIFICATION: Check database state
      // =================================================================
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Verify organization exists with correct settings
      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      expect(org?.metadata?.domain).toBe('testcorp.com');
      expect(org?.metadata?.allowDomainJoin).toBe(true);

      // Debug: Log organization details
      console.log('🔍 Organization found:', {
        id: org?.id,
        _id: org?._id,
        name: org?.name,
        domain: org?.metadata?.domain,
        allowDomainJoin: org?.metadata?.allowDomainJoin,
      });

      // Verify both users are members of the organization
      // Now that we fixed the service to use ObjectIds properly, all members should use ObjectId format
      const members = await db.collection('member').find({ organizationId: org?._id }).toArray();

      console.log('🔍 Members found:', members.length);
      console.log(
        '🔍 Members:',
        members.map((m) => ({
          role: m.role,
          userId: m.userId,
          organizationId: m.organizationId,
          userIdType: typeof m.userId,
          orgIdType: typeof m.organizationId,
        })),
      );

      expect(members).toHaveLength(2);

      const user1Member = members.find(
        (m) => m.userId?.toString().includes('user1') || m.role === 'owner',
      );
      const user2Member = members.find(
        (m) => m.userId?.toString().includes('user2') || m.role === 'member',
      );

      expect(user1Member).toBeTruthy();
      expect(user2Member).toBeTruthy();
      expect(user1Member?.role).toBe('owner');
      expect(user2Member?.role).toBe('member');

      logProgress('✅ Database verification: Both users are members of the same organization');
      logProgress('🎉 Issue #104 organization join flow test PASSED!');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  /**
   * =================================================================================
   * OAUTH CORPORATE DOMAIN AUTO-JOIN FLOW TESTS
   * =================================================================================
   * Tests OAuth authentication with corporate domain auto-join functionality.
   * Extends Issue #104 scope to include OAuth flows with PRIVATE_DOMAIN.
   */

  test.skip('OAuth → Corporate Domain → Auto-Join Flow (Two Users)', async ({ browser }) => {
    // SKIPPED: IMPOSSIBLE - Requires two different OAuth users with same domain
    // We only have ONE OAuth account per domain (gannon@astrolabs.llc)
    // Use Magic Link tests for multi-user auto-join scenarios
    logProgress('🚀 Testing OAuth corporate domain auto-join flow with two users...');

    // Verify OAuth credentials are available (will fail test if missing)
    requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate auto-join flow');

    // Session 1: Create organization with OAuth User 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Session 2: Join existing organization with OAuth User 2
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // =================================================================
      // PHASE 1: OAuth User 1 creates organization with domain join enabled
      // =================================================================
      logProgress('👤 Phase 1: OAuth User 1 creating organization with domain join...');

      const orgName = 'Astrolabs OAuth Corp';

      // Complete OAuth onboarding flow for User 1 with domain join enabled
      await completeOAuthOnboardingFlow(page1, 'PRIVATE_DOMAIN', {
        orgName: orgName,
        enableDomainJoin: true,
        skipTeam: true,
      });

      await expect(page1).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ OAuth User 1: Completed organization creation with domain join enabled');

      // =================================================================
      // PHASE 2: OAuth User 2 joins existing organization
      // =================================================================
      logProgress('👤 Phase 2: OAuth User 2 attempting to join existing organization...');

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

      // Should see auto-join indicator
      await expect(page2.getByText(/Auto-join enabled/i)).toBeVisible();
      logProgress('✅ OAuth User 2: Can see auto-join is enabled');

      // Should see domain information
      await expect(
        page2.getByText(
          /You can automatically join this organization with your astrolabs\.llc email/,
        ),
      ).toBeVisible();
      logProgress('✅ OAuth User 2: Can see domain information');

      // =================================================================
      // CRITICAL: Test the auto-join functionality
      // =================================================================
      const joinButton = page2.getByRole('button', { name: new RegExp(`Join ${orgName}`, 'i') });
      await expect(joinButton).toBeVisible();
      logProgress('✅ OAuth User 2: Join button is visible');

      await joinButton.click();
      await page2.waitForTimeout(3000); // Wait for join process
      logProgress('🖱️ OAuth User 2: Clicked join organization button');

      // =================================================================
      // User 2 continues through onboarding after joining
      // =================================================================
      await expect(page2.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ OAuth User 2: Advanced to Profile step');

      // Profile should be pre-filled from OAuth
      const nameInput = page2.getByTestId('profile-name-input');
      const prefilledName = await nameInput.inputValue();
      expect(prefilledName).toBeTruthy();
      logProgress(`✅ OAuth User 2: Profile pre-filled with name: "${prefilledName}"`);

      // Continue through profile step
      await page2.getByTestId('profile-continue-button').click();
      await page2.waitForLoadState('networkidle');

      // Skip team step
      await expect(page2.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible({
        timeout: 10000,
      });
      await page2.getByRole('button', { name: 'Skip for Now' }).click();

      // Complete welcome step
      await expect(page2.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible({
        timeout: 10000,
      });
      await page2.getByRole('button', { name: /Start Your First Conversation/i }).click();

      // Handle Terms of Service if it appears
      await handleTermsOfService(page2);
      await expect(page2).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ OAuth User 2: Completed full onboarding flow');

      // =================================================================
      // VERIFICATION: Database validation
      // =================================================================
      logProgress('🔍 Verifying database state...');

      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Verify organization exists with correct settings
      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      expect(org?.slug).toBe('astrolabs-oauth-corp');
      expect(org?.metadata?.domain).toBe('astrolabs.llc');
      expect(org?.metadata?.allowDomainJoin).toBe(true);
      logProgress('✅ Organization verified in database');

      // Verify both OAuth users are members of the organization
      const members = await db.collection('member').find({ organizationId: org?._id }).toArray();
      expect(members).toHaveLength(2);

      const ownerMember = members.find((m) => m.role === 'owner');
      const regularMember = members.find((m) => m.role === 'member');

      expect(ownerMember).toBeTruthy();
      expect(regularMember).toBeTruthy();
      logProgress('✅ Database verification: Both OAuth users are members with correct roles');

      logProgress('🎉 OAuth corporate domain auto-join flow test PASSED!');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('OAuth → Corporate Domain → Join Existing Organization (Single User)', async ({ browser }) => {
    logProgress('🚀 Testing OAuth user joining pre-existing corporate organization...');

    // Verify OAuth credentials are available (will fail test if missing)
    requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth join existing organization');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // =================================================================
      // SETUP: Create organization via database (simulates existing org)
      // =================================================================
      const testOrg = await createTestOrganization('Pre-existing Astrolabs Corp', 'astrolabs.llc', true);
      logProgress(`✅ Created pre-existing organization: ${testOrg.name} with auto-join enabled`);

      // =================================================================
      // TEST: OAuth user joins existing organization
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

      // Join the organization
      const joinButton = page.getByRole('button', { name: new RegExp(`Join ${testOrg.name}`, 'i') });
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

      // =================================================================
      // VERIFICATION: Database validation
      // =================================================================
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      const members = await db.collection('member').find({ organizationId: testOrg._id }).toArray();
      expect(members).toHaveLength(1);
      expect(members[0].role).toBe('member');
      logProgress('✅ Database verification: OAuth user added as member to existing organization');

      logProgress('🎉 OAuth join existing organization test PASSED!');
    } finally {
      await context.close();
    }
  });
});
