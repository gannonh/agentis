import { test, expect } from '@playwright/test';

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

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);

  // Create Google Sheets Agent
  await page.getByRole('button', { name: 'Controls' }).click();
  await page.getByRole('button', { name: 'Agent Builder' }).click();
  await page.getByRole('button', { name: 'Create New Agent' }).click();
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
  await page.getByText('claude-sonnet-4-').click();
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

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
});
