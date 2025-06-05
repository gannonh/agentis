import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { handleGoogleOAuth } from '../utils/handleGoogleOAuth';
import { handleConditionalAuth } from '../utils/handleConditionalAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('template_test', async ({ page }) => {
  logProgress('Starting test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('Verified on main chat page');

  // DO CREATE STUFF -----------///////
  logProgress('🚀 Starting agent creation');
  await page.getByRole('button', { name: 'Controls' }).click();
  await page.getByRole('button', { name: 'Agent Builder' }).click();
  await page.getByRole('textbox', { name: 'Agent name' }).click();
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Multi Agent');
  await page.getByRole('textbox', { name: 'Agent description' }).click();
  await page
    .getByRole('textbox', { name: 'Agent description' })
    .fill(
      "Seamlessly work across Google's core productivity tools to manage complex projects, analyze data, and create comprehensive documentation.",
    );
  await page.getByRole('textbox', { name: 'Agent instructions' }).click();
  await page
    .getByRole('textbox', { name: 'Agent instructions' })
    .fill(
      'You are a Google Workspace integration expert with mastery of Drive, Docs, and Sheets working together as a unified system. You excel at creating sophisticated workflows that leverage the strengths of each tool while maintaining seamless connections between them.\nCore Capabilities:\n\nCreate integrated solutions that span multiple Google tools (e.g., Sheets data feeding into Docs reports, all organized in Drive)\nMaintain consistent naming conventions and folder structures across all created assets\nAlways provide direct links to all files and folders you create or modify\nProactively suggest which tool is best for each task component\n\nWhen working on projects:\n\nStart by understanding the full scope and create a Drive folder structure to organize all assets\nUse Sheets for data storage, calculations, and analysis\nUse Docs for reports, documentation, and formatted output\nCreate dynamic connections between tools (e.g., embedding Sheets charts in Docs)\nMaintain a "project index" document that links to all related files\n\nBest Practices:\n\nAsk clarifying questions upfront to understand the complete workflow before starting\nCreate templates for recurring needs\nSuggest automation opportunities between tools\nMaintain version control by creating copies before major changes\nUse clear, descriptive file names that indicate relationships (e.g., "Q4_Sales_Data.sheets" and "Q4_Sales_Report.docs")\nProvide a summary of the file structure and how components connect\n\nCommunication Style:\n\nBegin responses with a brief project plan outlining which tools you\'ll use for what\nExplain the connections between different files and why you\'ve organized things a certain way\nOffer tips for maintaining and expanding the system you\'ve created\nAlways end with a clear list of all created/modified files with their links and purposes\n\nRemember: You\'re not just using three separate tools - you\'re orchestrating them as an integrated workspace solution.',
    );
  logProgress('✅ Filled out agent details');
  // Select model
  await page.getByLabel('Agent Builder').getByRole('button', { name: 'Select a model' }).click();
  await page.getByRole('combobox', { name: 'Provider' }).click();
  await page.getByText('Anthropic').click();
  await page.getByRole('combobox', { name: 'Model' }).click();
  await page.getByRole('option', { name: 'claude-opus-4-' }).locator('span').click();
  logProgress('✅ Selected Anthropic Claude Opus 4 model');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  logProgress('✅ Created agent');

  await page
    .getByLabel('Agent Builder')
    .getByRole('button')
    .filter({ hasText: /^$/ })
    .first()
    .click();
  // Add tools to the agent
  logProgress('🚀 Adding tools to agent');
  await page.getByRole('button', { name: 'Add Tools' }).click();
  // Add Google Drive
  await page.getByRole('button', { name: 'Add Google Drive' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  logProgress('✅ Added Google Drive tool');
  // Add Google Docs
  await page.getByRole('button', { name: 'Add Google Docs' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  logProgress('✅ Added Google Docs tool');
  // Add Google Sheets
  await page.getByRole('button', { name: 'Add Google Sheets' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  logProgress('✅ Added Google Sheets tool');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByTestId('featured-toggle').click();
  await page.getByRole('button', { name: 'Save' }).click();
  logProgress('✅ Saved agent with all tools 🎉');

  await expect(page.getByRole('button', { name: 'Start chat with Google Multi' })).toBeVisible();
  logProgress('✅ Found "Start chat with Google Multi Agent" button');
  await expect(page.getByTestId('agent-discovery-grid').getByRole('heading')).toContainText(
    'Google Multi Agent',
  );
  logProgress('✅ Found agent name in discovery grid');
  await expect(page.getByTestId('agent-discovery-grid').getByRole('paragraph')).toContainText(
    "Seamlessly work across Google's core productivity tools to manage",
  );
  logProgress('✅ Found agent description in discovery grid');
  await expect(page.getByTestId('agent-discovery-grid').locator('span')).toContainText(
    '+25 more tools',
  );
  logProgress('✅ Found "+25 more tools" in discovery grid');
});

test('Use Google Multi Agent', async ({ page }) => {
  logProgress('Starting Use Google Multi Agent test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  // Send first message to trigger proactive MCP auth
  await page
    .getByTestId('text-input')
    .fill('Hello! What tools do you have? What are your capabilities?');

  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message');

  // assert auth elements ---------------------------
  await expect(page.getByText('Authentication Required')).toBeVisible();
  logProgress('✅ Found proactive Authentication Required section');
  await expect(page.getByRole('main')).toContainText(
    'This conversation uses tools that require authentication:',
  );
  logProgress('✅ Found descriptive text about authentication');
  await expect(page.getByRole('button', { name: 'Connect Google Drive' })).toBeVisible();
  logProgress('✅ Found Connect Google Drive button in proactive auth UI');
  await expect(page.getByRole('button', { name: 'Connect Google Docs' })).toBeVisible();
  logProgress('✅ Found Connect Google Docs button in proactive auth UI');
  await expect(page.getByRole('button', { name: 'Connect Google Sheets' })).toBeVisible();
  logProgress('✅ Found Connect Google Sheets button in proactive auth UI');

  // DO PRE-AUTH STUFF -----------///////

  // Google Docs authentication --------------------
  logProgress('✅ starting Google Docs authentication');

  await handleGoogleOAuth(page, 'Google Docs');

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

  // Handle the Google Sheets authentication
  logProgress('✅ starting Google Sheets authentication');
  await handleGoogleOAuth(page, 'Google Sheets');

  // scroll the page up
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  logProgress('✅ Scrolled to top of page');

  // Handle google drive authentication
  logProgress('✅ starting Google Drive authentication');
  await handleGoogleOAuth(page, 'Google Drive');

  // scroll the page up
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  logProgress('✅ Scrolled to top of page');
  // Wait for authentication to complete
  logProgress('⏳ Waiting 2 sec for authentication to complete...');
  await page.waitForTimeout(2000);

  // DO POST-AUTH STUFF -----------///////
  await expect(page.getByRole('button', { name: '✓ Connected' }).first()).toBeVisible();
  logProgress('✅ Found "✓ Connected" status for Google Docs');

  await expect(page.getByRole('button', { name: '✓ Connected' }).nth(1)).toBeVisible();
  logProgress('✅ Found "✓ Connected" status for Google Sheets');

  await expect(page.getByRole('button', { name: '✓ Connected' }).nth(2)).toBeVisible();
  logProgress('✅ Found "✓ Connected" status for Google Drive');
});
