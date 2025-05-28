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
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Gmail Agent');
  await page.getByRole('textbox', { name: 'Agent description' }).dblclick();
  await page
    .getByRole('textbox', { name: 'Agent description' })
    .fill('Claude 3.5 Agent with access to Gmail.');
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
  // START

  await page
    .getByTestId('text-input')
    .fill(
      'Create a 250 word Gmail draft about musician Carlos Alomar. Include a discography.\n\nRecipient: agentis.test@gmail.com\nSubject: Carlos Alomar blurb',
    );
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create Gmail draft');

  try {
    await expect(page.getByRole('button', { name: 'Running Check Connection' })).toBeVisible({
      timeout: 15000,
    });
    logProgress('✅ Running Check Connection');
    await expect(page.getByRole('button', { name: 'Ran Check Connection' })).toBeVisible({
      timeout: 15000,
    });
    logProgress('✅ Ran Check Connection');
  } catch (error) {
    logProgress('⚠️ Check Connection step may not have appeared');
  }

  try {
    await expect(page.getByRole('button', { name: 'Running Connect to Gmail' })).toBeVisible({
      timeout: 15000,
    });
    logProgress('✅ Running Connect to Gmail');
    await expect(page.getByRole('button', { name: 'Ran Connect to Gmail' })).toBeVisible({
      timeout: 15000,
    });
    logProgress('✅ Ran Connect to Gmail');
  } catch (error) {
    logProgress('⚠️ Connect to Gmail step may not have appeared');
  }

  await handleGoogleOAuth(page, 'Gmail');

  await page.getByTestId('text-input').fill('Ok, please try now');
  await page.getByTestId('send-button').click();
  logProgress('✅ Sent follow-up message after authentication');

  //await page.pause();

  await expect(page.getByRole('button', { name: 'Running Create Email Draft' })).toBeVisible({
    timeout: 90000,
  });
  logProgress('✅ Running Create Email Draft');
  await expect(page.getByRole('button', { name: 'Ran Create Email Draft' })).toBeVisible({
    timeout: 90000,
  });
  logProgress('✅ Ran Create Email Draft');

  //await page.pause();
  const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  await cleanupAgents(testUserEmail);
  await cleanupChats(testUserEmail);
  logProgress('✅ Cleaned up agents and chats for test user');
});
