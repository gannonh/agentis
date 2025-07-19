import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import { TEST_VIEWPORT, cleanDatabase } from '../../utils/authOnboardingUtils';
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
    await cleanDatabase();
  });

  /**
   * =================================================================================
   * INVITATION LINK EXTRACTION AND VALIDATION TESTS
   * =================================================================================
   */

  test.skip('Should extract invitation acceptance link from email', async ({ browser }) => {
    logProgress('🚀 Testing invitation link extraction from MailHog email...');
    // TODO Issue #122: Extract invitation link from email body
    // - Send invitation email
    // - Extract invitation link from MailHog
    // - Validate link format and token
  });

  test.skip('Should validate invitation token before showing acceptance page', async ({ browser }) => {
    logProgress('🚀 Testing invitation token validation...');
    // TODO Issue #122: Test invitation token validation
    // - Generate test invitation with token
    // - Visit acceptance URL with valid token
    // - Verify acceptance page loads correctly
    // - Test with invalid/expired tokens
  });

  /**
   * =================================================================================
   * EXISTING USER ACCEPTANCE TESTS
   * =================================================================================
   */

  test('Existing user can accept invitation and join organization', async ({ browser }) => {
    logProgress('🚀 Testing existing user invitation acceptance...');
    
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Create a second user (invitee) not in organization
      const inviteeTestId = generateTestId();
      const inviteeEmail = `test-invitee-${inviteeTestId}@example.com`;
      const inviteePassword = `TestPass123!${inviteeTestId}`;
      
      logProgress(`📝 Creating invitee user: ${inviteeEmail}`);
      const signUpResponse = await fetch('http://localhost:3080/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteeEmail,
          password: inviteePassword,
          name: `Test Invitee ${inviteeTestId}`,
        }),
      });
      
      if (!signUpResponse.ok) {
        throw new Error(`Failed to create invitee user: ${await signUpResponse.text()}`);
      }
      
      logProgress(`✅ Created invitee user: ${inviteeEmail}`);

      // Step 2: Login as inviter (testAuth user) and send invitation
      await context.addCookies([{
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      }]);

      // Navigate to onboarding (user is positioned at team step)
      await page.goto('http://localhost:3080/onboarding');
      logProgress('📱 Logged in as inviter');
      
      // Verify we're at team invitation step
      await expect(page.getByRole('heading', { name: 'Invite your team', exact: true })).toBeVisible();
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
      const latestMessage = messages.find(msg => 
        msg.To && msg.To[0] && msg.To[0].Mailbox === inviteeEmail.split('@')[0]
      );
      
      if (!latestMessage) {
        throw new Error(`No invitation email found for ${inviteeEmail}`);
      }

      const inviteLink = mailhog.extractInviteLink(latestMessage);
      if (!inviteLink) {
        throw new Error('No invitation link found in email');
      }
      
      logProgress(`🔗 Extracted invitation link: ${inviteLink}`);

      // Step 4: Navigate to invitation acceptance page 
      await page.goto(inviteLink);
      
      // Should show invitation acceptance page
      await expect(page.getByRole('heading', { name: 'You\'ve been invited!' })).toBeVisible();
      await expect(page.getByText(`Join ${testAuth.organization.name}`)).toBeVisible();
      await expect(page.getByTestId('accept-invitation-button')).toBeVisible();
      await expect(page.getByTestId('decline-invitation-button')).toBeVisible();
      
      logProgress('✅ Invitation acceptance page loaded correctly');

      // Step 5: Sign in as invitee
      await page.getByTestId('sign-in-button').click();
      
      await page.getByTestId('email-input').fill(inviteeEmail);
      await page.getByTestId('password-input').fill(inviteePassword);
      await page.getByTestId('login-button').click();
      
      logProgress(`🔐 Signed in as invitee: ${inviteeEmail}`);

      // Step 6: Accept invitation
      await expect(page.getByTestId('accept-invitation-button')).toBeVisible();
      await page.getByTestId('accept-invitation-button').click();
      
      // Wait for acceptance confirmation
      await expect(page.getByText('Successfully joined the organization!')).toBeVisible();
      logProgress('✅ Invitation accepted successfully');

      // Step 7: Verify user redirected to main app
      await expect(page).toHaveURL(/.*\/c\/new/);
      
      // Verify user is in organization context
      await expect(page.getByTestId('organization-selector')).toContainText(testAuth.organization.name);
      
      logProgress('✅ User redirected to main app and joined organization');

      // Step 8: Verify backend state - user should be member of organization
      const orgMembersResponse = await fetch(
        `http://localhost:3080/api/auth/organization/${testAuth.organization.id}/members`,
        {
          headers: { Cookie: `better-auth.session_token=${testAuth.session.sessionToken}` }
        }
      );
      
      if (orgMembersResponse.ok) {
        const members = await orgMembersResponse.json();
        const inviteeMember = members.find(m => m.email === inviteeEmail);
        expect(inviteeMember).toBeTruthy();
        expect(inviteeMember.role).toBe('member');
        logProgress('✅ Backend verification: User is member of organization');
      }

      logProgress('🎉 Existing user invitation acceptance test completed successfully!');
      
    } finally {
      await context.close();
    }
  });

  test.skip('Existing user can decline invitation', async ({ browser }) => {
    logProgress('🚀 Testing existing user invitation decline...');
    // TODO Issue #122: Test invitation decline flow
    // - Create existing user
    // - Send invitation
    // - Navigate to acceptance page
    // - Sign in and decline invitation
    // - Verify invitation marked as declined
    // - Verify user not added to organization
  });

  /**
   * =================================================================================
   * NEW USER REGISTRATION AND ACCEPTANCE TESTS
   * =================================================================================
   */

  test.skip('New user can register and accept invitation in single flow', async ({ browser }) => {
    logProgress('🚀 Testing new user registration + acceptance flow...');
    // TODO Issue #122: Test new user signup + acceptance
    // - Send invitation to non-existent email
    // - Extract invitation link
    // - Navigate to acceptance page
    // - Complete sign-up form
    // - Automatically accept invitation after registration
    // - Verify user created and added to organization
    // - Verify proper role assignment
    // - Test onboarding flow integration
  });

  test.skip('New user registration validates invitation before account creation', async ({ browser }) => {
    logProgress('🚀 Testing invitation validation during new user signup...');
    // TODO Issue #122: Test invitation validation during signup
    // - Generate expired invitation token
    // - Navigate to acceptance page
    // - Verify expired invitation error before signup form
    // - Test with invalid token
    // - Test with already-accepted invitation
  });

  /**
   * =================================================================================
   * ROLE ASSIGNMENT AND ORGANIZATION MEMBERSHIP TESTS
   * =================================================================================
   */

  test.skip('User accepts invitation and receives correct role (member)', async ({ browser }) => {
    logProgress('🚀 Testing member role assignment after acceptance...');
    // TODO Issue #122: Test member role assignment
    // - Send invitation with 'member' role
    // - Complete acceptance flow
    // - Verify user has member privileges in organization
    // - Test organization permissions and access
  });

  test.skip('User accepts invitation and receives correct role (admin)', async ({ browser }) => {
    logProgress('🚀 Testing admin role assignment after acceptance...');
    // TODO Issue #122: Test admin role assignment
    // - Send invitation with 'admin' role
    // - Complete acceptance flow
    // - Verify user has admin privileges in organization
    // - Test admin-specific functionality access
  });

  /**
   * =================================================================================
   * ERROR HANDLING AND EDGE CASES
   * =================================================================================
   */

  test.skip('Shows appropriate error for expired invitation', async ({ browser }) => {
    logProgress('🚀 Testing expired invitation error handling...');
    // TODO Issue #122: Test expired invitation handling
    // - Create invitation with past expiration date
    // - Navigate to acceptance page
    // - Verify appropriate error message
    // - Ensure no organization access granted
  });

  test.skip('Shows appropriate error for already-accepted invitation', async ({ browser }) => {
    logProgress('🚀 Testing already-accepted invitation error...');
    // TODO Issue #122: Test duplicate acceptance prevention
    // - Accept invitation successfully
    // - Try to use same invitation link again
    // - Verify appropriate error message
    // - Ensure no duplicate organization membership
  });

  test.skip('Shows appropriate error for invalid invitation token', async ({ browser }) => {
    logProgress('🚀 Testing invalid invitation token error...');
    // TODO Issue #122: Test invalid token handling
    // - Generate invalid/malformed invitation token
    // - Navigate to acceptance page
    // - Verify appropriate error message
    // - Test with completely random tokens
  });

  test.skip('Shows appropriate error for deleted organization invitation', async ({ browser }) => {
    logProgress('🚀 Testing invitation for deleted organization...');
    // TODO Issue #122: Test orphaned invitation handling
    // - Send invitation
    // - Delete organization
    // - Try to accept invitation
    // - Verify appropriate error message
  });

  /**
   * =================================================================================
   * INVITATION STATUS TRACKING TESTS
   * =================================================================================
   */

  test.skip('Invitation status updates correctly through acceptance flow', async ({ browser }) => {
    logProgress('🚀 Testing invitation status tracking...');
    // TODO Issue #122: Test invitation status lifecycle
    // - Verify initial status is 'pending'
    // - Accept invitation
    // - Verify status updates to 'accepted'
    // - Verify acceptance timestamp recorded
    // - Test status in organization member list
  });

  test.skip('Invitation status updates correctly when declined', async ({ browser }) => {
    logProgress('🚀 Testing invitation decline status tracking...');
    // TODO Issue #122: Test decline status tracking
    // - Send invitation
    // - Decline invitation
    // - Verify status updates to 'declined'
    // - Verify decline timestamp recorded
    // - Ensure user not in organization
  });

  /**
   * =================================================================================
   * SECURITY AND TOKEN VALIDATION TESTS
   * =================================================================================
   */

  test.skip('Invitation tokens are cryptographically secure', async ({ browser }) => {
    logProgress('🚀 Testing invitation token security...');
    // TODO Issue #122: Test token security
    // - Generate multiple invitation tokens
    // - Verify tokens are sufficiently random
    // - Verify tokens cannot be predicted/guessed
    // - Test token length and character set
  });

  test.skip('Invitation tokens have appropriate expiration times', async ({ browser }) => {
    logProgress('🚀 Testing invitation token expiration...');
    // TODO Issue #122: Test token expiration
    // - Verify default expiration time (7-14 days)
    // - Test token becomes invalid after expiration
    // - Verify grace period handling if applicable
  });

  test.skip('Rate limiting prevents invitation token abuse', async ({ browser }) => {
    logProgress('🚀 Testing invitation token rate limiting...');
    // TODO Issue #122: Test rate limiting
    // - Attempt multiple rapid token validations
    // - Verify rate limiting kicks in
    // - Test different rate limiting scenarios
  });

  /**
   * =================================================================================
   * INTEGRATION WITH EXISTING FLOWS TESTS
   * =================================================================================
   */

  test.skip('Invitation acceptance integrates with existing auth flow', async ({ browser }) => {
    logProgress('🚀 Testing auth flow integration...');
    // TODO Issue #122: Test Better Auth integration
    // - Accept invitation as existing user
    // - Verify session management works correctly
    // - Test with existing session vs. new session
    // - Verify organization switching functionality
  });

  test.skip('Invitation acceptance integrates with onboarding flow', async ({ browser }) => {
    logProgress('🚀 Testing onboarding flow integration...');
    // TODO Issue #122: Test onboarding integration
    // - Accept invitation as new user
    // - Verify proper onboarding sequence
    // - Test profile setup with pre-filled organization
    // - Verify skip/completion of relevant onboarding steps
  });

  test.skip('Multiple pending invitations handled correctly', async ({ browser }) => {
    logProgress('🚀 Testing multiple invitation handling...');
    // TODO Issue #122: Test multiple invitations
    // - Send invitations to same user from different organizations
    // - Accept one invitation
    // - Verify other invitations remain valid
    // - Test organization switching between accepted invitations
  });
});