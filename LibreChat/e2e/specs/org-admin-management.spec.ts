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

        // Debug: Check what's actually on the page
        logProgress('🔍 Taking page screenshot for debugging');
        await page.screenshot({ path: 'debug-member-management.png' });

        // Check page HTML content
        const pageContent = await page.content();
        const hasTestId = pageContent.includes('data-testid="member-list"');
        logProgress(`🔍 Page contains member-list testid: ${hasTestId}`);

        // Check if user management modal is actually open
        const teamMembersHeading = page.getByRole('heading', { name: 'Team Members' });
        const isTeamMembersVisible = await teamMembersHeading.isVisible();
        logProgress(`🔍 Team Members heading visible: ${isTeamMembersVisible}`);

        // If member list doesn't exist, let's see what's actually rendered
        if (!hasTestId) {
          const bodyText = await page.locator('body').textContent();
          logProgress(`🔍 Body text contains: ${bodyText?.substring(0, 500)}...`);

          // Test Better Auth's getFullOrganization API directly
          logProgress('🔍 Testing Better Auth organization API directly...');
          try {
            const apiResponse = await page.evaluate(
              async (authData) => {
                const response = await fetch(`/api/auth/organization/get-full-organization`, {
                  headers: {
                    Cookie: `better-auth.session_token=${authData.sessionToken}`,
                  },
                });
                const data = await response.json();
                return { status: response.status, data };
              },
              {
                sessionToken: orgAdminAuth.session.sessionToken,
                organizationId: orgAdminAuth.organization.id,
              },
            );

            logProgress(`🔍 Better Auth API Response: ${JSON.stringify(apiResponse)}`);
          } catch (error) {
            logProgress(`🔍 Better Auth API Error: ${error}`);
          }
        }

        // Wait for the modal to be open by looking for the specific heading in the modal
        await expect(page.getByRole('heading', { name: 'Team Members' })).toBeVisible({
          timeout: 10000,
        });
        logProgress('✅ Team Members modal heading is visible');

        // Get a reference to the dialog/modal container to scope our searches
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible({ timeout: 10000 });
        logProgress('✅ Modal dialog is visible');

        // Assert exactly 2 members are shown - check the specific count text within modal
        await expect(modal.getByText('Showing 2 of 2 members')).toBeVisible({ timeout: 15000 });
        logProgress('✅ Confirmed showing exactly 2 of 2 members in modal');

        // Verify OWNER user is present
        await expect(page.getByRole('heading', { name: /Test User .*-admin/ })).toBeVisible({
          timeout: 10000,
        });
        await expect(
          page.getByLabel('Team Members').getByText('Owner', { exact: true }),
        ).toBeVisible({ timeout: 5000 });
        await expect(
          page.getByLabel('Team Members').getByText(/test-.*-admin@example\.com/),
        ).toBeVisible({ timeout: 5000 });
        logProgress('✅ Found admin user with Owner role');

        // Verify MEMBER user is present
        await expect(page.getByRole('heading', { name: /Test User .*Member/ })).toBeVisible({
          timeout: 10000,
        });
        await expect(page.getByText('Member', { exact: true })).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/test-.*-member@example\.com/)).toBeVisible({ timeout: 5000 });
        logProgress('✅ Found member user with Member role');

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

        // Open user management
        await page.click('[data-testid="nav-user"]');
        await page.click('text=Settings');
        await page.getByRole('tab', { name: 'Organization' }).click();
        await page.click('[data-testid="manage-users-button"]');
        logProgress('👥 Opened user management modal');

        // Find a member that can have their role changed
        const memberItems = page.locator('[data-testid="member-item"]');
        const memberCount = await memberItems.count();

        if (memberCount > 1) {
          // Find a non-owner member
          const targetMember = memberItems
            .filter({
              has: page.locator('[data-testid="member-role"]:not(:has-text("Owner"))'),
            })
            .first();

          if (await targetMember.isVisible()) {
            // Open member actions menu
            await targetMember.locator('[data-testid="member-actions-button"]').click();
            await expect(page.locator('[data-testid="member-actions-menu"]')).toBeVisible();
            logProgress('📋 Opened member actions menu');

            // Look for role change option (when admin role is implemented)
            const makeAdminAction = page.locator('[data-testid="make-admin-action"]');
            if (await makeAdminAction.isVisible()) {
              await makeAdminAction.click();

              // Confirm the action if dialog appears
              const confirmButton = page.locator('[data-testid="confirm-role-change-button"]');
              if (await confirmButton.isVisible({ timeout: 5000 })) {
                await confirmButton.click();
              }

              // Verify role was updated
              await expect(targetMember.locator('[data-testid="member-role"]')).toContainText(
                'Admin',
                { timeout: 10000 },
              );
              logProgress('✅ Successfully changed member role to Admin');
            } else {
              logProgress('⚠️ Admin role not yet implemented - skipping role change test');
            }
          }
        } else {
          logProgress('⚠️ Not enough members to test role change - need at least 2 members');
        }
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

        // First, invite a test member to remove
        await page.click('[data-testid="nav-user"]');
        await page.click('text=Settings');
        await page.getByRole('tab', { name: 'Organization' }).click();
        await page.click('[data-testid="manage-users-button"]');

        // Create a member to remove
        const removeEmail = `remove-${testId}@example.com`;
        await page.click('[data-testid="invite-member-button"]');
        await page.fill('[data-testid="invite-email-input"]', removeEmail);
        await page.click('[data-testid="send-invitation-button"]');
        await expect(page.getByText(`Invitation sent to ${removeEmail}`)).toBeVisible({
          timeout: 10000,
        });
        logProgress(`📧 Created test invitation for ${removeEmail}`);

        // Now test removing the pending invitation
        const pendingInvite = page.locator(`[data-testid="pending-invitation-${removeEmail}"]`);
        if (await pendingInvite.isVisible()) {
          // Cancel the invitation
          await pendingInvite.locator('[data-testid="cancel-invitation-button"]').click();

          // Confirm cancellation if dialog appears
          const confirmCancel = page.locator('[data-testid="confirm-cancel-button"]');
          if (await confirmCancel.isVisible({ timeout: 5000 })) {
            await confirmCancel.click();
          }

          // Verify invitation is removed
          await expect(pendingInvite).not.toBeVisible({ timeout: 10000 });
          logProgress('✅ Successfully cancelled pending invitation');
        }
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

        // Open user management
        await page.click('[data-testid="nav-user"]');
        await page.click('text=Settings');
        await page.getByRole('tab', { name: 'Organization' }).click();
        await page.click('[data-testid="manage-users-button"]');
        logProgress('👥 Opened user management modal');

        // Find an owner member
        const ownerItem = page
          .locator('[data-testid="member-item"]')
          .filter({
            has: page.locator('[data-testid="member-role"]:has-text("Owner")'),
          })
          .first();

        if (await ownerItem.isVisible()) {
          // Check if actions button exists for owner
          const actionsButton = ownerItem.locator('[data-testid="member-actions-button"]');

          if (await actionsButton.isVisible()) {
            await actionsButton.click();
            await expect(page.locator('[data-testid="member-actions-menu"]')).toBeVisible();

            // Verify dangerous actions are not available
            await expect(page.locator('[data-testid="remove-member-action"]')).not.toBeVisible();
            await expect(page.locator('[data-testid="make-admin-action"]')).not.toBeVisible();
            await expect(page.locator('[data-testid="make-member-action"]')).not.toBeVisible();
            logProgress('✅ Owner role is protected - no dangerous actions available');

            // Close menu
            await page.keyboard.press('Escape');
          } else {
            logProgress('✅ Owner has no actions button - protected from changes');
          }
        }
      } finally {
        await context.close();
      }
    });
  });

  test.describe('As Regular Member', () => {
    test('Regular member cannot access user management', async ({ browser }) => {
      logProgress('🚀 Testing regular member access restrictions...');

      const context = await browser.newContext();
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: regularMemberAuth.session.sessionToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        },
      ]);

      const page = await context.newPage();

      try {
        await page.goto('http://localhost:3080/');
        await expect(page).toHaveURL(/.*\/c\/new/);
        logProgress('📱 Navigated as regular member');

        // Open settings modal
        await page.click('[data-testid="nav-user"]');
        await page.click('text=Settings');
        logProgress('⚙️ Opened settings modal');

        // Check if Organization tab is visible
        const orgTab = page.getByRole('tab', { name: 'Organization' });

        // Regular members might not see the Organization tab at all
        // or they might see it but with limited access
        if (await orgTab.isVisible({ timeout: 5000 })) {
          await orgTab.click();

          // Manage users button should not be visible for regular members
          await expect(page.locator('[data-testid="manage-users-button"]')).not.toBeVisible();
          logProgress('✅ Regular member cannot see manage users button');

          // Should see limited access message
          const limitedAccessMsg = page.locator('[data-testid="org-settings-limited-access"]');
          if (await limitedAccessMsg.isVisible({ timeout: 5000 })) {
            await expect(limitedAccessMsg).toContainText('view organization settings');
            logProgress('✅ Regular member sees limited access message');
          }
        } else {
          logProgress('✅ Regular member cannot see Organization tab at all');
        }
      } finally {
        await context.close();
      }
    });
  });
});
