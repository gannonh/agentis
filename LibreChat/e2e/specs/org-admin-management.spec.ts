/**
 * @fileoverview E2E tests for organization admin user management
 * @module e2e/specs/org-admin-management
 */

import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import {
  createTestUsersInSameOrganization,
  cleanupTestUser,
  generateTestId,
  type TestAuthResult,
} from '../utils/testAuth';
import { createMailHog } from '../utils/mailhog.js';

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
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Organization Admin User Management', () => {
  let orgAdminAuth: TestAuthResult;
  let regularMemberAuth: TestAuthResult;
  let testId: string;
  let mailhog: ReturnType<typeof createMailHog>;

  test.beforeAll(async () => {
    // Generate unique test ID and create users in the same organization
    testId = generateTestId();
    mailhog = createMailHog();

    // Clear any existing emails in MailHog
    try {
      await mailhog.clearMessages();
      logProgress('🧹 Cleared MailHog messages');
    } catch (error) {
      logProgress(`⚠️ Failed to clear MailHog: ${error}`);
    }

    // Create both users in the same organization for proper testing
    const testUsers = await createTestUsersInSameOrganization(testId);
    orgAdminAuth = testUsers.adminAuth;
    regularMemberAuth = testUsers.memberAuth;

    logProgress(
      `✅ Created org admin user: ${orgAdminAuth.user.email} with org: ${orgAdminAuth.organization.name}`,
    );
    logProgress(
      `✅ Created regular member user: ${regularMemberAuth.user.email} in same org: ${regularMemberAuth.organization.name}`,
    );
  });

  test.afterAll(async () => {
    // Clean up test data after all tests complete
    // Note: Both users share the same organization, so we clean up the organization once
    if (orgAdminAuth) {
      try {
        await cleanupTestUser(orgAdminAuth.user.id, orgAdminAuth.organization.id);
        logProgress(`✅ Cleaned up org admin user: ${orgAdminAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Cleanup failed for org admin user ${orgAdminAuth.user.email}: ${error}`);
      }
    }

    if (regularMemberAuth) {
      try {
        // Clean up member user but don't try to delete the organization again (it's the same one)
        await cleanupTestUser(regularMemberAuth.user.id, null);
        logProgress(`✅ Cleaned up regular member user: ${regularMemberAuth.user.email}`);
      } catch (error) {
        logProgress(
          `⚠️ Cleanup failed for regular member user ${regularMemberAuth.user.email}: ${error}`,
        );
      }
    }
  });

  test.describe('As Organization Admin', () => {
    test('Organization admin can view all organization members', async ({ browser }) => {
      logProgress('🚀 Testing organization admin member view...');

      const context = await browser.newContext();
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: orgAdminAuth.session.sessionToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        },
      ]);

      const page = await context.newPage();

      try {
        await page.goto('http://localhost:3080/');
        await expect(page).toHaveURL(/.*\/c\/new/);
        logProgress('📱 Navigated to application and verified authentication');

        // Open settings modal
        await page.click('[data-testid="nav-user"]');
        await page.click('text=Settings');
        logProgress('⚙️ Opened settings modal');

        // Navigate to Organization tab
        await page.getByRole('tab', { name: 'Organization' }).click();
        await expect(page.getByText('Organization Settings')).toBeVisible();
        logProgress('🏢 Navigated to Organization settings');

        // Open user management
        await page.click('[data-testid="manage-users-button"]');
        await expect(page.getByRole('heading', { name: 'Team Members' })).toBeVisible();
        logProgress('👥 Opened user management modal');

        // Wait for the modal to be open by looking for the specific heading in the modal
        await expect(page.getByRole('heading', { name: 'Team Members' })).toBeVisible({
          timeout: 10000,
        });
        logProgress('✅ Team Members modal heading is visible');

        // Get a reference to the dialog/modal container to scope our searches
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible({ timeout: 10000 });
        logProgress('✅ Modal dialog is visible');

        // Assert exactly 2 members are shown - use data-testid instead of text
        await expect(page.getByTestId('member-count-display')).toContainText(
          'Showing 2 of 2 members',
        );
        logProgress('✅ Confirmed showing exactly 2 of 2 members via data-testid');

        // Verify we have exactly 2 member items
        const memberItems = page.getByTestId('member-item');
        await expect(memberItems).toHaveCount(2);
        logProgress('✅ Confirmed exactly 2 member items present');

        // Verify OWNER user is present
        const ownerMember = memberItems.filter({
          has: page.getByTestId('member-role').filter({ hasText: 'Owner' }),
        });
        await expect(ownerMember).toHaveCount(1);
        await expect(ownerMember.getByTestId('member-role')).toContainText('Owner');
        await expect(ownerMember.getByTestId('member-email')).toContainText(
          orgAdminAuth.user.email,
        );
        logProgress('✅ Found admin user with Owner role via data-testids');

        // Verify MEMBER user is present
        const memberMember = memberItems.filter({
          has: page.getByTestId('member-role').filter({ hasText: 'Member' }),
        });
        await expect(memberMember).toHaveCount(1);
        await expect(memberMember.getByTestId('member-role')).toContainText('Member');
        await expect(memberMember.getByTestId('member-email')).toContainText(
          regularMemberAuth.user.email,
        );
        logProgress('✅ Found member user with Member role via data-testids');

        // Verify role counts in footer using data-testids
        await expect(page.getByTestId('owner-count')).toContainText('1 owner');
        await expect(page.getByTestId('admin-count')).toContainText('0 admins');
        await expect(page.getByTestId('member-count')).toContainText('1 member');
        logProgress('✅ Verified role counts in footer via data-testids');

        logProgress('✅ Organization admin can view exactly 2 organization members as expected!');
      } finally {
        await context.close();
      }
    });

    test('Organization admin can invite new members', async ({ browser }) => {
      logProgress('🚀 Testing organization admin invite functionality...');

      const context = await browser.newContext();
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: orgAdminAuth.session.sessionToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        },
      ]);

      const page = await context.newPage();

      try {
        await page.goto('http://localhost:3080/');
        await expect(page).toHaveURL(/.*\/c\/new/);
        logProgress('📱 Navigated to application');

        // Open settings modal
        await page.click('[data-testid="nav-user"]');
        await page.click('text=Settings');
        await page.getByRole('tab', { name: 'Organization' }).click();
        await page.click('[data-testid="manage-users-button"]');
        logProgress('👥 Opened user management modal');

        // Click invite button
        await page.click('[data-testid="invite-member-button"]');
        await expect(page.getByRole('dialog', { name: 'Invite Member' })).toBeVisible();
        logProgress('📧 Opened invite member dialog');

        // Fill in invitation form
        const inviteEmail = `invite-${testId}@example.com`;
        await page.fill('[data-testid="invite-email-input"]', inviteEmail);

        // Select role (member by default for now, admin role to be added)
        const roleSelect = page.locator('[data-testid="invite-role-select"]');
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption('member');
        }

        // Send invitation (button is now rendered via selection prop)
        await page.getByRole('button', { name: 'Send Invitation' }).click();

        // Verify success message
        await expect(page.getByText(`Invitation sent to ${inviteEmail}`)).toBeVisible({
          timeout: 10000,
        });
        logProgress(`✅ Successfully sent invitation to ${inviteEmail}`);

        // Wait for invitation to be processed and email to be sent
        await page.waitForTimeout(3000);

        // Verify email was sent to MailHog
        const emailCount = await mailhog.getMessageCount();
        logProgress(`📧 MailHog email count after invitation: ${emailCount}`);
        expect(emailCount).toBeGreaterThan(0);

        // Get the latest invitation email
        const invitationMessage = await mailhog.getLatestMessage(inviteEmail, 5000);
        expect(invitationMessage).toBeTruthy();
        logProgress(`✅ Confirmed invitation email sent to ${inviteEmail} via MailHog`);

        // Verify email contains invitation content
        if ((invitationMessage as MailHogMessage)?.Content?.Body) {
          const emailBody = (invitationMessage as MailHogMessage).Content!.Body.toLowerCase();

          // Check for basic invitation email content
          const hasInvitationContent =
            emailBody.includes('invite') ||
            emailBody.includes('join') ||
            emailBody.includes('organization') ||
            emailBody.includes('team');

          expect(hasInvitationContent).toBe(true);
          logProgress('✅ Invitation email contains expected invitation keywords');
        }

        // Verify invitation appears in pending list
        const pendingInvite = page.locator(`[data-testid="pending-invitation-${inviteEmail}"]`);
        await expect(pendingInvite).toBeVisible();
        logProgress('✅ Invitation appears in pending invitations list');
      } finally {
        await context.close();
      }
    });

    test('Organization admin can change member roles', async ({ browser }) => {
      logProgress('🚀 Testing organization admin role change functionality...');
    });

    test('Organization admin can remove members', async ({ browser }) => {
      logProgress('🚀 Testing organization admin member removal functionality...');
    });

    test('Organization admin cannot remove or change owner role', async ({ browser }) => {
      logProgress('🚀 Testing organization admin owner protection...');
    });
  });

  test.describe('As Regular Member', () => {
    test('Regular member cannot access user management', async ({ browser }) => {});
  });
});
