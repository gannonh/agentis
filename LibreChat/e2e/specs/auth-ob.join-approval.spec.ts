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
import { logProgress } from '../utils/testLogger';
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
} from '../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

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
      logProgress('✅ User 2: Request sent confirmation displayed')

      // =================================================================
      // VERIFICATION: Check database state
      // =================================================================
      
      // Verify organization exists with domain join disabled
      await verifyOrganizationInDatabase(orgName, 'testcorp.com', false);

      // Verify join request was created in organization metadata
      const { getTestDatabase } = await import('../utils/testAuth');
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
});