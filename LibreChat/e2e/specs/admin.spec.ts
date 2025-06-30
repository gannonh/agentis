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
  test('Basic Admin CRUD', async ({ page }) => {
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
});
