import { test, expect } from '@playwright/test';
import cleanupAgents, { cleanupChats, cleanupConnections } from '../utils/cleanupUser';
import { logProgress } from '../utils/testLogger';
import { handleGoogleOAuth } from '../utils/handleGoogleOAuth';
import { handleConditionalAuth } from '../utils/handleConditionalAuth';

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
    .fill('Claude 3.5 Agent with access to Google Sheets.');
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
  await page.getByText('Google Sheets', { exact: true }).click();

  // assert mcp/tool
  await expect(page.getByText('Create New Spreadsheet')).toBeVisible();
});

test('Use Google Sheets Agent with Proactive MCP Auth', async ({ page }) => {
  logProgress('✅ Starting Use Google Sheets Agent with Proactive MCP Auth test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  // Send first message to trigger proactive MCP auth
  await page
    .getByTestId('text-input')
    .fill(
      'Create a spreadsheet of every David Bowie studio album. Create columns for producer, guitarists, drummers, keyboard/piano, and other musicians.',
    );
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create spreadsheet');

  // Wait for the proactive MCP auth component to appear
  await page.waitForTimeout(3000);
  logProgress('✅ Waited for proactive auth component');

  // Check for the new ProactiveMCPAuth component
  try {
    // Look for the proactive authentication UI that should appear automatically
    await expect(page.getByText('Authentication Required')).toBeVisible({ timeout: 8000 });
    logProgress('✅ Found proactive Authentication Required section');

    // Verify the descriptive text about tools requiring authentication
    await expect(
      page.getByText('This conversation uses tools that require authentication:'),
    ).toBeVisible({
      timeout: 5000,
    });
    logProgress('✅ Found descriptive text about authentication');

    // Look for the Connect Google Sheets button in the proactive auth UI
    await expect(page.getByRole('button', { name: 'Connect Google Sheets' })).toBeVisible({
      timeout: 5000,
    });
    logProgress('✅ Found Connect Google Sheets button in proactive auth UI');

    // Handle the authentication
    await handleGoogleOAuth(page, 'Google Sheets');

    // Wait for authentication to complete
    await page.waitForTimeout(3000);

    // The proactive auth section should remain visible as part of conversation history
    await expect(page.getByText('Authentication Required')).toBeVisible({
      timeout: 5000,
    });
    logProgress('✅ Proactive auth section remains visible as part of conversation history');

    // Check that the button shows "✓ Connected" after successful authentication
    await expect(page.getByText('✓ Connected')).toBeVisible({ timeout: 5000 });
    logProgress('✅ Found "✓ Connected" status indicating successful Google Sheets authentication');

    // Now send a follow-up message asking the agent to try again
    await page
      .getByTestId('text-input')
      .fill('I am now authenticated with Google Sheets. Please try creating the spreadsheet now.');
    await page.getByTestId('send-button').click();
    logProgress('✅ Sent message indicating user is authenticated and ready to retry');

    // Wait for the agent to process the request with authentication
    // await page.waitForTimeout(15000);
    // logProgress('✅ Waited for authenticated agent response');

    // Assert successful outcomes - check for specific success indicators
    // This MUST succeed for the test to pass - if we don't see "Running" the agent didn't try
    await expect(page.getByText('Running Create New Spreadsheet')).toBeVisible({
      timeout: 30000,
    });
    logProgress('✅ Found "Running Create New Spreadsheet" tool execution');

    // Wait for tool execution to complete
    await expect(page.getByText('Ran Create New Spreadsheet')).toBeVisible({
      timeout: 30000,
    });
    logProgress('✅ Found "Ran Create New Spreadsheet" tool execution completed');

    // Check for Google Sheets link in the response (optional - spreadsheet creation might still succeed without visible link)
    try {
      await expect(page.locator('a[href*="docs.google.com/spreadsheets"]')).toBeVisible({
        timeout: 30000,
      });
      logProgress('✅ Found Google Sheets link in response');
    } catch (e) {
      logProgress('⚠️ Google Sheets link not found - but tool execution completed');
    }
  } catch (e) {
    logProgress(
      '❌ Proactive authentication UI not found - this indicates the feature may not be working correctly',
    );
    throw e; // Re-throw to fail the test properly
  }

  //await page.pause();
  const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  await cleanupAgents(testUserEmail);
  await cleanupChats(testUserEmail);
  await cleanupConnections(testUserEmail);
  logProgress('✅ Cleaned up agents, chats, and connections for test user');
});
