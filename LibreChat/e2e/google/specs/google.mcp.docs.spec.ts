import { test, expect } from '@playwright/test';
import cleanupAgents from '../../utils/cleanupAgents';
import { handleInitialPageState } from '../../utils/handleInitialPageState';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Create Google Docs MCP', async ({ page }) => {
  await page.goto('http://localhost:3080/');

  // Handle TOS and login if needed
  await handleInitialPageState(page);

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
  //
  //await page.pause();
  //
  await page.getByRole('textbox', { name: 'Agent name' }).click();
  await page.getByRole('textbox', { name: 'Agent name' }).press('ControlOrMeta+c');
  await page.getByRole('textbox', { name: 'Agent name' }).dblclick();
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Docs Agent');
  await page
    .getByRole('textbox', { name: 'Agent description' })
    .fill('Sonnet 3.7 with access to Google Sheets');
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
  await page.getByRole('button', { name: 'Add Google Docs' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  // Assert MCP is created
  await expect(page.getByText('Google Docs', { exact: true })).toBeVisible();
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
  await page.goto('http://localhost:3080/');

  // Handle TOS and login if needed
  await handleInitialPageState(page);
  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  // START

  await page
    .getByTestId('text-input')
    .fill('Create a 500 word doc about musician Carlos Alomar. Include a discograph.');
  await page.getByTestId('send-button').click();

  await expect(page.getByRole('button', { name: 'Running Composio Check Active' })).toBeVisible({
    timeout: 15000,
  });
  console.log('✅ Composio Check Active started running');

  await expect(page.getByRole('button', { name: 'Ran Composio Check Active' })).toBeVisible({
    timeout: 15000,
  });
  console.log('✅ Composio Check Active completed');

  // Handle Google Docs Authentication
  try {
    await page
      .getByRole('link', { name: 'Google Docs Authorization Link' })
      .click({ timeout: 20000 });
    const page1Promise = page.waitForEvent('popup');

    const page1 = await page1Promise;
    await page1.getByRole('textbox', { name: 'Email or phone' }).click();
    await page1.getByRole('textbox', { name: 'Email or phone' }).fill('agentis.test@gmail.com');
    await page1.getByRole('button', { name: 'Next' }).click();
    await page1.getByRole('textbox', { name: 'Enter your password' }).click();
    await page1.getByRole('textbox', { name: 'Enter your password' }).fill('KJHkh97HKH87jjfU');
    await page1.getByRole('button', { name: 'Next' }).click();
    await page1.getByRole('button', { name: 'Continue' }).click();
    await page1.getByRole('checkbox', { name: 'See, edit, create, and delete' }).check();
    await page1.getByRole('button', { name: 'Continue' }).click();
  } catch (e) {
    // Modal might not appear, continue
    console.log('No Google Docs Authorization Link');
  }

  await expect(page.getByRole('button', { name: 'Ran Create Document Markdown' })).toBeVisible({
    timeout: 60000,
  });

  await page.pause();
  const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
  await cleanupAgents(testUserEmail);
});
