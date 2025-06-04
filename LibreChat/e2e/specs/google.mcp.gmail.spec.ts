import { test, expect } from '@playwright/test';
import cleanupAgents, { cleanupChats } from '../utils/cleanupUser';
import { logProgress } from '../utils/testLogger';
import { handleGoogleOAuth } from '../utils/handleGoogleOAuth';
import { handleConditionalAuth } from '../utils/handleConditionalAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Create Gmail MCP', async ({ page }) => {
  logProgress('Starting Create Gmail MCP test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('Verified on main chat page');
  //

  // Create Gmail
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
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Gmail Agent');
  await page.getByRole('textbox', { name: 'Agent description' }).dblclick();
  await page
    .getByRole('textbox', { name: 'Agent description' })
    .fill('Claude 3.7 Agent with access to Gmail.');
  await page.getByRole('textbox', { name: 'Agent instructions' }).dblclick();
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ControlOrMeta+a');
  await page.getByRole('textbox', { name: 'Agent instructions' }).click();
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ArrowDown');
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ArrowDown');
  await page.getByRole('textbox', { name: 'Agent instructions' }).press('ArrowRight');
  await page.getByRole('textbox', { name: 'Agent instructions' }).click();
  await page
    .getByRole('textbox', { name: 'Agent instructions' })
    .fill('You possess expert-level Gmail skills.');
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
  await page.getByRole('button', { name: 'Add Gmail' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  logProgress('Saved agent configuration');

  // Assert MCP is created

  await expect(page.getByLabel('Agent Builder').getByText('Gmail', { exact: true })).toBeVisible();
  logProgress('✅ Gmail MCP created successfully');
  await page.getByLabel('Agent Builder').getByText('Gmail', { exact: true }).click();

  // assert mcp/tool

  await expect(page.getByText('Add Label To Email')).toBeVisible();
});

test('Use Gmail Agent', async ({ page }) => {
  logProgress('✅ Starting Use Gmail Agent test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  await page
    .getByTestId('text-input')
    .fill(
      'Create a 250 word Gmail draft about musician Carlos Alomar. Include a discography.\n\nRecipient: agentis.test@gmail.com\nSubject: Carlos Alomar blurb.',
    );
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create Gmail draft');

  await expect(page.getByRole('button', { name: 'Running Create Email Draft' })).toBeVisible({
    timeout: 60000,
  });
  logProgress('✅ Found "Running Create Email Draft" tool execution');
  await expect(page.getByRole('button', { name: 'Ran Create Email Draft' })).toBeVisible({
    timeout: 10000,
  });
  logProgress('✅ Found "Ran Create Email Draft" tool execution');

  // auth ---------------------------
  // Look for the proactive authentication UI that should appear automatically
  await expect(page.getByText('Authentication Required')).toBeVisible();
  logProgress('✅ Found proactive Authentication Required section');

  // Verify the descriptive text about tools requiring authentication
  await expect(
    page.getByText('This conversation uses tools that require authentication:'),
  ).toBeVisible();
  logProgress('✅ Found descriptive text about authentication');

  // Look for the Connect Gmail button in the proactive auth UI
  await expect(page.getByRole('button', { name: 'Connect Gmail' })).toBeVisible();
  logProgress('✅ Found Connect Gmail button in proactive auth UI');
  // await page.pause();

  // Handle the authentication
  await handleGoogleOAuth(page, 'Gmail', { timeout: 90000 });
  logProgress('✅ Starting Gmail authentication');

  // Wait for authentication to complete
  logProgress('⏳ Waiting 2 sec for authentication to complete...');
  await page.waitForTimeout(2000);
  logProgress('✅ Waited for authentication to complete');

  // The proactive auth section should remain visible as part of conversation history
  await expect(page.getByText('Authentication Required')).toBeVisible();
  logProgress('✅ Proactive auth section remains visible as part of conversation history');

  // Check that the button shows "✓ Connected" after successful authentication
  await expect(page.getByText('✓ Connected')).toBeVisible();
  logProgress('✅ Found "✓ Connected" status indicating successful Gmail authentication');

  await page
    .getByTestId('text-input')
    .fill('ok, try now. please also provide a link to the draft when created.');
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent follow-up message after authentication');

  await expect(
    page.getByRole('button', { name: 'Running Create Email Draft' }).first(),
  ).toBeVisible({
    timeout: 90000,
  });
  logProgress('✅ Running Create Email Draft');
  await expect(page.getByRole('button', { name: 'Ran Create Email Draft' }).first()).toBeVisible({
    timeout: 90000,
  });

  logProgress('✅ Ran Create Email Draft');
});
