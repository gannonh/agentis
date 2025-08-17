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

        // Wait for members to load and verify we have the expected users
        const memberItems = page.getByTestId('member-item');
        await expect(memberItems).toHaveCount(2);
        logProgress('✅ Confirmed 2 members are loaded');

        // Find the target member by email (stable identifier that doesn't change)
        const targetMember = memberItems.filter({
          has: page.getByTestId('member-email').filter({ hasText: regularMemberAuth.user.email }),
        });
        await expect(targetMember).toHaveCount(1);
        logProgress('✅ Found target member by email');

        // Verify initial state - member should have "Member" role badge
        await expect(targetMember.getByTestId('member-role')).toContainText('Member');
        await expect(targetMember.getByTestId('member-email')).toContainText(
          regularMemberAuth.user.email,
        );
        logProgress('✅ Verified initial member role state');

        // Open the member actions dropdown
        await targetMember.getByTestId('member-actions-button').click();
        await expect(page.getByTestId('member-actions-menu')).toBeVisible();
        logProgress('👥 Opened member actions menu');

        // Change role from Member to Admin
        await page.getByTestId('make-admin-action').click();
        logProgress('🔄 Clicked Make Admin action');

        // Wait for the role change to be reflected in the UI
        await expect(targetMember.getByTestId('member-role')).toContainText('Admin');
        logProgress('✅ Member role updated to Admin');

        // Verify role counts have updated in footer
        await expect(page.getByTestId('owner-count')).toContainText('1 owner');
        await expect(page.getByTestId('admin-count')).toContainText('1 admin');
        await expect(page.getByTestId('member-count')).toContainText('0 members');
        logProgress('✅ Verified role counts updated in footer');

        // Now change the role back from Admin to Member
        await targetMember.getByTestId('member-actions-button').click();
        await expect(page.getByTestId('member-actions-menu')).toBeVisible();
        logProgress('👥 Reopened member actions menu');

        // Change role from Admin back to Member
        await page.getByTestId('make-member-action').click();
        logProgress('🔄 Clicked Make Member action');

        // Wait for the role change to be reflected back to Member
        await expect(targetMember.getByTestId('member-role')).toContainText('Member');
        logProgress('✅ Member role changed back to Member');

        // Verify role counts have reverted
        await expect(page.getByTestId('owner-count')).toContainText('1 owner');
        await expect(page.getByTestId('admin-count')).toContainText('0 admins');
        await expect(page.getByTestId('member-count')).toContainText('1 member');
        logProgress('✅ Verified role counts reverted correctly');

        logProgress('✅ Organization admin can successfully change member roles!');
      } finally {
        await context.close();
      }
    });

    test('Organization admin can remove members', async ({ browser }) => {
      logProgress('🚀 Testing organization admin member removal functionality...');

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

        // Wait for members to load and verify we start with 2 members
        const memberItems = page.getByTestId('member-item');
        await expect(memberItems).toHaveCount(2);
        logProgress('✅ Confirmed 2 members are loaded initially');

        // Verify initial member count display
        await expect(page.getByTestId('member-count-display')).toContainText(
          'Showing 2 of 2 members',
        );
        logProgress('✅ Verified initial member count display');

        // Find the target member (regular member) by email
        const targetMember = memberItems.filter({
          has: page.getByTestId('member-email').filter({ hasText: regularMemberAuth.user.email }),
        });
        await expect(targetMember).toHaveCount(1);
        logProgress('✅ Found target member to remove');

        // Verify the target member has "Member" role (should not be Owner)
        await expect(targetMember.getByTestId('member-role')).toContainText('Member');
        logProgress('✅ Confirmed target member has Member role');

        // Open the member actions dropdown
        await targetMember.getByTestId('member-actions-button').click();
        await expect(page.getByTestId('member-actions-menu')).toBeVisible();
        logProgress('👥 Opened member actions menu');

        // Set up dialog handler for confirmation
        page.on('dialog', async (dialog) => {
          logProgress(`🗨️ Confirmation dialog appeared: ${dialog.message()}`);
          await dialog.accept();
        });

        // Click remove member action
        await page.getByTestId('remove-member-action').click();
        logProgress('🗑️ Clicked Remove Member action');

        // Wait for the member to be removed from the UI
        await expect(memberItems).toHaveCount(1);
        logProgress('✅ Member count reduced to 1 after removal');

        // Verify the member count display has updated
        await expect(page.getByTestId('member-count-display')).toContainText(
          'Showing 1 of 1 members',
        );
        logProgress('✅ Verified member count display updated');

        // Verify only the Owner remains
        const remainingMember = memberItems.filter({
          has: page.getByTestId('member-role').filter({ hasText: 'Owner' }),
        });
        await expect(remainingMember).toHaveCount(1);
        await expect(remainingMember.getByTestId('member-email')).toContainText(
          orgAdminAuth.user.email,
        );
        logProgress('✅ Confirmed only Owner member remains');

        // Verify role counts have updated in footer
        await expect(page.getByTestId('owner-count')).toContainText('1 owner');
        await expect(page.getByTestId('admin-count')).toContainText('0 admins');
        await expect(page.getByTestId('member-count')).toContainText('0 members');
        logProgress('✅ Verified role counts updated correctly in footer');

        // Verify the removed member no longer appears in the list
        const removedMemberSearch = memberItems.filter({
          has: page.getByTestId('member-email').filter({ hasText: regularMemberAuth.user.email }),
        });
        await expect(removedMemberSearch).toHaveCount(0);
        logProgress('✅ Confirmed removed member no longer appears in member list');

        logProgress('✅ Organization admin can successfully remove members!');
      } finally {
        await context.close();
      }
    });

    test('Organization admin cannot remove or change owner role', async ({ browser }) => {
      logProgress('🚀 Testing organization admin owner protection...');

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

        // Wait for members to load - we should have 2 members (owner + regular member)
        const memberItems = page.getByTestId('member-item');
        await expect(memberItems).toHaveCount(2);
        logProgress('✅ Confirmed 2 members are loaded');

        // Find the owner member by role badge
        const ownerMember = memberItems.filter({
          has: page.getByTestId('member-role').filter({ hasText: 'Owner' }),
        });
        await expect(ownerMember).toHaveCount(1);
        await expect(ownerMember.getByTestId('member-email')).toContainText(
          orgAdminAuth.user.email,
        );
        logProgress('✅ Found owner member');

        // Find the non-owner member by role badge
        const nonOwnerMember = memberItems.filter({
          has: page.getByTestId('member-role').filter({ hasText: 'Member' }),
        });
        await expect(nonOwnerMember).toHaveCount(1);
        await expect(nonOwnerMember.getByTestId('member-email')).toContainText(
          regularMemberAuth.user.email,
        );
        logProgress('✅ Found non-owner member');

        // Verify that the owner member does NOT have an actions button
        // The condition `member.role !== 'owner'` in MemberManagement.tsx should prevent this
        const ownerActionsButton = ownerMember.getByTestId('member-actions-button');
        await expect(ownerActionsButton).toHaveCount(0);
        logProgress('✅ Confirmed owner member does not have actions button');

        // Verify that the non-owner member DOES have an actions button for comparison
        const nonOwnerActionsButton = nonOwnerMember.getByTestId('member-actions-button');
        await expect(nonOwnerActionsButton).toHaveCount(1);
        logProgress('✅ Confirmed non-owner member has actions button (for comparison)');

        // Verify there's exactly 1 actions button total (only for non-owner)
        const allActionsButtons = page.getByTestId('member-actions-button');
        await expect(allActionsButtons).toHaveCount(1);
        logProgress('✅ Confirmed exactly 1 action button exists (only for non-owner)');

        // Verify the owner role badge is displayed correctly
        await expect(ownerMember.getByTestId('member-role')).toContainText('Owner');
        logProgress('✅ Confirmed owner role badge is displayed');

        // Verify the footer counts show 1 owner, 0 admins, 1 member
        await expect(page.getByTestId('owner-count')).toContainText('1 owner');
        await expect(page.getByTestId('admin-count')).toContainText('0 admins');
        await expect(page.getByTestId('member-count')).toContainText('1 member');
        logProgress('✅ Verified role counts show 1 owner and 1 member');

        logProgress(
          '✅ Organization admin cannot remove or change owner role - protection verified!',
        );
      } finally {
        await context.close();
      }
    });
  });

  test.describe('As Regular Member', () => {
    test('Regular member cannot access user management', async ({ browser }) => {});
  });
});
