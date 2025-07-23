import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import {
  createTestUserWithOrganization,
  cleanupTestUser,
  generateTestId,
  type TestAuthResult,
} from '../utils/testAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });
test.describe('Admin Tests', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    // Generate unique test ID for this test suite
    testId = generateTestId();

    // Create test user with organization using Better Auth
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(
      `✅ Created test user: ${testAuth.user.email} with org: ${testAuth.organization.name}`,
    );

    // Promote user to admin role for admin panel access
    // Note: In a real scenario, this would require an existing admin user to promote
    // For testing, we'll directly update the user's role in the database
    const { getTestDatabase } = await import('../utils/testAuth');
    const database = await getTestDatabase();

    // Promote user to admin using ObjectId
    await database.db
      .collection('user')
      .updateOne(
        { _id: new database.mongoose.Types.ObjectId(testAuth.user.id) },
        { $set: { role: 'admin' } },
      );

    logProgress(`👑 Promoted test user to admin role`);
  });

  test.afterAll(async () => {
    // Clean up test data after all tests complete
    if (testAuth) {
      await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
      logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
    }
  });
  test('User Mgmt Test', async ({ browser }) => {
    logProgress('🚀 Starting User Management test...');

    // Create a new context with authentication cookies
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax' as const,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/admin');
      await page.getByRole('button', { name: 'User Management Manage users' }).click();

      // Verify user management section is displayed
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

      await page.getByRole('button', { name: 'Create User' }).click();

      // Verify create user dialog is displayed
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Create New User' })).toBeVisible();

      await page.getByRole('textbox', { name: 'Full Name' }).click();
      await page.getByRole('textbox', { name: 'Full Name' }).fill('e2e Test');
      await page.getByRole('textbox', { name: 'Email Address' }).click();
      await page.getByRole('textbox', { name: 'Email Address' }).fill('e2e@e2e.com');
      await page.getByRole('button', { name: 'Create User' }).click();

      await expect(page.getByText('e2e Test', { exact: true })).toBeVisible();
      await expect(page.getByText('e2e@e2e.com')).toBeVisible();

      await page.getByRole('textbox', { name: 'Search users by name or email' }).click();
      await page.getByRole('textbox', { name: 'Search users by name or email' }).fill('e2e');

      await expect(page.getByText('user', { exact: true })).toBeVisible();
      await expect(page.getByText('unverified')).toBeVisible();

      await page.getByRole('button', { name: 'Promote' }).click();
      await expect(page.getByText('admin', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Demote' }).click();
      await expect(page.getByText('user', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByRole('textbox', { name: 'Full Name' }).click();
      await page.getByRole('textbox', { name: 'Full Name' }).fill('e2e Test edited');

      await page.getByRole('textbox', { name: 'Email Address' }).click();
      await page.getByRole('textbox', { name: 'Email Address' }).fill('e2e@edited-e2e.com');
      await page.getByRole('button', { name: 'Update User' }).click();

      await expect(page.getByText('e2e Test edited')).toBeVisible();
      await expect(page.getByText('e2e@edited-e2e.com')).toBeVisible();

      await page.getByRole('button', { name: 'Ban' }).click();
      await expect(page.getByText('banned', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Unban' }).click();

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Delete User' }).click();

      await expect(page.getByText('e2e@edited-e2e.com')).not.toBeVisible();

      logProgress('✅ User Management test completed successfully!');
    } finally {
      await context.close();
    }
  });

  test('Org Mgmt Test', async ({ browser }) => {
    logProgress('🚀 Starting Organization Management test...');

    // Create a new context with authentication cookies
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax' as const,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/admin');

      await page.getByRole('button', { name: 'Organization Management' }).click();
      await page.getByRole('button', { name: 'Create Organization' }).click();

      // Fill organization name
      await page.getByRole('textbox', { name: 'Organization Name' }).click();
      await page.getByRole('textbox', { name: 'Organization Name' }).fill('e2e Test, Inc.');

      // URL slug should auto-generate from the organization name
      // Wait a moment for the auto-generation to occur
      await page.waitForTimeout(100);

      // Fill domain field
      await page.getByRole('textbox', { name: 'Domain (Optional)' }).click();
      await page.getByRole('textbox', { name: 'Domain (Optional)' }).fill('e2etest.com');

      // Create organization
      await page.getByRole('button', { name: 'Create Organization' }).click();

      await page.getByRole('textbox', { name: 'Search organizations...' }).click();
      await page.getByRole('textbox', { name: 'Search organizations...' }).fill('e2e Test');

      await expect(page.getByText('e2e Test, Inc.')).toBeVisible();
      await expect(page.getByText('e2e-test-inc')).toBeVisible(); // Auto-generated slug
      await expect(page.getByText('e2etest.com')).toBeVisible();

      await page.getByRole('button', { name: 'Edit' }).click();
      await page.getByRole('textbox', { name: 'Organization Name' }).click();
      await page.getByRole('textbox', { name: 'Organization Name' }).fill('e2e Test, Inc. EDIT');

      // Edit the slug manually since edit form doesn't auto-generate
      await page.getByRole('textbox', { name: 'URL Slug' }).click();
      await page.getByRole('textbox', { name: 'URL Slug' }).clear();
      await page.getByRole('textbox', { name: 'URL Slug' }).fill('e2e-test-inc-edit');

      await page.getByRole('textbox', { name: 'Domain (Optional)' }).click();
      await page.getByRole('textbox', { name: 'Domain (Optional)' }).fill('e2etest-edit.com');

      await page.getByRole('button', { name: 'Update Organization' }).click({ timeout: 10000 });

      await expect(page.getByText('e2e Test, Inc. EDIT')).toBeVisible();
      await expect(page.getByText('e2e-test-inc-edit')).toBeVisible();
      await expect(page.getByText('e2etest-edit.com')).toBeVisible();

      await page.getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('button', { name: 'Delete Organization' }).click();

      // Wait for the dialog to close and the table to update
      await page.waitForTimeout(500);

      // Check that the organization is no longer in the table
      await expect(page.getByRole('cell', { name: 'e2e Test, Inc. EDIT' })).not.toBeVisible();
      await expect(page.getByText('e2e-test-inc-edit')).not.toBeVisible();
      await expect(page.getByText('e2etest-edit.com')).not.toBeVisible();

      logProgress('✅ Organization Management test completed successfully!');
    } finally {
      await context.close();
    }
  });
});
