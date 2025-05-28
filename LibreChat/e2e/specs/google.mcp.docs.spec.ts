import { test, expect } from '@playwright/test';
import cleanupAgents, { cleanupChats } from '../utils/cleanupUser';
import { logProgress } from '../utils/testLogger';
import { handleGoogleOAuth } from '../utils/handleGoogleOAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Create Google Docs MCP', async ({ page }) => {
  logProgress('Starting Create Google Docs MCP test');
  await page.goto('http://localhost:3080/');

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
  //
  //await page.pause();
  //
  await page.getByRole('textbox', { name: 'Agent name' }).click();
  await page.getByRole('textbox', { name: 'Agent name' }).press('ControlOrMeta+c');
  await page.getByRole('textbox', { name: 'Agent name' }).dblclick();
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Docs Agent');
  await page
    .getByRole('textbox', { name: 'Agent description' })
    .fill('Sonnet 3.5 with access to Google Sheets');
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
      'You possess expert-level Google Docs skills. Whenever you create a new spreadsheet or make spreadsheet edits for the user, please provide a link so they can access it conveniently.',
    );

  await page.getByLabel('Agent Builder').getByRole('button', { name: 'Select a model' }).click();
  await page.getByRole('combobox', { name: 'Provider' }).click();
  await page.getByText('Anthropic').click();
  await page.getByRole('combobox', { name: 'Model' }).click();
  //

  //
  await page.getByText('claude-3-5-sonnet-20241022').click();
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
  await page.getByRole('button', { name: 'Add Google Docs' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  logProgress('Saved agent configuration');

  // Assert MCP is created
  await expect(page.getByText('Google Docs', { exact: true })).toBeVisible();
  logProgress('Google Docs MCP created successfully');
  // open panel
  //await page.pause();

  await page
    .locator('div')
    .filter({ hasText: /^Google Docs8 ToolsAdd ToolsAdd Actions$/ })
    .getByRole('img')
    .first()
    .click();
  // assert mcp/tool
  await expect(page.getByText('Create Doc')).toBeVisible();
});

test('Use Google Docs Agent', async ({ page }) => {
  logProgress('Starting Use Google Docs Agent test');
  await page.goto('http://localhost:3080/');

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('Verified on main chat page');
  // START

  await page
    .getByTestId('text-input')
    .fill('Create a 500 word doc about musician Carlos Alomar. Include a discography.');
  await page.getByTestId('send-button').click();
  logProgress('Sent message to create document');

  await expect(page.getByRole('button', { name: 'Running Check Connection' })).toBeVisible({
    timeout: 15000,
  });
  logProgress('✅ Running Check Connection');

  await expect(page.getByRole('button', { name: 'Ran Check Connection' })).toBeVisible({
    timeout: 15000,
  });
  logProgress('✅ Ran Check Connection');

  // Handle Google Docs Authentication
  await handleGoogleOAuth(page, 'Google Docs');

  await page.getByTestId('text-input').fill('Ok, please try now');
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to try again since now authenticated');

  // await page.pause();

  await expect(page.getByRole('button', { name: 'Running Create Markdown Doc' })).toBeVisible({
    timeout: 60000,
  });
  logProgress('✅ Running Create Markdown Doc');

  await expect(page.getByRole('button', { name: 'Ran Create Markdown Doc' })).toBeVisible({
    timeout: 90000,
  });
  logProgress('✅ Ran Create Markdown Doc');

  const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  await cleanupAgents(testUserEmail);
  await cleanupChats(testUserEmail);
  logProgress('Cleaned up agents and chats for test user');
});
