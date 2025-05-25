import { test, expect } from '@playwright/test';
import cleanupAgents from '../../utils/cleanupAgents';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Create Google Sheets MCP', async ({ page }) => {
  await page.goto('http://localhost:3080/');

  // Handle Terms of Service modal if it appears
  try {
    await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
  } catch (e) {
    // Modal might not appear, continue
    console.log('No TOS modal found or could not click accept button');
  }
  // handle login if it appears
  try {
    //await page.getByRole('button', { name: 'Log in' }).click({ timeout: 5000 });
    await page
      .locator('input[name="email"]')
      .fill(process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com');
    await page
      .locator('input[name="password"]')
      .fill(process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '');
    await page.locator('input[name="password"]').press('Enter');
    // Wait for the page to load after login
    await page.waitForURL(/.*\/c\/new/, { timeout: 10000 });
  } catch (e) {
    // Login might not be required, continue
    console.log('No login required or could not click login button');
  }

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  //

  // Create Google Sheets Agent
  await page.getByRole('button', { name: 'Controls' }).click();
  await page.getByRole('button', { name: 'Agent Builder' }).click();

  try {
    await page.getByRole('button', { name: 'Create New Agent' }).click({ timeout: 5000 });
  } catch (e) {
    // Button might not exist, continue
    console.log('Create New Agent button not found, continuing...');
  }

  await page.getByRole('textbox', { name: 'Agent name' }).click();
  await page.getByRole('textbox', { name: 'Agent name' }).press('ControlOrMeta+c');
  await page.getByRole('textbox', { name: 'Agent name' }).dblclick();
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Sheets Agent');
  await page.getByRole('textbox', { name: 'Agent description' }).dblclick();
  await page
    .getByRole('textbox', { name: 'Agent description' })
    .fill('Claude 3.7 Agent with access to Google Sheets.');
  await page.getByRole('textbox', { name: 'Agent instructions' }).dblclick();
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ControlOrMeta+a');
  await page.getByRole('textbox', { name: 'Agent instructions' }).click();
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ArrowDown');
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ArrowDown');
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ArrowRight');
  await page.getByRole('textbox', { name: 'Agent instructions' }).click();
  await page
    .getByRole('textbox', { name: 'Agent instructions' })
    .fill(
      'You possess expert-level Google Sheets skills. Whenever you create a new spreadsheet or make spreadsheet edits for the user, please provide a link so they can access it conveniently.',
    );
  await page.getByLabel('Agent Builder').getByRole('button', { name: 'Select a model' }).click();
  await page.getByRole('combobox', { name: 'Provider' }).click();
  await page.getByText('Anthropic').click();
  await page.getByRole('combobox', { name: 'Model' }).click();
  //

  //
  await page.getByText('claude-3-7-sonnet-').click();
  await page.getByRole('button', { name: 'Create' }).click();
  // add mcp tools
  await page
    .getByLabel('Agent Builder')
    .getByRole('button')
    .filter({ hasText: /^$/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Add Tools' }).click();
  await page.getByRole('button', { name: 'Add Google Sheets' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  // Assert MCP is created
  await expect(page.getByText('Google Sheets', { exact: true })).toBeVisible();
  // open panel
  await page
    .locator('div')
    .filter({ hasText: /^Google Sheets15 ToolsAdd ToolsAdd Actions$/ })
    .getByRole('img')
    .first()
    .click();
  // assert mcp/tool
  await expect(page.getByText('Create New Spreadsheet')).toBeVisible();
});

test('Use Google Sheets Agent', async ({ page }) => {
  await page.goto('http://localhost:3080/');

  // Handle Terms of Service modal if it appears
  try {
    await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
  } catch (e) {
    // Modal might not appear, continue
    console.log('No TOS modal found or could not click accept button');
  }
  // handle login if it appears
  try {
    await page
      .locator('input[name="email"]')
      .fill(process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com');
    await page
      .locator('input[name="password"]')
      .fill(process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD || '');
    await page.locator('input[name="password"]').press('Enter');
    // Wait for the page to load after login
    await page.waitForURL(/.*\/c\/new/, { timeout: 10000 });
  } catch (e) {
    // Login might not be required, continue
    console.log('No login required or could not click login button');
  }
  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  // START

  await page
    .getByTestId('text-input')
    .fill(
      'Create a spreadsheet of every David Bowie studio album. Create columns for producer, guitarists, drummers, keyboard/piano, and other musicians.',
    );
  await page.getByTestId('send-button').click();
  await expect(page.getByRole('button', { name: 'Running Composio Check Active' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Ran Composio Check Active' })).toBeVisible({
    timeout: 15000,
  });

  await expect(page.getByRole('button', { name: 'Ran Create Google Sheet1' })).toBeVisible({
    timeout: 15000,
  });

  //await page.pause();
  const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  await cleanupAgents(testUserEmail);
});

// Global cleanup hooks
// test.afterEach(async () => {
//   // Clean up test data after each test
//   const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
//   await cleanupAgents(testUserEmail);
// });
