import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { handleConditionalAuth } from '../utils/handleConditionalAuth';
import { handleInitialAuth } from '../utils/googleAuth';
import { log } from 'console';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Create Google Sheets MCP', async ({ page }) => {
  logProgress('Starting Create Google Sheets MCP test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

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

  await page.getByRole('option', { name: 'claude-3-7-sonnet-' }).locator('span').click();
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
  logProgress('Google Sheets MCP created successfully');
  // open panel
  await page.getByText('Google Sheets', { exact: true }).click();

  // assert mcp/tool
  await expect(page.getByText('Create New Spreadsheet')).toBeVisible();
});

test('Use Google Sheets Agent', async ({ page }) => {
  logProgress('Starting Use Google Sheets Agent test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  // Select the Google Sheets Agent explicitly to avoid conflicts with other parallel tests
  await page.getByRole('button', { name: 'Select a model' }).click();
  await page.getByText('Agents', { exact: true }).click();
  await page.getByLabel('Agents').getByText('Google Sheets Agent').click();
  logProgress('✅ Selected Google Sheets Agent');

  // Send first message to trigger proactive MCP auth
  await page
    .getByTestId('text-input')
    .fill(
      'Create a spreadsheet of every David Bowie studio album. Create columns for producer, guitarists, drummers, keyboard/piano, and other musicians.',
    );
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create spreadsheet');

  // run ------------------
  try {
    await expect(page.getByRole('button', { name: 'Running Create New Spreadsheet' })).toBeVisible({
      timeout: 5000,
    });
    logProgress('✅ Found "Running Create" tool execution');
  } catch (error) {
    logProgress('⚠️ "Running Create" tool execution not found within timeout');
  }

  // ran ------------------
  try {
    await expect(page.getByRole('button', { name: 'Ran Create New Spreadsheet' })).toBeVisible({
      timeout: 5000,
    });
    logProgress('✅ Found "Ran Create" tool execution');
  } catch (error) {
    logProgress('⚠️ "Ran Create" tool execution not found within timeout');
  }

  // auth ---------------------------
  // Look for the proactive authentication UI that should appear automatically
  await expect(page.getByText('Authentication Required')).toBeVisible();
  logProgress('✅ Found proactive Authentication Required section');

  // Verify the descriptive text about tools requiring authentication
  await expect(
    page.getByText('This conversation uses tools that require authentication:'),
  ).toBeVisible();
  logProgress('✅ Found descriptive text about authentication');

  // Look for the Connect Google Sheets button in the proactive auth UI
  await expect(page.getByRole('button', { name: 'Connect Google Sheets' })).toBeVisible();
  logProgress('✅ Found Connect Google Sheets button in proactive auth UI');

  // Handle the authentication
  logProgress('✅ Starting Google Sheets authentication');
  const popup = await handleInitialAuth(page, 'Google Sheets');

  // Handle the consent screens
  try {
    await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 10000 });
    logProgress('✅ Clicked Continue on first consent screen');
  } catch (error) {
    logProgress('⚠️ Consent screen 1 handling completed or not needed');
  }
  try {
    await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 10000 });
    logProgress('✅ Clicked Continue on second consent screen');
  } catch (error) {
    logProgress('⚠️ Consent screen 2 handling completed or not needed');
  }
  try {
    await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 10000 });
    logProgress('✅ Clicked Continue on third consent screen');
  } catch (error) {
    logProgress('⚠️ Consent screen 3 handling completed or not needed');
  }

  // Wait for authentication to complete
  logProgress('⏳ Waiting 2 sec for authentication to complete...');
  await page.waitForTimeout(2000);
  logProgress('✅ Waited for authentication to complete');

  // The proactive auth section should remain visible as part of conversation history
  await expect(page.getByText('Authentication Required')).toBeVisible();
  logProgress('✅ Proactive auth section remains visible as part of conversation history');

  // Check that the button shows "✓ Connected" after successful authentication
  await expect(page.getByText('✓ Connected')).toBeVisible();
  logProgress('✅ Found "✓ Connected" status indicating successful Google Docs authentication');

  // try again -------------------
  await page.getByTestId('text-input').click();
  await page
    .getByTestId('text-input')
    .fill('ok, try now. please also provide a link to the sheet when created.');
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create sheet after authentication');

  // run ------------------ (after authentication)
  await expect(page.getByRole('button', { name: 'Running Create New Spreadsheet' })).toBeVisible({
    timeout: 30000,
  });
  logProgress('✅ Found "Running Create" tool execution after authentication');

  // ran ------------------ (after authentication)
  // Wait for the second "Ran" button to appear (indicating completion)
  await expect(page.getByRole('button', { name: 'Ran Create New Spreadsheet' })).toHaveCount(2, {
    timeout: 30000,
  });
  logProgress('✅ Found second "Ran Create" tool execution after authentication');

  // Long wait because agent may want to do some formatting or other processing
  logProgress('⏳ Waiting for Google Sheets link to appear...');
  await expect(page.locator('a[href*="docs.google.com"]')).toBeVisible({
    timeout: 90000,
  });
  logProgress('✅ Found Google Sheets link');

  //await page.pause();
});
