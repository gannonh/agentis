import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { handleInitialAuth } from '../utils/oAuth';
import { createFileAuth, type FileAuthConfig } from '../utils/fileAuthentication';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Google Sheets MCP Tests', () => {
  let fileAuth: FileAuthConfig;

  test.beforeAll(async ({ browser }) => {
    // Create file-scoped authentication for this test file
    fileAuth = await createFileAuth(browser, 'google-sheets-mcp');
    logProgress(`✅ Created file authentication for user: ${fileAuth.user.email}`);
  });

  test('Create Google Sheets MCP', async ({ browser }) => {
    logProgress('Starting Create Google Sheets MCP test');

    // Create a new context with the file-specific storage state
    const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
    const page = await context.newPage();

    await page.goto('http://localhost:3080/');

    // With storage state, we should be automatically authenticated

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

    await page.getByRole('option', { name: 'claude-3-7-sonnet-20250219' }).locator('span').click();
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

    // Wait for save operation to complete
    try {
      await page.waitForTimeout(2000); // Give server time to save
      logProgress('Waited for save operation to complete');
    } catch (error) {
      logProgress('⚠️ Save wait timeout, continuing...');
    }

    logProgress('Saved agent configuration');

    // Assert MCP is created
    await expect(
      page.getByLabel('Agent Builder').getByText('Google Sheets', { exact: true }),
    ).toBeVisible();
    logProgress('✅ Google Sheets MCP created successfully');
    await page.getByLabel('Agent Builder').getByText('Google Sheets', { exact: true }).click();

    // assert mcp/tool
    await expect(page.getByText('Create New Spreadsheet')).toBeVisible();

    // Close the context
    await context.close();
  });

  test('Use Google Sheets Agent', async ({ browser }) => {
    if (process.env.CI) {
      logProgress('⚠️ CI mode - Skipping Use Google Sheets Agent test');
    } else {
      logProgress('✅ Starting Use Google Sheets Agent test');

      // Create a new context with the file-specific storage state
      const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
      const page = await context.newPage();

      await page.goto('http://localhost:3080/');

      // With storage state, we should be automatically authenticated

      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('✅ Verified on main chat page');

      // Select the Google Sheets Agent explicitly to avoid conflicts with other parallel tests
      await page.getByRole('button', { name: 'Select a model' }).click();
      await page.getByText('Agents', { exact: true }).first().click();

      // Debug: Check if any agents are available
      const agentsContainer = page.getByLabel('Agents');
      await expect(agentsContainer).toBeVisible();

      // Wait longer and add debug logging
      try {
        await expect(agentsContainer.getByText('Google Sheets Agent').first()).toBeVisible({
          timeout: 15000,
        });
      } catch (error) {
        // Debug: Log all available agents
        const allAgents = await agentsContainer.locator('text=').allTextContents();
        console.log('Available agents:', allAgents);

        // Try alternative selectors
        const agentExists = await page.locator('text=Google Sheets Agent').count();
        console.log('Agent count:', agentExists);

        throw new Error(`Google Sheets Agent not found. Available agents: ${allAgents.join(', ')}`);
      }

      await agentsContainer.getByText('Google Sheets Agent').first().click();
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
        await expect(
          page.getByRole('button', { name: 'Running Create New Spreadsheet' }),
        ).toBeVisible({
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
      try {
        await expect(
          page.getByRole('button', { name: 'Running Create New Spreadsheet' }),
        ).toBeVisible({
          timeout: 30000,
        });
        logProgress('✅ Found "Running Create" tool execution after authentication');
      } catch (error) {
        logProgress('⚠️ "Running Create" tool execution not found after authentication');
      }

      // ran ------------------ (after authentication)
      // Wait for the second "Ran" button to appear (indicating completion)

      try {
        await expect(page.getByRole('button', { name: 'Ran Create New Spreadsheet' })).toHaveCount(
          2,
          {
            timeout: 30000,
          },
        );
        logProgress('✅ Found second "Ran Create" tool execution after authentication');
      } catch {
        logProgress('⚠️ Second "Ran Create" tool execution not found after authentication');
      }

      // Long wait because agent may want to do some formatting or other processing
      logProgress('⏳ Waiting for Google Sheets link to appear...');
      await expect(page.locator('a[href*="docs.google.com"]')).toBeVisible({
        timeout: 90000,
      });
      logProgress('✅ Found Google Sheets link');

      // Close the context
      await context.close();
    }
  });
}); // End of test.describe('Google Sheets MCP Tests')
