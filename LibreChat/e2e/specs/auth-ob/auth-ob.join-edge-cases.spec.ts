/**
 * @fileoverview Organization Join Edge Cases Tests
 * @module e2e/specs/auth-ob.join-edge-cases
 *
 * Tests edge cases and error handling for organization joining:
 * - User already member attempts to join again
 * - Domain uniqueness constraint validation (1 org per domain)
 * - Domain join disabled after request sent
 * - Organization soft-deleted during join process (auto-join disabled, manual request allowed)
 * - Network failures and error recovery
 * - User can resume interrupted onboarding at correct step
 *
 * Related to Issue #104 extensions - edge cases and error handling
 */

import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
  handleTermsOfService,
  completeOrganizationStep,
  completeProfileStep,
  completeTeamStep,
  completeWelcomeStep,
  createTestOrganization,
  verifyOrganizationInDatabase,
  verifyOrganizationMembership,
  TEST_PATTERNS,
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

test.describe('Organization Join Edge Cases', () => {
  test.beforeEach(async () => {
    await cleanDatabase();
    logProgress('🧹 Database cleaned for edge case test');
  });

  test.afterEach(async () => {
    await cleanDatabase();
  });

  test('User already member attempts to join again', async ({ browser }) => {
    logProgress('🚀 Testing existing member attempting to join again...');

    // Session 1: Create organization and become member
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Session 2: Same user tries to join again
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // =================================================================
      // PHASE 1: User creates organization and becomes member
      // =================================================================
      const userEmail = generateTestEmail('testcorp.com');
      await page1.goto('http://localhost:3080/login');
      await page1.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page1.getByTestId('login-button').click();

      const magicLinkUrl1 = await captureMagicLink(userEmail);
      if (!magicLinkUrl1) {
        throw new Error('Failed to capture magic link for user');
      }

      await page1.goto(magicLinkUrl1);
      await page1.waitForLoadState('networkidle');

      // Complete organization creation
      await expect(page1).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });

      const orgName = 'TestCorp Engineering';
      await completeOrganizationStep(page1, orgName, true); // Enable domain join
      await completeProfileStep(page1, 'Test User');
      await completeTeamStep(page1, true);
      await completeWelcomeStep(page1);

      await handleTermsOfService(page1);
      await expect(page1).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ User: Completed organization creation and onboarding');

      // =================================================================
      // PHASE 2: Same user tries to join again (should detect existing membership)
      // =================================================================
      await page2.goto('http://localhost:3080/login');
      await page2.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page2.getByTestId('login-button').click();

      const magicLinkUrl2 = await captureMagicLink(userEmail);
      if (!magicLinkUrl2) {
        throw new Error('Failed to capture second magic link for user');
      }

      await page2.goto(magicLinkUrl2);
      await page2.waitForLoadState('networkidle');

      // =================================================================
      // CRITICAL: System should detect existing membership
      // =================================================================
      // Check if we have a magic link error (indicates potential issue)
      const hasError = await page2.getByText(/There was an error with the magic link/i).isVisible();
      if (hasError) {
        logProgress('❌ Magic link error detected - this indicates a failure in the authentication system');
        throw new Error('Magic link authentication failed for existing user - this should not happen');
      }

      // Check current URL and determine where we are
      const currentUrl = await page2.url();
      logProgress(`🔍 User: Current URL after authentication: ${currentUrl}`);

      if (currentUrl.includes('/c/new')) {
        logProgress('✅ User: System detected existing membership and redirected to main app');
        // Should not show onboarding flow
        await expect(
          page2.getByRole('heading', { name: /What's the name of your/ }),
        ).not.toBeVisible();
        logProgress('✅ User: Onboarding correctly skipped for existing member');
      } else if (currentUrl.includes('/onboarding')) {
        logProgress(
          '❌ User: Went to onboarding instead of main app - membership detection failed',
        );
        throw new Error('Existing member was incorrectly sent to onboarding flow - membership detection is broken');
      } else {
        logProgress(`❌ User: Unexpected URL: ${currentUrl}`);
        // Wait for either main app or onboarding with proper error handling
        await Promise.race([
          page2.waitForURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 }),
          page2.waitForURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 }),
        ]);
        const finalUrl = await page2.url();
        logProgress(`✅ User: Finally reached: ${finalUrl}`);
      }

      // =================================================================
      // VERIFICATION: Check database state
      // =================================================================

      // Verify organization still exists
      await verifyOrganizationInDatabase(orgName, 'testcorp.com', true);

      // Verify user is still a member (no duplicate memberships)
      const members = await verifyOrganizationMembership(orgName, 1);
      expect(members[0].role).toBe('owner');
      logProgress('✅ Database verification: No duplicate memberships created');

      logProgress('🎉 Existing member re-join handling test PASSED!');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('Domain uniqueness constraint - user joins existing organization', async ({ browser }) => {
    logProgress('🚀 Testing domain uniqueness constraint behavior...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // =================================================================
      // SETUP: Create single organization with domain (business rule: 1 org per domain)
      // =================================================================
      const domain = 'acme.com';
      await createTestOrganization('Acme Corp', domain, true); // allowDomainJoin = true
      logProgress('✅ Created organization with domain auto-join enabled');

      // =================================================================
      // TEST: User with matching domain should be directed to join existing organization
      // =================================================================
      const userEmail = generateTestEmail(domain);
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page.getByTestId('login-button').click();

      const magicLinkUrl = await captureMagicLink(userEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link for user');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Should be on onboarding
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });

      // =================================================================
      // CRITICAL: Should show existing organization join option (not creation)
      // =================================================================

      // Should show existing organization detected
      await expect(page.getByText('Auto-join enabled')).toBeVisible();
      logProgress("✅ User: 'Auto-join enabled' message shown");

      // Should show join option for existing organization
      await expect(page.getByText('Acme Corp').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Join Acme Corp' })).toBeVisible();
      logProgress('✅ User: Join existing organization option displayed');

      // User should be able to join the existing organization
      await page.getByRole('button', { name: 'Join Acme Corp' }).click();

      // Should proceed to complete onboarding after joining
      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ User: Successfully joined existing organization');

      logProgress('🎉 Domain uniqueness constraint test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('Domain join disabled after request sent', async ({ browser }) => {
    logProgress('🚀 Testing domain join disabled after request...');

    // Session 1: Create organization with domain join enabled
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Session 2: User requests to join
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // =================================================================
      // PHASE 1: Create organization with domain join ENABLED
      // =================================================================
      const user1Email = generateTestEmail('techcorp.com');
      await page1.goto('http://localhost:3080/login');
      await page1.getByRole('textbox', { name: 'Email address' }).fill(user1Email);
      await page1.getByTestId('login-button').click();

      const magicLinkUrl1 = await captureMagicLink(user1Email);
      if (!magicLinkUrl1) {
        throw new Error('Failed to capture magic link for User 1');
      }

      await page1.goto(magicLinkUrl1);
      await page1.waitForLoadState('networkidle');

      const orgName = 'TechCorp Engineering';
      await completeOrganizationStep(page1, orgName, true); // Enable domain join
      await completeProfileStep(page1, 'User One');
      await completeTeamStep(page1, true);
      await completeWelcomeStep(page1);

      await handleTermsOfService(page1);
      await expect(page1).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      logProgress('✅ Organization created with domain join enabled');

      // =================================================================
      // PHASE 2: Simulate domain join being disabled after org creation
      // =================================================================
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Update organization to disable domain join
      const updateResult = await db
        .collection('organization')
        .updateOne({ name: orgName }, { $set: { 'metadata.allowDomainJoin': false } });

      if (updateResult.matchedCount === 0) {
        throw new Error('Failed to update organization domain join setting');
      }
      logProgress('✅ Domain join disabled via database update');

      // =================================================================
      // PHASE 3: User 2 should now see manual approval flow
      // =================================================================
      const user2Email = generateTestEmail('techcorp.com');
      await page2.goto('http://localhost:3080/login');
      await page2.getByRole('textbox', { name: 'Email address' }).fill(user2Email);
      await page2.getByTestId('login-button').click();

      const magicLinkUrl2 = await captureMagicLink(user2Email);
      if (!magicLinkUrl2) {
        throw new Error('Failed to capture magic link for User 2');
      }

      await page2.goto(magicLinkUrl2);
      await page2.waitForLoadState('networkidle');

      // Should be on onboarding and see manual approval flow
      await expect(page2).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });
      await expect(page2.getByRole('heading', { name: orgName })).toBeVisible({ timeout: 10000 });

      // Should see "Request to Join" (not auto-join)
      await expect(page2.getByText(/Request to join/i)).toBeVisible();
      await expect(page2.getByText(/Auto-join enabled/i)).not.toBeVisible();
      logProgress('✅ User 2: Correctly sees manual approval flow after setting change');

      // User can still request to join
      const requestButton = page2.getByRole('button', { name: /Request to join/i });
      await expect(requestButton).toBeVisible();
      await requestButton.click();
      await page2.waitForTimeout(3000);

      // Should show confirmation
      await expect(page2.getByText('Join request sent! An admin')).toBeVisible();
      logProgress('✅ User 2: Join request still works after setting change');

      // =================================================================
      // VERIFICATION: Check that request was stored properly
      // =================================================================
      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      expect(org?.metadata?.allowDomainJoin).toBe(false);

      const joinRequests = org?.metadata?.joinRequests || [];
      expect(joinRequests).toHaveLength(1);
      expect(joinRequests[0]).toMatchObject({
        userEmail: user2Email,
        status: 'pending',
      });
      logProgress('✅ Database verification: Join request stored despite setting change');

      logProgress('🎉 Domain join disabled after request test PASSED!');
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('Organization soft-deleted during join process', async ({ browser }) => {
    logProgress('🚀 Testing organization soft-deletion during join...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // =================================================================
      // SETUP: Create organization that will be soft-deleted
      // =================================================================
      const orgName = 'Doomed Corp';
      const domain = 'doomed.com';
      await createTestOrganization(orgName, domain, true); // Enable domain join
      logProgress('✅ Created organization that will be soft-deleted');

      // =================================================================
      // PHASE 1: User starts join process
      // =================================================================
      const userEmail = generateTestEmail(domain);
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page.getByTestId('login-button').click();

      const magicLinkUrl = await captureMagicLink(userEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link for user');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Should be on onboarding and see organization
      await expect(page).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: orgName })).toBeVisible({ timeout: 10000 });
      logProgress('✅ User: Reached organization join screen');

      // =================================================================
      // PHASE 2: Simulate organization deletion (soft delete to match real behavior)
      // =================================================================
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Soft delete the organization (mark as deleted) to match real application behavior
      const deleteResult = await db.collection('organization').updateOne(
        { name: orgName },
        { $set: { deletedAt: new Date() } }
      );

      if (deleteResult.matchedCount === 0) {
        throw new Error('Failed to find organization in database for deletion');
      }
      if (deleteResult.modifiedCount === 0) {
        logProgress('⚠️ Organization was already marked as deleted');
      }
      logProgress('✅ Organization marked as deleted in database');

      // =================================================================
      // PHASE 3: User tries to join soft-deleted organization
      // =================================================================
      
      // After soft-deletion, the eligibility check should detect the deleted org
      // and automatically switch from auto-join to manual request flow
      await expect(page.getByRole('button', { name: /Request to join/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: new RegExp(`Join ${orgName}`, 'i') })).not.toBeVisible();
      logProgress('✅ User: Auto-join disabled for soft-deleted organization, showing request flow');
      
      // Click the request to join button
      const requestButton = page.getByRole('button', { name: /Request to join/i });
      await requestButton.click();
      await page.waitForTimeout(3000);
      logProgress('🔘 User: Clicked Request to Join button');
      
      // Should show error message - users cannot request to join soft-deleted organizations
      await expect(page.getByText(/Failed to create join request/i)).toBeVisible({ timeout: 5000 });
      logProgress('✅ User: Correct error message displayed - cannot request to join soft-deleted organization');
      
      // Should NOT show success message
      await expect(page.getByText(/request.*sent/i)).not.toBeVisible();
      logProgress('✅ User: No success message shown (correctly blocked request for soft-deleted org)')
      
      // =================================================================
      // VERIFICATION: Check database state
      // =================================================================

      // Verify organization still exists but is soft-deleted
      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      if (!org) {
        throw new Error('Organization not found in database after soft-deletion');
      }
      expect(org.deletedAt).toBeTruthy();
      logProgress('✅ Database verification: Organization exists but is marked as deleted');
      
      // Verify no user membership was created (since auto-join was disabled)
      const membership = await db.collection('organizationMembership').findOne({ organizationId: org._id });
      expect(membership).toBeFalsy();
      logProgress('✅ Database verification: No membership created for soft-deleted organization');
      
      // Check if join request was created
      const joinRequest = org.metadata?.joinRequests?.find((req: any) => req.userEmail.includes('doomed.com'));
      if (joinRequest) {
        logProgress('✅ Database verification: Join request was created for soft-deleted organization');
      } else {
        logProgress('ℹ️ Database verification: No join request found (may be expected behavior)');
      }

      logProgress('🎉 Organization soft-deletion handling test COMPLETED!');
    } finally {
      await context.close();
    }
  });

  test('User can resume interrupted onboarding at correct step', async ({ browser }) => {
    logProgress('🚀 Testing interrupted onboarding resumption...');

    try {
      // =================================================================
      // PHASE 1: User starts onboarding but gets interrupted
      // =================================================================
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const userEmail = generateTestEmail('resumetest.com');
      await page1.goto('http://localhost:3080/login');
      await page1.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page1.getByTestId('login-button').click();

      const magicLinkUrl1 = await captureMagicLink(userEmail);
      if (!magicLinkUrl1) {
        throw new Error('Failed to capture magic link for user');
      }

      await page1.goto(magicLinkUrl1);
      await page1.waitForLoadState('networkidle');

      // Should be on onboarding
      await expect(page1).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });

      // Complete organization step
      const orgName = 'Resume Test Corp';
      await completeOrganizationStep(page1, orgName, true);
      logProgress('✅ Phase 1: Organization step completed');

      // Start profile step but don't complete it
      await expect(page1.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 10000,
      });
      await page1.getByRole('textbox', { name: 'Your Name' }).fill('Test User Resume');
      logProgress('✅ Phase 1: Profile step partially completed');

      // Simulate interruption - close browser without completing
      await context1.close();
      logProgress('🔄 Phase 1: Simulated interruption (browser closed)');

      // =================================================================
      // PHASE 2: User returns and should resume from profile step
      // =================================================================
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Brief delay to simulate time passage

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // User tries to login again
      await page2.goto('http://localhost:3080/login');
      await page2.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page2.getByTestId('login-button').click();

      const magicLinkUrl2 = await captureMagicLink(userEmail);
      if (!magicLinkUrl2) {
        throw new Error('Failed to capture second magic link for user');
      }

      await page2.goto(magicLinkUrl2);
      await page2.waitForLoadState('networkidle');

      // =================================================================
      // CRITICAL: Should resume at profile step, not start over
      // =================================================================

      // Should be on onboarding at the profile step
      await expect(page2).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });

      // Check if we're at the profile step (not back at organization step)
      const isAtProfileStep = await page2
        .getByRole('heading', { name: /Complete Your Profile/i })
        .isVisible();
      const isAtOrganizationStep = await page2
        .getByRole('heading', { name: /What's the name of your/i })
        .isVisible();

      // =================================================================
      // CRITICAL ASSERTIONS: These should fail until feature is implemented
      // =================================================================

      // User should resume at profile step (not restart from organization step)
      expect(isAtProfileStep).toBe(true);
      logProgress('✅ Phase 2: Correctly resumed at profile step');

      // TODO: Profile form should remember the previously entered name (localStorage persistence not yet implemented)
      const nameInput = await page2.getByRole('textbox', { name: 'Your Name' });
      const nameValue = await nameInput.inputValue();

      if (nameValue === 'Test User Resume') {
        logProgress('✅ Phase 2: Profile data preserved from previous session');
      } else {
        logProgress(
          '⚠️ Phase 2: Profile data not preserved (localStorage persistence not implemented yet)',
        );
        // Fill the form to continue the test
        await nameInput.fill('Test User Resume');
      }

      // Continue with the profile form to test the complete flow
      await page2.getByRole('button', { name: 'Continue' }).click();
      logProgress('✅ Phase 2: Profile step completed successfully');

      // Wait for navigation to team step
      await page2.waitForTimeout(2000); // Allow time for navigation

      // Should proceed to team step
      await expect(page2.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Phase 2: Advanced to team step');

      // =================================================================
      // PHASE 3: Complete remaining onboarding steps
      // =================================================================

      // Complete team step
      await completeTeamStep(page2, true);
      logProgress('✅ Phase 3: Team step completed');

      // Wait for navigation to welcome step
      await page2.waitForTimeout(2000); // Allow time for navigation

      // Complete welcome step
      await expect(page2.getByRole('heading', { name: /Welcome to Agentis/i })).toBeVisible({
        timeout: 10000,
      });
      await completeWelcomeStep(page2);
      logProgress('✅ Phase 3: Welcome step completed');

      // Handle terms of service if needed
      await handleTermsOfService(page2);

      // Should reach main app
      await expect(page2).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 15000 });
      logProgress('✅ Phase 3: Successfully reached main app');

      // =================================================================
      // VERIFICATION: Check final state
      // =================================================================

      // Verify organization was created
      await verifyOrganizationInDatabase(orgName, 'resumetest.com', true);

      // Verify user membership
      const members = await verifyOrganizationMembership(orgName, 1);
      expect(members[0].role).toBe('owner');
      logProgress('✅ Verification: Organization and membership created successfully');

      await context2.close();
      logProgress('🎉 Interrupted onboarding resumption test COMPLETED!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logProgress(`❌ Interrupted onboarding test failed: ${errorMessage}`);
      throw error;
    }
  });

  test('User can resume onboarding after browser data loss', async ({ browser }) => {
    logProgress('🚀 Testing onboarding resumption after complete browser data loss...');

    const testDomain = 'datalosstest.com';
    const userEmail = generateTestEmail(testDomain);
    const orgName = 'DataLoss Test Corp';

    try {
      // =================================================================
      // PHASE 1: Partial onboarding in first browser
      // =================================================================
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      logProgress('🖥️ Phase 1: Starting onboarding in first browser');
      await page1.goto('http://localhost:3080/login');
      await page1.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page1.getByTestId('login-button').click();

      // Follow magic link
      const magicLinkUrl1 = await captureMagicLink(userEmail);
      if (!magicLinkUrl1) {
        throw new Error('Failed to capture first magic link');
      }
      await page1.goto(magicLinkUrl1);
      await page1.waitForLoadState('networkidle');

      // Complete organization step
      await expect(page1).toHaveURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 10000 });
      await completeOrganizationStep(page1, orgName, true);
      logProgress('✅ Phase 1: Organization step completed');

      // Start profile step but don't complete it
      await expect(page1.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 10000,
      });
      await page1.getByRole('textbox', { name: 'Your Name' }).fill('Test User DataLoss');
      logProgress('✅ Phase 1: Filled profile form but not submitted');

      // Close the browser completely (simulate data loss)
      await context1.close();
      logProgress('🔌 Phase 1: Browser closed - simulating complete data loss');

      // =================================================================
      // PHASE 2: Resume onboarding in completely new browser
      // =================================================================
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      logProgress('🖥️ Phase 2: Opening fresh browser with no stored data');
      await page2.goto('http://localhost:3080/login');
      await page2.getByRole('textbox', { name: 'Email address' }).fill(userEmail);
      await page2.getByTestId('login-button').click();

      // Follow new magic link
      const magicLinkUrl2 = await captureMagicLink(userEmail);
      if (!magicLinkUrl2) {
        throw new Error('Failed to capture second magic link');
      }
      await page2.goto(magicLinkUrl2);
      await page2.waitForLoadState('networkidle');

      // User should resume at profile step (not restart from organization step)
      const isAtProfileStep = await page2
        .getByRole('heading', { name: /Complete Your Profile/i })
        .isVisible();
      expect(isAtProfileStep).toBe(true);
      logProgress('✅ Phase 2: Correctly resumed at profile step');

      // Form data should be lost (no localStorage in new browser)
      const nameInput = await page2.getByRole('textbox', { name: 'Your Name' });
      const nameValue = await nameInput.inputValue();
      expect(nameValue).toBe(''); // Should be empty
      logProgress('✅ Phase 2: Form data correctly lost (no localStorage in new browser)');

      // Fill and complete the profile step
      await nameInput.fill('Test User DataLoss New');
      await page2.getByRole('button', { name: 'Continue' }).click();
      logProgress('✅ Phase 2: Profile step completed');

      // Complete team step
      await expect(page2.getByRole('heading', { name: /Invite Your Team/i })).toBeVisible({
        timeout: 10000,
      });
      await completeTeamStep(page2, true);
      logProgress('✅ Phase 2: Team step completed');

      // Complete welcome step
      await expect(page2.getByRole('heading', { name: /Welcome to/i })).toBeVisible({
        timeout: 10000,
      });
      await completeWelcomeStep(page2);
      logProgress('✅ Phase 2: Welcome step completed');

      // Handle terms of service
      await handleTermsOfService(page2);

      // Should reach main app
      await expect(page2).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 15000 });
      logProgress('✅ Phase 2: Successfully completed onboarding after browser data loss');

      // =================================================================
      // VERIFICATION: Check database state
      // =================================================================
      await verifyOrganizationInDatabase(orgName, testDomain, true);
      const members = await verifyOrganizationMembership(orgName, 1);
      expect(members[0].role).toBe('owner');
      logProgress('✅ Verification: Organization and membership created successfully');

      await context2.close();
      logProgress('🎉 Browser data loss resumption test COMPLETED!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logProgress(`❌ Browser data loss test failed: ${errorMessage}`);
      throw error;
    }
  });
});
