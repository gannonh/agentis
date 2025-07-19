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

// MailHog message types
interface MailHogAddress {
  Mailbox: string;
  Domain: string;
}

interface MailHogContent {
  Body: string;
}

interface MailHogMessage {
  To?: MailHogAddress[];
  Content?: MailHogContent;
}

test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

test.describe('Team Invitation Flow Tests', () => {
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

    // Create a test user at the team invitation step
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
   * TEAM INVITATION EMAIL SENDING TEST
   * =================================================================================
   */

  test('User can send team invitations and emails are received in MailHog', async ({ browser }) => {
    logProgress('🚀 Testing team invitation email sending with MailHog validation...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      // Step 1: Navigate to onboarding flow
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Step 2: Verify team invitation step is displayed
      await expect(
        page.getByRole('heading', { name: 'Invite your team', exact: true }),
      ).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Invite by email')).toBeVisible();
      logProgress('✅ Team invitation step displayed correctly');

      // Step 3: Add first team member invitation
      const testEmail1 = `colleague1-${testId}@example.com`;
      const emailInput = page.getByTestId('team-email-input');
      await emailInput.fill(testEmail1, { timeout: 5000 });
      await expect(emailInput).toHaveValue(testEmail1);
      logProgress(`✅ Filled first email: ${testEmail1}`);

      // Press Enter to add first email to the list (keyboard interaction)
      await emailInput.press('Enter');
      logProgress(`✅ Pressed Enter to add email`);

      // Wait a moment for the UI to update
      await page.waitForTimeout(1000);

      // Check if invitation list appeared
      const invitationsList = page.getByText('Team invitations');
      const hasInvitationsList = await invitationsList.isVisible();
      logProgress(`🔍 Team invitations list visible: ${hasInvitationsList}`);

      // Verify first email was added to invitation list and input was cleared
      await expect(page.getByText(testEmail1)).toBeVisible({ timeout: 5000 });
      await expect(emailInput).toHaveValue(''); // Input should be cleared
      logProgress(`✅ Added first email to invitation list: ${testEmail1}`);

      // Step 4: Add second team member invitation
      const testEmail2 = `colleague2-${testId}@example.com`;
      await emailInput.fill(testEmail2, { timeout: 5000 });
      await expect(emailInput).toHaveValue(testEmail2);
      logProgress(`✅ Filled second email: ${testEmail2}`);

      // Press Enter to add second email to the list
      await emailInput.press('Enter');
      logProgress(`✅ Pressed Enter to add second email`);

      // Wait a moment for the UI to update
      await page.waitForTimeout(1000);

      // Verify second email was added to invitation list and input was cleared
      await expect(page.getByText(testEmail2)).toBeVisible({ timeout: 5000 });
      await expect(emailInput).toHaveValue(''); // Input should be cleared again
      logProgress(`✅ Added second email to invitation list: ${testEmail2}`);

      // Step 5: Send invitations
      await page.getByRole('button', { name: 'Send invitations' }).click({ timeout: 5000 });
      logProgress('📤 Clicked Send invitations button');

      // Step 6: Wait for invitations to be processed
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000); // Give time for emails to be sent

      // Step 7: Verify exactly 2 emails were sent to MailHog
      const finalEmailCount = await mailhog.getMessageCount();
      logProgress(`📧 Final MailHog email count: ${finalEmailCount}`);

      expect(finalEmailCount).toBe(2); // Exactly 2 emails should be sent
      logProgress('✅ Confirmed exactly 2 emails were sent to MailHog');

      // Step 8: Verify specific invitation emails
      const email1Message = await mailhog.getLatestMessage(testEmail1, 10000);
      expect(email1Message).toBeTruthy();
      expect((email1Message as MailHogMessage)?.To?.some((to: MailHogAddress) => `${to.Mailbox}@${to.Domain}` === testEmail1)).toBe(
        true,
      );
      logProgress(`✅ Confirmed invitation email sent to ${testEmail1}`);

      const email2Message = await mailhog.getLatestMessage(testEmail2, 10000);
      expect(email2Message).toBeTruthy();
      expect((email2Message as MailHogMessage)?.To?.some((to: MailHogAddress) => `${to.Mailbox}@${to.Domain}` === testEmail2)).toBe(
        true,
      );
      logProgress(`✅ Confirmed invitation email sent to ${testEmail2}`);

      // Step 9: Verify email content contains invitation
      if ((email1Message as MailHogMessage)?.Content?.Body) {
        const emailBody = (email1Message as MailHogMessage).Content!.Body.toLowerCase();

        // Check for basic invitation email content
        const hasInvitationContent =
          emailBody.includes('join') ||
          emailBody.includes('team') ||
          emailBody.includes('invite') ||
          emailBody.includes('organization');

        expect(hasInvitationContent).toBe(true);
        logProgress('✅ Email content contains invitation keywords');
      }

      // Step 10: Verify progression to welcome step
      await page
        .getByRole('button', { name: 'Start Your First Conversation' })
        .click({ timeout: 5000 });
      logProgress('✅ Clicked Start Your First Conversation');
      //await page.pause();
      // Verify progression to next step
      await expect(page).toHaveURL(/.*\/(welcome|c\/new).*/);
      logProgress('✅ Team invitation email flow completed successfully');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * SKIP FUNCTIONALITY TEST
   * =================================================================================
   */

  test('User can skip team invitation step', async ({ browser }) => {
    logProgress('🚀 Testing skip functionality in team invitation flow...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      // Navigate to onboarding
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Verify team invitation step
      await expect(
        page.getByRole('heading', { name: 'Invite your team', exact: true }),
      ).toBeVisible({
        timeout: 10000,
      });

      // Click skip button
      await page.getByRole('button', { name: 'Skip for now' }).click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Give time to ensure no emails are sent

      // Verify no emails were sent when skipping
      const finalEmailCount = await mailhog.getMessageCount();
      expect(finalEmailCount).toBe(0); // Should remain 0 when skipping
      logProgress('✅ Confirmed no emails sent when skipping');
      await page
        .getByRole('button', { name: 'Start Your First Conversation' })
        .click({ timeout: 5000 });
      logProgress('✅ Clicked Start Your First Conversation');
      //await page.pause();
      // Verify progression to next step
      await expect(page).toHaveURL(/.*\/(welcome|c\/new).*/);
      logProgress('✅ Successfully landed on chat');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * BULK INVITATION TEST WITH EMAIL VALIDATION
   * =================================================================================
   */

  test('User can send bulk invitations via email', async ({ browser }) => {
    logProgress('🚀 Testing bulk invitation email sending functionality...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      // Navigate to team invitation step
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Verify team invitation step
      await expect(
        page.getByRole('heading', { name: 'Invite your team', exact: true }),
      ).toBeVisible({
        timeout: 10000,
      });

      // Test bulk add functionality
      const testEmails = [
        `bulk1-${testId}@example.com`,
        `bulk2-${testId}@example.com`,
        `bulk3-${testId}@example.com`,
      ];

      // Click bulk add button
      await page.getByRole('button', { name: 'Bulk add' }).click();

      // Fill bulk emails textarea
      const bulkTextarea = page.locator('textarea');
      await expect(bulkTextarea).toBeVisible();
      await bulkTextarea.fill(testEmails.join(','));

      // Click "Add emails" button
      await page.getByRole('button', { name: 'Add emails' }).click();
      await page.waitForTimeout(1000);

      // Verify all emails were added to the list
      for (let i = 0; i < testEmails.length; i++) {
        await expect(page.getByText(testEmails[i])).toBeVisible();
      }
      logProgress(`✅ Added ${testEmails.length} bulk email addresses`);

      // Send invitations
      await page.getByRole('button', { name: 'Send invitations' }).click({ timeout: 5000 });
      logProgress('📤 Clicked Send invitations button for bulk emails');

      // Wait for invitations to be processed
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(4000); // Give extra time for bulk processing

      // Verify exactly 3 emails were sent to MailHog
      const finalEmailCount = await mailhog.getMessageCount();
      logProgress(`📧 Final MailHog email count: ${finalEmailCount}`);

      expect(finalEmailCount).toBe(testEmails.length); // Exactly 3 emails should be sent
      logProgress('✅ Confirmed exactly 3 bulk emails were sent to MailHog');

      // Verify each individual email was sent
      for (const email of testEmails) {
        const message = await mailhog.getLatestMessage(email, 5000);
        expect(message).toBeTruthy();
        logProgress(`✅ Confirmed bulk invitation sent to ${email}`);
      }

      logProgress('✅ Bulk invitation email functionality working correctly');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * ERROR HANDLING TEST WITH EMAIL VALIDATION
   * =================================================================================
   */

  test('Team invitation handles errors gracefully without sending emails', async ({ browser }) => {
    logProgress('🚀 Testing error handling in team invitation flow...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      // Navigate to team invitation step
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Verify team invitation step
      await expect(
        page.getByRole('heading', { name: 'Invite your team', exact: true }),
      ).toBeVisible({
        timeout: 10000,
      });

      // Test duplicate email detection
      const duplicateEmail = `duplicate-${testId}@example.com`;
      const emailInput = page.getByTestId('team-email-input');
      await emailInput.fill(duplicateEmail);

      // Press Enter to add first email to the list
      await emailInput.press('Enter');
      await page.waitForTimeout(1000);

      // Verify first email was added
      await expect(page.getByText(duplicateEmail)).toBeVisible({ timeout: 5000 });
      await expect(emailInput).toHaveValue(''); // Input should be cleared
      logProgress('✅ Added first email to list');

      // Try to add the same email again - should show duplicate error
      await emailInput.fill(duplicateEmail, { timeout: 5000 });
      await emailInput.press('Enter');

      // Should show duplicate error
      await expect(page.getByText(/This email has already been added/i)).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ Duplicate email detection working');

      // Verify no emails sent due to validation error
      await page.waitForTimeout(2000);
      const emailCountAfterDuplicate = await mailhog.getMessageCount();
      expect(emailCountAfterDuplicate).toBe(0); // Should remain 0 due to validation error
      logProgress('✅ No emails sent when duplicate detected');

      // Test empty email handling
      await emailInput.fill('', { timeout: 5000 });
      await emailInput.press('Enter');
      await expect(page.getByText(/Please enter an email address/i)).toBeVisible({ timeout: 5000 });
      logProgress('✅ Empty email validation working');

      // Test invalid email format
      await emailInput.fill('invalid-email-format', { timeout: 5000 });
      await emailInput.press('Enter');
      await expect(page.getByText(/Please enter a valid email address/i)).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ Invalid email format validation working');

      // Verify still no emails sent due to validation errors
      const finalEmailCount = await mailhog.getMessageCount();
      expect(finalEmailCount).toBe(0); // Should remain 0 during validation errors
      logProgress('✅ Confirmed no emails sent during error testing');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * LARGE BATCH INVITATION TEST (EDGE CASE)
   * =================================================================================
   */

  test('Team invitation handles large batch of invitations (50+)', async ({ browser }) => {
    logProgress('🚀 Testing large batch invitation functionality...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      // Navigate to team invitation step
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Verify team invitation step
      await expect(
        page.getByRole('heading', { name: 'Invite your team', exact: true }),
      ).toBeVisible({
        timeout: 10000,
      });

      // Create 50 test emails for large batch test
      const largeTestEmails = Array.from({ length: 50 }, (_, i) => 
        `bulk${i + 1}-${testId}@example.com`
      );

      // Click bulk add button
      await page.getByRole('button', { name: 'Bulk add' }).click();

      // Fill bulk emails textarea with 50 emails
      const bulkTextarea = page.locator('textarea');
      await expect(bulkTextarea).toBeVisible();
      await bulkTextarea.fill(largeTestEmails.join(','));

      // Click "Add emails" button
      await page.getByRole('button', { name: 'Add emails' }).click();
      await page.waitForTimeout(2000); // Give UI time to render all items

      // Verify UI displays all 50 emails
      logProgress('🔍 Verifying UI can display 50 email entries...');
      
      // Check first and last email are visible
      await expect(page.getByText(largeTestEmails[0])).toBeVisible();
      await expect(page.getByText(largeTestEmails[49])).toBeVisible();
      
      // Verify invitation summary shows correct count
      await expect(page.getByText('Ready to send 50 invitations')).toBeVisible();
      logProgress('✅ UI successfully handles 50 email entries');

      // Send invitations
      await page.getByRole('button', { name: 'Send invitations' }).click({ timeout: 5000 });
      logProgress('📤 Clicked Send invitations button for 50 emails');

      // Wait for invitations to be processed (longer timeout for large batch)
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(10000); // Give extra time for bulk processing

      // Verify all 50 emails were sent to MailHog
      const finalEmailCount = await mailhog.getMessageCount();
      logProgress(`📧 Final MailHog email count: ${finalEmailCount}`);

      expect(finalEmailCount).toBe(50); // All 50 emails should be sent
      logProgress('✅ Confirmed all 50 emails were sent successfully');

      // Spot check a few random emails were sent
      const spotCheckIndices = [0, 24, 49]; // First, middle, last
      for (const index of spotCheckIndices) {
        const message = await mailhog.getLatestMessage(largeTestEmails[index], 5000);
        expect(message).toBeTruthy();
        logProgress(`✅ Spot check: Confirmed email sent to ${largeTestEmails[index]}`);
      }

      logProgress('✅ Large batch invitation functionality working correctly for 50+ invitations');
    } finally {
      await context.close();
    }
  });
});
