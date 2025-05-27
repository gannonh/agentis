import { test, expect } from '@playwright/test';
import cleanupAgents, { cleanupChats } from '../../utils/cleanupUser';
import { handleInitialPageState } from '../../utils/handleInitialPageState';
import { logProgress } from '../../utils/testLogger';
import { handleGoogleOAuth } from '../../utils/handleGoogleOAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Create Google Sheets MCP', async ({ page }) => {
  logProgress('Starting Create Google Sheets MCP test');
  await page.goto('http://localhost:3080/');

  // Handle TOS and login if needed
  await handleInitialPageState(page);
  logProgress('Initial page state handled');

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('Verified on main chat page');
  //

  // Create Google Sheets Agent
  await page.getByRole('button', { name: 'Controls' }).click();
  await page.getByRole('button', { name: 'Agent Builder' }).click();
  logProgress('Opened Agent Builder');

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
  logProgress('Created agent with basic settings');
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
  logProgress('Saved agent configuration');

  // Assert MCP is created
  await expect(page.getByText('Google Sheets', { exact: true })).toBeVisible();
  logProgress('✅ Google Sheets MCP created successfully');
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
  logProgress('✅ Starting Use Google Sheets Agent test');
  await page.goto('http://localhost:3080/');

  // Handle TOS and login if needed
  await handleInitialPageState(page);
  logProgress('✅ Initial page state handled');
  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');
  // START

  await page
    .getByTestId('text-input')
    .fill(
      'Create a spreadsheet of every David Bowie studio album. Create columns for producer, guitarists, drummers, keyboard/piano, and other musicians.',
    );
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create spreadsheet');

  await expect(page.getByRole('button', { name: 'Running Check Connection' })).toBeVisible({
    timeout: 15000,
  });
  logProgress('✅ Running Check Connection');

  await expect(page.getByRole('button', { name: 'Ran Check Connection' })).toBeVisible({
    timeout: 15000,
  });
  logProgress('✅ Ran Check Connection');

  // Handle Google Docs Authentication
  // await expect(page.getByRole('link', { name: 'https://backend.composio.dev/' })).toBeVisible();

  await handleGoogleOAuth(page, 'Google Sheets');

  await expect(page.getByRole('button', { name: 'Running Create New Spreadsheet' })).toBeVisible({
    timeout: 15000,
  });
  logProgress('✅ Running Create New Spreadsheet');

  await expect(page.getByRole('button', { name: 'Ran Create New Spreadsheet' })).toBeVisible({
    timeout: 15000,
  });
  logProgress('✅ Ran Create New Spreadsheet');

  //await page.pause();
  const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  await cleanupAgents(testUserEmail);
  await cleanupChats(testUserEmail);
  logProgress('✅ Cleaned up agents and chats for test user');
});
