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
      await page1.waitForTimeout(2000);

      // Complete User 1's onboarding flow quickly
      await expect(page1.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible();
      await page1.getByRole('textbox', { name: /your name/i }).fill('User One');
      await page1.getByRole('button', { name: 'Continue' }).click();
      await page1.waitForTimeout(2000);

      await expect(page1.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible();
      await page1.getByRole('button', { name: 'Skip for Now' }).click();
      await page1.waitForTimeout(2000);

      await expect(page1.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible();
      await page1.getByRole('button', { name: /Start Your First Conversation/i }).click();
      await page1.waitForTimeout(1000);

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
      await page2.waitForTimeout(3000); // Wait a bit longer for join process

      // =================================================================
      // CRITICAL: Verify no redirect loops after join
      // =================================================================
      // Should advance to profile step (not loop back to preview)
      await expect(page2.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ User 2: Successfully joined org and advanced to profile (no redirect loop!)');

      // Complete User 2's remaining onboarding
      await page2.getByRole('textbox', { name: /your name/i }).fill('User Two');
      await page2.getByRole('button', { name: 'Continue' }).click();
      await page2.waitForTimeout(2000);

      await expect(page2.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible();
      await page2.getByRole('button', { name: 'Skip for Now' }).click();
      await page2.waitForTimeout(2000);

      await expect(page2.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible();
      await page2.getByRole('button', { name: /Start Your First Conversation/i }).click();
      await page2.waitForTimeout(1000);

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
});
