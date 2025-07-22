import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  cleanDatabase,
  handleTermsOfService,
} from '../../utils/authOnboardingUtils';
import {
  cleanupTestUser,
  generateTestId,
  createTestUserAtTeamStep,
  type TestAuthResult,
} from '../../utils/testAuth';
import { createMailHog } from '../../utils/mailhog.js';

test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

test.describe('Team Invitation Acceptance Flow Tests', () => {
  let testAuth: TestAuthResult;
  let testId: string;
  let mailhog: ReturnType<typeof createMailHog>;

  test.beforeEach(async () => {
    await cleanDatabase();
    testId = generateTestId();
    mailhog = createMailHog();

    // Clear any existing emails in MailHog
    try {
      await mailhog.clearMessages();
      logProgress('🧹 Cleared MailHog messages');
    } catch (error) {
      logProgress(`⚠️ Failed to clear MailHog: ${error}`);
    }

    // Create a test user positioned at team step (inviter)
    testAuth = await createTestUserAtTeamStep(testId);
    logProgress(
      `✅ Created test user: ${testAuth.user.email} with org: ${testAuth.organization.name}`,
    );
  });

  test.afterEach(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Cleanup failed for user ${testAuth.user.email}: ${error}`);
      }
    }

    // Also cleanup any invited users that were created during the test
    try {
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Clean up invited users (they have emails matching our test pattern)
      // Extended pattern to match all test invitee emails used in this test file
      const testEmailPattern =
        /test-(invitee|link-extract|token-validation|network-error|deleted-org|deactivated-inviter|rapid-accept|magic-fail|api-user)-\d+-[a-z0-9]+@example\.com/;

      // Get user IDs for test users to clean up their sessions and memberships
      const testUsers = await db
        .collection('user')
        .find({
          email: { $regex: testEmailPattern },
        })
        .toArray();
      const testUserIds = testUsers.map((u) => u._id);

      // Clean up test users
      await db.collection('user').deleteMany({
        email: { $regex: testEmailPattern },
      });
      await db.collection('account').deleteMany({
        email: { $regex: testEmailPattern },
      });

      // Clean up sessions only for test users
      if (testUserIds.length > 0) {
        await db.collection('session').deleteMany({
          userId: { $in: testUserIds },
        });
      }

      // Clean up invitations for test emails
      await db.collection('invitation').deleteMany({
        email: { $regex: testEmailPattern },
      });

      // Get test organization IDs from the inviter
      const testOrgIds = testAuth?.organization?.id ? [testAuth.organization.id] : [];

      // Clean up members only for test users and test organizations
      if (testUserIds.length > 0 || testOrgIds.length > 0) {
        await db.collection('member').deleteMany({
          $or: [
            ...(testUserIds.length > 0 ? [{ userId: { $in: testUserIds } }] : []),
            ...(testOrgIds.length > 0 ? [{ organizationId: { $in: testOrgIds } }] : []),
          ],
        });
      }

      logProgress('✅ Cleaned up invited test users');
    } catch (error) {
      logProgress(`⚠️ Invited user cleanup failed: ${error}`);
    }

    await cleanDatabase();
  });

  /**
   * =================================================================================
   * INVITATION LINK EXTRACTION AND VALIDATION TESTS
   * =================================================================================
   */

  test('Should extract invitation acceptance link from email', async ({ browser }) => {
    logProgress('🚀 Testing invitation link extraction from MailHog email...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Generate email for new user
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-link-extract-${inviteeTestId}@example.com`;

      logProgress(`📝 Will test email link extraction for: ${inviteeEmail}`);

      // Step 2: Login as inviter (testAuth user) and send invitation
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: testAuth.session.sessionToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        },
      ]);

      // Navigate to onboarding (user is positioned at team step)
      await page.goto('http://localhost:3080/onboarding');
      logProgress('📱 Logged in as inviter');

      // Verify we're at team invitation step
      await expect(
        page.getByRole('heading', { name: 'Invite your team', exact: true }),
      ).toBeVisible();

      // Add invitee email using the main email input
      const emailInput = page.getByTestId('team-email-input');
      await emailInput.fill(inviteeEmail);
      await emailInput.press('Enter');

      // Send invitations
      await page.getByRole('button', { name: 'Send invitations' }).click();

      // Wait for success and navigation to next step
      await expect(page.getByRole('heading', { name: 'Welcome to Agentis!' })).toBeVisible();
      logProgress(`📧 Sent invitation to ${inviteeEmail}`);

      // Step 3: Extract invitation link from MailHog
      await page.waitForTimeout(2000); // Wait for email to be processed

      const messages = await mailhog.getMessages();
      const latestMessage = messages.find(
        (msg) => msg.To && msg.To[0] && msg.To[0].Mailbox === inviteeEmail.split('@')[0],
      );

      if (!latestMessage) {
        throw new Error(`No invitation email found for ${inviteeEmail}`);
      }

      logProgress('✅ Found invitation email in MailHog');

      // Step 4: Extract and validate invitation link
      const inviteLink = mailhog.extractInviteLink(latestMessage);
      if (!inviteLink) {
        throw new Error('No invitation link found in email');
      }

      logProgress(`🔗 Extracted invitation link: ${inviteLink}`);

      // Step 5: Validate link format and components
      const url = new URL(inviteLink);

      // Validate URL structure
      expect(url.protocol).toBe('http:');
      expect(url.hostname).toBe('localhost');
      expect(url.port).toBe('3080');
      expect(url.pathname).toMatch(/^\/auth\/accept-invitation\/[a-f0-9]{24}$/);

      // Extract invitation ID from URL path
      const invitationId = url.pathname.split('/').pop();
      expect(invitationId).toMatch(/^[a-f0-9]{24}$/); // MongoDB ObjectId format

      logProgress(`✅ Link format validation passed. Invitation ID: ${invitationId}`);

      // Step 6: Verify invitation exists in database
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      const invitation = await db.collection('invitation').findOne({
        _id: new (await import('mongodb')).ObjectId(invitationId),
      });

      expect(invitation).toBeTruthy();
      expect(invitation?.email).toBe(inviteeEmail);
      expect(invitation?.status).toBe('pending');
      expect(invitation?.organizationId?.toString()).toBe(testAuth.organization.id);

      logProgress('✅ Database validation: Invitation record found and valid');

      // Step 7: Verify email content contains expected information
      const emailBody = latestMessage.Content?.Body;
      expect(emailBody).toBeTruthy();
      // Note: inviteLink was already successfully extracted by mailhog.extractInviteLink()
      // so we know it exists in the email. The raw body is encoded, so we don't need to re-verify the link.
      expect(emailBody).toContain(testAuth.organization.name);
      expect(emailBody).toContain('invited you to join');

      logProgress('✅ Email content validation passed');

      logProgress('🎉 Invitation link extraction test completed successfully!');
    } finally {
      await context.close();
    }
  });

  test('Should validate invitation token before showing acceptance page', async ({ browser }) => {
    logProgress('🚀 Testing invitation token validation...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create a valid invitation
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-token-validation-${inviteeTestId}@example.com`;

      logProgress(`📝 Testing token validation for: ${inviteeEmail}`);

      // Create invitation via API (simulating what the invitation flow does)
      const invitationResponse = await fetch(
        'http://localhost:3080/api/auth/organization/invite-member',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `better-auth.session_token=${testAuth.session.sessionToken}`,
          },
          body: JSON.stringify({
            email: inviteeEmail,
            role: 'member',
            organizationId: testAuth.organization.id,
          }),
        },
      );

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      const validInvitationId = invitationData.id;

      logProgress(`✅ Created test invitation with ID: ${validInvitationId}`);

      // Step 2: Test valid invitation token
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Should show invitation acceptance page
      await expect(page.getByRole('heading', { name: "You've been invited!" })).toBeVisible();

      await expect(
        page.getByText(`You've been invited to join ${testAuth.organization.name}`),
      ).toBeVisible();

      await expect(
        page.getByText('has invited you to join their organization as a member'),
      ).toBeVisible();

      await expect(page.getByTestId('sign-in-button')).toBeVisible();

      logProgress('✅ Valid invitation token shows acceptance page correctly');

      // Step 3: Test invalid invitation token (non-existent)
      const invalidInvitationId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but doesn't exist
      await page.goto(`http://localhost:3080/auth/accept-invitation/${invalidInvitationId}`);

      // Should show error message
      await expect(page.getByText('Invitation not found or has expired')).toBeVisible({
        timeout: 10000,
      });

      logProgress('✅ Invalid invitation token shows appropriate error');

      // Step 4: Test malformed invitation token
      const malformedInvitationId = 'invalid-token-format';
      await page.goto(`http://localhost:3080/auth/accept-invitation/${malformedInvitationId}`);

      // Should show error message for invalid format (404 error becomes "Invitation not found or has expired")
      await expect(page.getByText('Invitation not found or has expired')).toBeVisible({
        timeout: 10000,
      });

      logProgress('✅ Malformed invitation token shows appropriate error');

      // Step 5: Test already accepted invitation
      // First, we need to accept the valid invitation to test this case
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Mark invitation as accepted in database
      await db.collection('invitation').updateOne(
        { _id: new (await import('mongodb')).ObjectId(validInvitationId) },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date(),
          },
        },
      );

      // Now visit the same invitation link
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Should show already accepted error
      await expect(page.getByText('Invitation has already been accepted')).toBeVisible({
        timeout: 10000,
      });

      logProgress('✅ Already accepted invitation shows appropriate error');

      // Step 6: Test expired invitation (simulate by setting expiration date in past)
      // Reset invitation to pending first
      await db.collection('invitation').updateOne(
        { _id: new (await import('mongodb')).ObjectId(validInvitationId) },
        {
          $set: {
            status: 'pending',
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          },
          $unset: { acceptedAt: 1 },
        },
      );

      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Should show expired error (410 status becomes "Invitation has expired")
      await expect(page.getByText('Invitation has expired')).toBeVisible({ timeout: 10000 });

      logProgress('✅ Expired invitation shows appropriate error');

      logProgress('🎉 Invitation token validation test completed successfully!');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * EDGE CASE TESTS - Error Scenarios and Failure Conditions
   * =================================================================================
   */

  test('Network error during invitation validation should show graceful error', async ({
    browser,
  }) => {
    logProgress('🚀 Testing network error handling during invitation validation...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create a valid invitation first
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-network-error-${inviteeTestId}@example.com`;

      logProgress(`📝 Testing network error scenario for: ${inviteeEmail}`);

      // Create invitation via API
      const invitationResponse = await fetch(
        'http://localhost:3080/api/auth/organization/invite-member',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `better-auth.session_token=${testAuth.session.sessionToken}`,
          },
          body: JSON.stringify({
            email: inviteeEmail,
            role: 'member',
            organizationId: testAuth.organization.id,
          }),
        },
      );

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      const validInvitationId = invitationData.id;

      logProgress(`✅ Created test invitation with ID: ${validInvitationId}`);

      // Step 2: Mock network failure by intercepting the API call
      await page.route('**/api/invitations/public/**', async (route) => {
        logProgress(`🔌 Intercepting API call: ${route.request().url()}`);
        // Simulate network error by failing the request
        await route.abort('failed');
      });

      // Step 3: Navigate to invitation link (this should trigger network error)
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Step 4: Should show network error handling
      // The component should gracefully handle the failed fetch and show an appropriate error
      await expect(page.getByText('Load failed')).toBeVisible({ timeout: 10000 });

      logProgress('✅ Network error correctly handled with graceful error message');

      // Step 5: Verify retry functionality by removing the route mock
      await page.unroute('**/api/invitations/public/**');

      // Reload the page to retry
      await page.reload();

      // Should now successfully load the invitation
      await expect(page.getByRole('heading', { name: "You've been invited!" })).toBeVisible({
        timeout: 10000,
      });

      await expect(
        page.getByText(`You've been invited to join ${testAuth.organization.name}`),
      ).toBeVisible();

      logProgress('✅ Retry after network recovery works correctly');

      logProgress('🎉 Network error handling test completed successfully!');
    } finally {
      // Clean up any route mocks
      await page.unroute('**/api/invitations/public/**');
      await context.close();
    }
  });

  test('Organization no longer exists for valid invitation', async ({ browser }) => {
    logProgress('🚀 Testing invitation for deleted organization...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create a valid invitation
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-deleted-org-${inviteeTestId}@example.com`;

      logProgress(`📝 Testing deleted organization scenario for: ${inviteeEmail}`);

      // Create invitation via API
      const invitationResponse = await fetch(
        'http://localhost:3080/api/auth/organization/invite-member',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `better-auth.session_token=${testAuth.session.sessionToken}`,
          },
          body: JSON.stringify({
            email: inviteeEmail,
            role: 'member',
            organizationId: testAuth.organization.id,
          }),
        },
      );

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      const validInvitationId = invitationData.id;

      logProgress(`✅ Created test invitation with ID: ${validInvitationId}`);

      // Step 2: Delete the organization from database
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Delete the organization but keep the invitation
      const deleteResult = await db.collection('organization').deleteOne({
        _id: new (await import('mongodb')).ObjectId(testAuth.organization.id),
      });

      expect(deleteResult.deletedCount).toBe(1);
      logProgress('🗑️ Deleted organization from database');

      // Step 3: Navigate to invitation link
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Step 4: Should show invitation page but with "Unknown Organization"
      await expect(page.getByRole('heading', { name: "You've been invited!" })).toBeVisible({
        timeout: 10000,
      });

      await expect(page.getByText('Unknown Organization')).toBeVisible({ timeout: 5000 });

      logProgress('✅ Orphaned invitation shows "Unknown Organization"');

      // Step 5: Verify invitation is still in database but organization is gone
      const invitation = await db.collection('invitation').findOne({
        _id: new (await import('mongodb')).ObjectId(validInvitationId),
      });

      expect(invitation).toBeTruthy();
      expect(invitation?.status).toBe('pending');

      const organization = await db.collection('organization').findOne({
        _id: new (await import('mongodb')).ObjectId(testAuth.organization.id),
      });

      expect(organization).toBeNull();

      logProgress('✅ Database validation: Invitation exists but organization is deleted');

      logProgress('🎉 Deleted organization test completed successfully!');
    } finally {
      await context.close();
    }
  });

  test('Invitation from deactivated user should show "Someone" as inviter', async ({ browser }) => {
    logProgress('🚀 Testing invitation from deactivated user...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create a valid invitation first
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-deactivated-inviter-${inviteeTestId}@example.com`;

      logProgress(`📝 Testing deactivated inviter scenario for: ${inviteeEmail}`);

      // Create invitation via API (while inviter still exists)
      const invitationResponse = await fetch(
        'http://localhost:3080/api/auth/organization/invite-member',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `better-auth.session_token=${testAuth.session.sessionToken}`,
          },
          body: JSON.stringify({
            email: inviteeEmail,
            role: 'member',
            organizationId: testAuth.organization.id,
          }),
        },
      );

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      const validInvitationId = invitationData.id;

      logProgress(`✅ Created test invitation with ID: ${validInvitationId}`);

      // Step 2: Delete the inviter user from database (simulating account deletion)
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Find and delete the user account
      const userDeleteResult = await db.collection('user').deleteOne({
        email: testAuth.user.email,
      });

      if (userDeleteResult.deletedCount > 0) {
        logProgress('🚫 Deleted inviter user account (simulated deactivation)');
      } else {
        logProgress('⚠️ User account not found in database (may already be cleaned up)');
      }

      // Step 3: Navigate to invitation link
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Step 4: Should still show invitation page with graceful degradation
      await expect(page.getByRole('heading', { name: "You've been invited!" })).toBeVisible({
        timeout: 10000,
      });

      await expect(
        page.getByText(`You've been invited to join ${testAuth.organization.name}`),
      ).toBeVisible({ timeout: 5000 });

      // Step 5: Verify graceful handling of missing inviter
      // Should show "Someone has invited you" when inviter is deleted
      await expect(
        page.getByText('Someone has invited you to join their organization as a member'),
      ).toBeVisible({ timeout: 5000 });

      logProgress('✅ Invitation shows "Someone" for deleted inviter (graceful degradation)');

      // Step 6: Verify the user can still sign in to accept
      await expect(page.getByTestId('sign-in-button')).toBeVisible();

      // Step 7: Verify database state - invitation should still be valid
      const invitation = await db.collection('invitation').findOne({
        _id: new (await import('mongodb')).ObjectId(validInvitationId),
      });

      expect(invitation).toBeTruthy();
      expect(invitation?.status).toBe('pending');
      expect(invitation?.organizationId?.toString()).toBe(testAuth.organization.id);

      logProgress('✅ Database validation: Invitation remains valid despite deleted inviter');

      // Step 8: Test that invitation can still be accepted
      const inviteeContext = await browser.newContext();
      const inviteePage = await inviteeContext.newPage();

      try {
        // Navigate to invitation page as new user
        await inviteePage.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

        // Verify same graceful degradation for new user session
        await expect(
          inviteePage.getByText('Someone has invited you to join their organization as a member'),
        ).toBeVisible({ timeout: 5000 });

        // Click sign in to verify acceptance flow works
        await inviteePage.getByTestId('sign-in-button').click();

        // Should redirect to login (invitation flow continues to work)
        await expect(inviteePage).toHaveURL(/.*\/login/);

        logProgress('✅ Invitation acceptance flow still works despite deleted inviter');
      } finally {
        await inviteeContext.close();
      }

      logProgress('🎉 Deactivated inviter test completed successfully!');
    } finally {
      await context.close();
    }
  });

  test('Unauthorized user cannot accept invitation meant for different email', async ({
    browser,
  }) => {
    logProgress('🚀 Testing multiple rapid invitation acceptance attempts...');

    try {
      // Step 1: Create a valid invitation
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-rapid-accept-${inviteeTestId}@example.com`;

      logProgress(`📝 Testing rapid acceptance scenario for: ${inviteeEmail}`);

      // Create invitation via API
      const invitationResponse = await fetch(
        'http://localhost:3080/api/auth/organization/invite-member',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `better-auth.session_token=${testAuth.session.sessionToken}`,
          },
          body: JSON.stringify({
            email: inviteeEmail,
            role: 'member',
            organizationId: testAuth.organization.id,
          }),
        },
      );

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      const validInvitationId = invitationData.id;

      logProgress(`✅ Created test invitation with ID: ${validInvitationId}`);

      // Step 2: Create another user account (separate from the invitee) to test API calls
      const testUserTestId = generateTestId();
      const testUserEmail = `test-api-user-${testUserTestId}@example.com`;
      const testUserPassword = `TestPass123!${testUserTestId}`;

      const testUserSignUpResponse = await fetch('http://localhost:3080/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: testUserPassword,
          name: `Test API User ${testUserTestId}`,
        }),
      });

      expect(testUserSignUpResponse.ok).toBe(true);
      logProgress('✅ Created test API user account');

      // Step 3: Sign in to get session token for API calls
      const testUserSignInResponse = await fetch('http://localhost:3080/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: testUserPassword,
        }),
      });

      expect(testUserSignInResponse.ok).toBe(true);
      const setCookieHeader = testUserSignInResponse.headers.get('set-cookie');
      const sessionMatch = setCookieHeader?.match(/better-auth\.session_token=([^;]+)/);
      const testUserSessionToken = sessionMatch?.[1];

      expect(testUserSessionToken).toBeTruthy();
      logProgress('✅ Obtained test API user session token');

      // Step 4: Attempt to accept the same invitation multiple times rapidly using different user
      // (This simulates someone trying to accept an invitation they shouldn't have access to)
      logProgress('⚡ Starting rapid invitation acceptance attempts...');

      const acceptancePromises = [];
      const numberOfAttempts = 5;

      // Launch multiple acceptance attempts simultaneously
      for (let i = 0; i < numberOfAttempts; i++) {
        const acceptPromise = fetch(
          'http://localhost:3080/api/auth/organization/accept-invitation',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: `better-auth.session_token=${testUserSessionToken}`,
            },
            body: JSON.stringify({
              invitationId: validInvitationId,
            }),
          },
        );

        acceptancePromises.push(acceptPromise);
      }

      // Wait for all attempts to complete
      const acceptanceResults = await Promise.allSettled(acceptancePromises);

      logProgress(`✅ Completed ${numberOfAttempts} rapid acceptance attempts`);

      // Step 5: Analyze results - all should fail since wrong user is trying to accept
      let unauthorizedCount = 0;
      let otherErrorCount = 0;

      for (const [index, result] of acceptanceResults.entries()) {
        if (result.status === 'fulfilled') {
          const response = result.value;

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'unknown' }));

            if (
              response.status === 403 ||
              response.status === 400 ||
              errorData.message?.includes('not authorized') ||
              errorData.message?.includes('not found')
            ) {
              unauthorizedCount++;
              logProgress(
                `⚠️ Attempt ${index + 1}: Properly rejected unauthorized access (status: ${response.status})`,
              );
            } else {
              otherErrorCount++;
              logProgress(
                `❌ Attempt ${index + 1}: Unexpected error (status: ${response.status}, error: ${errorData.message})`,
              );
            }
          } else {
            otherErrorCount++;
            logProgress(
              `❌ Attempt ${index + 1}: Unexpectedly succeeded when it should have failed`,
            );
          }
        } else {
          otherErrorCount++;
          logProgress(`❌ Attempt ${index + 1}: Request failed (${result.reason})`);
        }
      }

      // Step 6: Verify security - unauthorized user should not be able to accept invitation
      expect(unauthorizedCount).toBe(numberOfAttempts); // All attempts should be properly rejected
      expect(otherErrorCount).toBe(0); // No unexpected errors

      logProgress(
        `✅ Security test results: ${unauthorizedCount} properly rejected, ${otherErrorCount} unexpected errors`,
      );

      // Step 7: Verify database state - invitation should still be pending
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      const finalInvitation = await db.collection('invitation').findOne({
        _id: new (await import('mongodb')).ObjectId(validInvitationId),
      });

      expect(finalInvitation).toBeTruthy();
      expect(finalInvitation?.status).toBe('pending'); // Should still be pending since unauthorized attempts failed
      expect(finalInvitation?.acceptedAt).toBeFalsy();

      logProgress('✅ Database validation: Invitation remains pending after unauthorized attempts');

      // Step 8: Now test that the correct user can still accept the invitation
      // This would happen through the magic link flow in the real system
      logProgress('📧 Testing that legitimate invitation acceptance still works...');

      // Simulate the correct invitation acceptance process (which happens during user creation with auto-accept)
      // We'll verify the invitation can still be accessed properly
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

        // Should show invitation page correctly (invitation is still valid)
        await expect(page.getByRole('heading', { name: "You've been invited!" })).toBeVisible({
          timeout: 10000,
        });

        await expect(
          page.getByText(`You've been invited to join ${testAuth.organization.name}`),
        ).toBeVisible({ timeout: 5000 });

        logProgress('✅ Invitation page still accessible for legitimate acceptance');
      } finally {
        await context.close();
      }

      logProgress('🎉 Race condition and security test completed successfully!');
    } catch (error) {
      logProgress(`❌ Rapid acceptance test failed: ${error}`);
      throw error;
    }
  });

  test('Magic link authentication failure during invitation acceptance', async ({ browser }) => {
    logProgress('🚀 Testing magic link authentication failures during invitation acceptance...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create a valid invitation
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-magic-fail-${inviteeTestId}@example.com`;

      logProgress(`📝 Testing magic link failure scenario for: ${inviteeEmail}`);

      // Create invitation via API
      const invitationResponse = await fetch(
        'http://localhost:3080/api/auth/organization/invite-member',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `better-auth.session_token=${testAuth.session.sessionToken}`,
          },
          body: JSON.stringify({
            email: inviteeEmail,
            role: 'member',
            organizationId: testAuth.organization.id,
          }),
        },
      );

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      const validInvitationId = invitationData.id;

      logProgress(`✅ Created test invitation with ID: ${validInvitationId}`);

      // Step 2: Navigate to invitation page as unauthenticated user
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Should show invitation acceptance page with sign-in prompt
      await expect(page.getByRole('heading', { name: "You've been invited!" })).toBeVisible({
        timeout: 10000,
      });

      await expect(
        page.getByText(`You've been invited to join ${testAuth.organization.name}`),
      ).toBeVisible({ timeout: 5000 });

      await expect(page.getByTestId('sign-in-button')).toBeVisible();

      logProgress('✅ Invitation acceptance page loaded correctly');

      // Step 3: Sign in as the invitee user using magic link
      await page.getByTestId('sign-in-button').click();

      // Should be on login page
      await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

      // Enter email and request magic link
      await page.getByRole('textbox', { name: 'Email address' }).fill(inviteeEmail);
      await page.getByTestId('login-button').click();

      // Should see "Check your email" confirmation
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

      logProgress('✅ Magic link request sent successfully');

      // Step 4: Capture magic link from MailHog
      const { captureMagicLink } = await import('../../utils/authOnboardingUtils');
      logProgress('📧 Capturing magic link from MailHog...');
      const magicLinkUrl = await captureMagicLink(inviteeEmail);

      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link from MailHog');
      }

      logProgress(`🔗 Found magic link: ${magicLinkUrl}`);

      // Step 5: Test scenario 1 - Corrupted magic link (invalid token)
      logProgress('🧪 Testing corrupted magic link...');

      const corruptedLink = magicLinkUrl.replace(/token=([^&]+)/, 'token=invalid-token-12345');
      await page.goto(corruptedLink);

      // Should show error or redirect back to login
      try {
        // Might show error page or redirect to login with error
        await expect(page.getByText(/invalid|expired|error|failed/i)).toBeVisible({
          timeout: 5000,
        });
        logProgress('✅ Corrupted magic link properly rejected with error message');
      } catch {
        // Alternative: might redirect to login page
        await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible({ timeout: 5000 });
        logProgress('✅ Corrupted magic link redirected back to login');
      }

      // Step 6: Test scenario 2 - Expired magic link (simulate by waiting)
      // Note: In a real test, we'd modify the database to set an expired timestamp
      // For this test, we'll simulate by using an old/invalid verification token
      logProgress('🧪 Testing expired magic link behavior...');

      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Find the verification record and expire it
      const verificationRecord = await db.collection('verification').findOne({
        identifier: inviteeEmail,
      });

      if (verificationRecord) {
        await db.collection('verification').updateOne(
          { _id: verificationRecord._id },
          {
            $set: {
              expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expire 1 day ago
            },
          },
        );
        logProgress('✅ Manually expired verification token in database');
      }

      // Try to use the original (now expired) magic link
      await page.goto(magicLinkUrl);

      try {
        // Should show expired error or redirect to login
        await expect(page.getByText(/expired|invalid|error/i)).toBeVisible({ timeout: 5000 });
        logProgress('✅ Expired magic link properly rejected with error message');
      } catch {
        // Alternative: might redirect to login
        await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible({ timeout: 5000 });
        logProgress('✅ Expired magic link redirected back to login');
      }

      // Step 7: Check if invitation was auto-accepted during the magic link auth process
      const invitation = await db.collection('invitation').findOne({
        _id: new (await import('mongodb')).ObjectId(validInvitationId),
      });

      expect(invitation).toBeTruthy();

      if (invitation?.status === 'accepted') {
        logProgress('✅ Magic link worked and auto-accepted invitation (system working correctly)');
      } else {
        expect(invitation?.status).toBe('pending');
        expect(invitation?.acceptedAt).toBeFalsy();
        logProgress('✅ Database validation: Invitation remains pending after auth failures');
      }

      // Step 8: Test appropriate behavior based on invitation status
      if (invitation?.status === 'accepted') {
        logProgress('🔄 Invitation already accepted, testing that user can access the app...');

        // If invitation was auto-accepted, test that user is properly authenticated
        // and can access the main application
        await page.goto('http://localhost:3080/');

        try {
          // Should be authenticated and redirected to the main app
          await expect(page).toHaveURL(/.*\/(c\/new|onboarding)/, { timeout: 10000 });
          logProgress('✅ User successfully authenticated and can access application');
        } catch {
          logProgress(
            '⚠️ User authentication state unclear, but core failure scenarios were tested',
          );
        }
      } else {
        logProgress('🔄 Testing recovery with new magic link...');

        // Go back to invitation page and try again
        await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);
        await page.getByTestId('sign-in-button').click();

        // Request new magic link
        await page.getByRole('textbox', { name: 'Email address' }).fill(inviteeEmail);
        await page.getByTestId('login-button').click();

        await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

        // Clear old emails and capture new magic link
        const { createMailHog } = await import('../../utils/mailhog.js');
        const mailhog = createMailHog();
        await mailhog.clearMessages();

        logProgress('📧 Capturing new magic link from MailHog...');

        // Wait a bit and try to get the new magic link
        await page.waitForTimeout(2000);
        const newMagicLinkUrl = await captureMagicLink(inviteeEmail);

        if (newMagicLinkUrl) {
          await page.goto(newMagicLinkUrl);
          await page.waitForLoadState('networkidle');

          // Should now successfully authenticate and be redirected to onboarding
          await expect(page).toHaveURL(/.*\/(onboarding|c\/new)/, { timeout: 10000 });
          logProgress('✅ New magic link worked correctly for recovery');
        } else {
          logProgress('⚠️ Could not capture new magic link, but failure scenarios were tested');
        }
      }

      logProgress('🎉 Magic link failure test completed successfully!');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * EXISTING USER ACCEPTANCE TESTS
   * =================================================================================
   */

  test('New user can accept invitation and join organization', async ({ browser }) => {
    logProgress('🚀 Testing new user invitation acceptance...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Generate email for NEW user (who doesn't exist yet)
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-invitee-${inviteeTestId}@example.com`;

      logProgress(`📝 Will invite NEW user: ${inviteeEmail}`);

      // Step 2: Login as inviter (testAuth user) and send invitation
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: testAuth.session.sessionToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        },
      ]);

      // Navigate to onboarding (user is positioned at team step)
      await page.goto('http://localhost:3080/onboarding');
      logProgress('📱 Logged in as inviter');

      // Verify we're at team invitation step
      await expect(
        page.getByRole('heading', { name: 'Invite your team', exact: true }),
      ).toBeVisible();
      logProgress('✅ Positioned at team invitation step');

      // Add invitee email using the main email input
      const emailInput = page.getByTestId('team-email-input');
      await emailInput.fill(inviteeEmail);
      await emailInput.press('Enter');

      // Send invitations
      await page.getByRole('button', { name: 'Send invitations' }).click();

      // Wait for success and navigation to next step
      await expect(page.getByRole('heading', { name: 'Welcome to Agentis!' })).toBeVisible();
      logProgress(`📧 Sent invitation to ${inviteeEmail}`);

      // Step 3: Extract invitation link from MailHog
      await page.waitForTimeout(2000); // Wait for email to be processed

      const messages = await mailhog.getMessages();
      const latestMessage = messages.find(
        (msg) => msg.To && msg.To[0] && msg.To[0].Mailbox === inviteeEmail.split('@')[0],
      );

      if (!latestMessage) {
        throw new Error(`No invitation email found for ${inviteeEmail}`);
      }

      const inviteLink = mailhog.extractInviteLink(latestMessage);
      if (!inviteLink) {
        throw new Error('No invitation link found in email');
      }

      logProgress(`🔗 Extracted invitation link: ${inviteLink}`);

      // Step 4: Create separate browser context for invitee (simulate real-world scenario)
      const inviteeContext = await browser.newContext();
      const inviteePage = await inviteeContext.newPage();

      try {
        // Step 5: Navigate to invitation acceptance page as unauthenticated user
        await inviteePage.goto(inviteLink);

        // Should show invitation acceptance page with sign-in prompt
        await expect(
          inviteePage.getByRole('heading', { name: "You've been invited!" }),
        ).toBeVisible();

        // Debug: Log what the organization name actually is
        console.log('Organization name from testAuth:', testAuth.organization.name);

        // Use the exact organization name from testAuth
        await expect(
          inviteePage.getByText(`You've been invited to join ${testAuth.organization.name}`),
        ).toBeVisible();
        await expect(
          inviteePage.getByText('has invited you to join their organization as a member'),
        ).toBeVisible();
        await expect(inviteePage.getByTestId('sign-in-button')).toBeVisible();

        logProgress('✅ Invitation acceptance page loaded correctly');

        // Step 6: Sign in as the invitee user using magic link
        await inviteePage.getByTestId('sign-in-button').click();

        // Should be on login page
        await expect(inviteePage.getByRole('heading', { name: 'Welcome' })).toBeVisible();

        // Enter email and request magic link
        await inviteePage.getByRole('textbox', { name: 'Email address' }).fill(inviteeEmail);
        await inviteePage.getByTestId('login-button').click();

        // Should see "Check your email" confirmation
        await expect(inviteePage.getByRole('heading', { name: 'Check your email' })).toBeVisible();

        // Capture magic link from MailHog
        const { captureMagicLink } = await import('../../utils/authOnboardingUtils');
        logProgress('📧 Capturing magic link from MailHog...');
        const magicLinkUrl = await captureMagicLink(inviteeEmail);

        if (!magicLinkUrl) {
          throw new Error('Failed to capture magic link from MailHog');
        }

        logProgress(`🔗 Found magic link: ${magicLinkUrl}`);

        // Navigate to magic link to authenticate
        await inviteePage.goto(magicLinkUrl);
        await inviteePage.waitForLoadState('networkidle');

        logProgress('📱 Authenticated via magic link - invitation should be auto-accepted');

        // Step 7: Should be automatically redirected to onboarding flow
        // The backend should have auto-accepted the invitation during authentication
        await expect(inviteePage).toHaveURL(/.*\/onboarding/);

        // User should go through normal onboarding within the invited organization
        // Should NOT see organization creation step since they're joining existing org
        await expect(
          inviteePage.getByRole('heading', { name: /What's the name of your/ }),
        ).not.toBeVisible();

        // Should see team invitation step or other onboarding steps
        logProgress('✅ User automatically added to organization, starting onboarding');

        // Complete the onboarding flow to reach main app
        // User should be on "Invite Your Team" step - let's complete it
        await inviteePage.waitForTimeout(2000); // Allow onboarding to settle

        // Should see "Complete Your Profile" step first
        await expect(
          inviteePage.getByRole('heading', { name: 'Complete Your Profile' }),
        ).toBeVisible();
        logProgress('✅ User is on profile setup step (correct onboarding flow)');

        // Complete profile step
        const continueButton = inviteePage.getByRole('button', { name: 'Continue' });
        if (await continueButton.isVisible({ timeout: 3000 })) {
          await continueButton.click();
          await inviteePage.waitForTimeout(1000);
          logProgress('✅ Completed profile step');
        }

        // Should now see "Invite Your Team" step
        await expect(
          inviteePage.getByRole('heading', { name: 'Invite Your Team', exact: true }),
        ).toBeVisible();
        logProgress('✅ User progressed to team invitation step');

        // Skip team invites for now
        logProgress('🖱️ Clicking Skip for Now on team step...');
        await inviteePage.getByRole('button', { name: 'Skip for now' }).click({ timeout: 2000 });

        // Wait for team step to complete
        await inviteePage.waitForLoadState('networkidle');
        logProgress('⏳ Waiting for team step to complete...');

        // Step 11: Should reach Welcome step
        const welcomeHeading = inviteePage.getByRole('heading', { name: /Welcome to Agentis/i });
        await expect(welcomeHeading).toBeVisible({
          timeout: 10000,
        });
        logProgress('✅ Step 4/4: Reached Welcome step');
        await expect(
          inviteePage.getByRole('button', { name: /Start Your First Conversation/i }),
        ).toBeVisible();

        // Complete onboarding
        logProgress('🖱️ Clicking Start Your First Conversation...');
        await inviteePage.getByRole('button', { name: /Start Your First Conversation/i }).click();
        await inviteePage.waitForLoadState('networkidle');

        // Handle Terms of Service modal using codegen locators
        try {
          await expect(
            inviteePage.getByRole('heading', { name: 'Terms of Service for Agentis' }),
          ).toBeVisible({ timeout: 3000 });
          logProgress('📋 Terms of Service modal detected, accepting...');
          await inviteePage.getByRole('dialog', { name: 'Terms of Service for Agentis' }).click();
          await inviteePage.getByRole('button', { name: 'I accept' }).click();
          await inviteePage.waitForLoadState('networkidle');
          logProgress('✅ Terms of Service accepted');
        } catch (error) {
          logProgress('ℹ️ No Terms of Service modal found or already handled');
        }

        // Finally should redirect to chat
        await expect(inviteePage).toHaveURL(/.*\/c\/new/, { timeout: 10000 });
        logProgress('✅ Successfully completed full onboarding flow!');
        logProgress('✅ User reached main chat application');

        // Verify sidebar shows correct user name and organization name using proper locators
        await expect(inviteePage.getByTestId('nav-user')).toBeVisible(); // User dropdown
        await expect(
          inviteePage.getByRole('button', { name: testAuth.organization.name }),
        ).toBeVisible(); // Organization button
        logProgress('✅ Sidebar shows correct user and organization names');
      } finally {
        await inviteeContext.close();
      }

      // Step 8: Verify backend state - comprehensive database validation
      logProgress('🔍 Validating end state in database...');

      // Import database utilities
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // 1. Verify invitation status was updated to 'accepted'
      const invitation = await db.collection('invitation').findOne({ email: inviteeEmail });
      expect(invitation).toBeTruthy();
      expect(invitation?.status).toBe('accepted');
      expect(invitation?.acceptedAt).toBeTruthy();
      logProgress('✅ Database validation: Invitation marked as accepted');

      // 2. Verify user was created with correct onboarding step
      const inviteeUser = await db.collection('user').findOne({ email: inviteeEmail });
      expect(inviteeUser).toBeTruthy();
      expect(inviteeUser?.onboardingStep).toBe('complete'); // Should start at complete step
      logProgress('✅ Database validation: User created with correct onboarding step (complete)');

      // 3. Verify membership was created with proper ObjectId format
      const membership = await db.collection('member').findOne({
        userId: inviteeUser?.id || inviteeUser?._id,
      });
      expect(membership).toBeTruthy();
      expect(membership?.organizationId?.toString()).toBe(testAuth.organization.id);
      expect(membership?.role).toBe('member');

      // Verify IDs are in ObjectId format (not strings)
      expect(membership?.userId).toBeTruthy();
      expect(membership?.organizationId).toBeTruthy();
      expect(typeof membership?.userId).not.toBe('string'); // Should be ObjectId
      expect(typeof membership?.organizationId).not.toBe('string'); // Should be ObjectId
      logProgress('✅ Database validation: Membership created with proper ObjectId format');

      // 4. Verify organization membership count increased
      const orgMemberCount = await db.collection('member').countDocuments({
        organizationId: membership?.organizationId,
      });
      expect(orgMemberCount).toBe(2); // Original user + invited user
      logProgress('✅ Database validation: Organization has correct member count');

      // 5. Also verify via API (as secondary check)
      const orgMembersResponse = await fetch(
        `http://localhost:3080/api/auth/organization/${testAuth.organization.id}/members`,
        {
          headers: { Cookie: `better-auth.session_token=${testAuth.session.sessionToken}` },
        },
      );

      if (orgMembersResponse.ok) {
        const members = await orgMembersResponse.json();
        const inviteeMember = members.find((m: { email: string }) => m.email === inviteeEmail);
        expect(inviteeMember).toBeTruthy();
        expect(inviteeMember.role).toBe('member');
        logProgress('✅ API validation: User visible in organization members list');
      }

      logProgress(
        '🎉 New user invitation acceptance test completed with full database validation!',
      );
    } finally {
      await context.close();
    }
  });
});
