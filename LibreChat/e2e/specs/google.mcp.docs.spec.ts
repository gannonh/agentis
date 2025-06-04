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

test('Create Google Docs MCP', async ({ page }) => {
  logProgress('Starting Create Google Docs MCP test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('Verified on main chat page');
  //

  // Create Google Docs Agent
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
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Docs Agent');
  await page.getByRole('textbox', { name: 'Agent description' }).dblclick();
  await page
    .getByRole('textbox', { name: 'Agent description' })
    .fill('Sonnet 3.5 with access to Google Docs');
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
  await page.getByText('Google Docs', { exact: true }).click();

  // assert mcp/tool
  await expect(page.getByText('Create Doc')).toBeVisible();
});

test('Use Google Docs Agent', async ({ page }) => {
  logProgress('Starting Use Google Docs Agent test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  // Send first message to trigger proactive MCP auth
  await page
    .getByTestId('text-input')
    .fill('Create a 250 word doc about musician Carlos Alomar. Include a discography.');

  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create document');

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

    // Look for the Connect Google Docs button in the proactive auth UI
    await expect(page.getByRole('button', { name: 'Connect Google Docs' })).toBeVisible({
      timeout: 5000,
    });
    logProgress('✅ Found Connect Google Docs button in proactive auth UI');

    // Handle the authentication
    await handleGoogleOAuth(page, 'Google Docs');

    // Wait for authentication to complete
    await page.waitForTimeout(3000);

    // The proactive auth section should remain visible as part of conversation history
    await expect(page.getByText('Authentication Required')).toBeVisible({
      timeout: 5000,
    });
    logProgress('✅ Proactive auth section remains visible as part of conversation history');

    // Check that the button shows "✓ Connected" after successful authentication
    await expect(page.getByText('✓ Connected')).toBeVisible({ timeout: 5000 });
    logProgress('✅ Found "✓ Connected" status indicating successful Google Docs authentication');

    // Check if the agent already created the doc while we were authenticating
    let docAlreadyCreated = false;
    try {
      // Quick check for success indicators
      const successCheck = await Promise.race([
        page.locator('text=/Ran Create/').waitFor({ state: 'visible', timeout: 3000 }),
        page.locator('a[href*="docs.google.com/"]').waitFor({ state: 'visible', timeout: 3000 }),
      ])
        .then(() => true)
        .catch(() => false);

      if (successCheck) {
        docAlreadyCreated = true;
        logProgress('✅ Document was already created during authentication');
      }
    } catch (e) {
      // Not created yet, continue
    }

    // Only send retry message if doc wasn't already created
    if (!docAlreadyCreated) {
      logProgress('📝 Document not created yet, sending retry message');

      // Wait a bit before sending retry
      await page.waitForTimeout(3000);

      // Send a simpler retry message
      await page.getByTestId('text-input').click();
      await page.getByTestId('text-input').fill('Please try creating the document now.');
      await page.getByTestId('send-button').click();
      logProgress('✅ Sent retry message');

      // Give the agent time to process
      await page.waitForTimeout(8000);
      logProgress('⏳ Waiting for agent to process the authenticated request');
    }

    // Check for "Running" indicator (optional)
    try {
      await expect(page.locator('text=/Running Create/')).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Found "Running Create" tool execution');
    } catch (e) {
      logProgress('⚠️ "Running Create" not found - checking for completion indicators');
    }

    // Check for success indicators in parallel - test passes when either is found
    const successIndicators = [
      {
        locator: page.locator('text=/Ran Create/'),
        name: '"Ran Create" tool execution completed',
      },
      {
        locator: page.locator('a[href*="docs.google.com/"]'),
        name: 'Google Docs link',
      },
    ];

    try {
      // Race all success indicators - resolves when first one is found
      const result = await Promise.race(
        successIndicators.map(async (indicator) => {
          try {
            await indicator.locator.waitFor({ state: 'visible', timeout: 30000 });
            return indicator.name;
          } catch (e) {
            // This promise will never resolve if element not found
            return new Promise(() => {});
          }
        }),
      );
      //await page.pause();
      logProgress(`✅ Test passed: Found ${result}`);
    } catch (e) {
      // If Promise.race times out, none of the indicators were found
      throw new Error(
        'Test failed: Neither "Ran Create" nor Google Docs link found within timeout',
      );
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
