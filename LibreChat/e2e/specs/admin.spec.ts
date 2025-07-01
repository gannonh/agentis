import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.use({
  storageState: path.join(__dirname, '../data/admin2-auth.json'),
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });
test.describe('Admin Tests', () => {
  test('User Mgmt Test', async ({ page }) => {
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
  });
  test('Org Mgmt Test', async ({ page }) => {
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
  });
});
