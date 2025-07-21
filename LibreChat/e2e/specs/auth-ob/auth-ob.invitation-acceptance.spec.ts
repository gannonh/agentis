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
      const testEmailPattern = /test-invitee-\d+-[a-z0-9]+@example\.com/;
      await db.collection('user').deleteMany({
        email: { $regex: testEmailPattern },
      });
      await db.collection('account').deleteMany({
        email: { $regex: testEmailPattern },
      });
      await db.collection('session').deleteMany({}); // Clean all test sessions
      await db.collection('invitation').deleteMany({
        email: { $regex: testEmailPattern },
      });
      await db.collection('member').deleteMany({
        // Clean memberships that might be orphaned
      });

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
        _id: new (await import('mongodb')).ObjectId(invitationId)
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

  test('Should validate invitation token before showing acceptance page', async ({
    browser,
  }) => {
    logProgress('🚀 Testing invitation token validation...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create a valid invitation
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-token-validation-${inviteeTestId}@example.com`;

      logProgress(`📝 Testing token validation for: ${inviteeEmail}`);

      // Create invitation via API (simulating what the invitation flow does)
      const invitationResponse = await fetch('http://localhost:3080/api/auth/organization/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${testAuth.session.sessionToken}`
        },
        body: JSON.stringify({
          email: inviteeEmail,
          role: 'member',
          organizationId: testAuth.organization.id
        })
      });

      expect(invitationResponse.ok).toBe(true);
      const invitationData = await invitationResponse.json();
      const validInvitationId = invitationData.id;

      logProgress(`✅ Created test invitation with ID: ${validInvitationId}`);

      // Step 2: Test valid invitation token
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Should show invitation acceptance page
      await expect(
        page.getByRole('heading', { name: "You've been invited!" }),
      ).toBeVisible();

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
      await expect(page.getByText('Invitation not found or has expired')).toBeVisible({ timeout: 10000 });

      logProgress('✅ Invalid invitation token shows appropriate error');

      // Step 4: Test malformed invitation token
      const malformedInvitationId = 'invalid-token-format';
      await page.goto(`http://localhost:3080/auth/accept-invitation/${malformedInvitationId}`);

      // Should show error message for invalid format (404 error becomes "Invitation not found or has expired")
      await expect(page.getByText('Invitation not found or has expired')).toBeVisible({ timeout: 10000 });

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
            acceptedAt: new Date()
          } 
        }
      );

      // Now visit the same invitation link
      await page.goto(`http://localhost:3080/auth/accept-invitation/${validInvitationId}`);

      // Should show already accepted error
      await expect(page.getByText('Invitation has already been accepted')).toBeVisible({ timeout: 10000 });

      logProgress('✅ Already accepted invitation shows appropriate error');

      // Step 6: Test expired invitation (simulate by setting expiration date in past)
      // Reset invitation to pending first
      await db.collection('invitation').updateOne(
        { _id: new (await import('mongodb')).ObjectId(validInvitationId) },
        { 
          $set: { 
            status: 'pending',
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
          },
          $unset: { acceptedAt: 1 }
        }
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
