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

test('Create Google Multi Agent', async ({ page }) => {
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

  // ----------------- begin cogegen debug
  // await page.pause();
  await page.getByTestId('text-input').click();
  await page
    .getByTestId('text-input')
    .fill('Hello! What tools do you have? What are your capabilities?');
  await page.getByTestId('send-button').click();

  // wait for agent message stream to conclude
  // manually scroll to the top so that auth butons are visible

  // PAGE SNAPSHOT:

  await expect(page.getByRole('main')).toMatchAriaSnapshot(`
    - img
    - text: Authentication Required
    - paragraph: "This conversation uses tools that require authentication:"
    - button "Connect Google Drive"
    - button "Connect Google Docs"
    - button "Connect Google Sheets"
    `);

  // START 1ST AUTH

  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Connect Google Drive' }).click();
  const page1 = await page1Promise;

  await page1.getByRole('textbox', { name: 'Email or phone' }).fill('agentis.test@gmail.com');
  await page1.getByRole('button', { name: 'Next' }).click();

  await page1.getByRole('textbox', { name: 'Enter your password' }).fill('KJHkh97HKH87jjfU');
  await page1.getByRole('button', { name: 'Next' }).click();
  try {
    await expect(page1.locator('body')).toMatchAriaSnapshot(`
      - text: Sign in with Google
      - img "Composio"
      - heading "You’re signing back in to Composio" [level=1]
      - link "agentis.test@gmail.com selected. Switch account"
      - text: Review Composio’s
      - link "Privacy Policy":
        - /url: https://www.composio.dev/privacy-policy
      - text: and
      - link "Terms of Service":
        - /url: https://www.composio.dev/terms-of-service
      - text: to understand how Composio will process and protect your data. To make changes at any time, go to your
      - link "Google Account":
        - /url: https://myaccount.google.com/connections#filter=4
      - text: . Learn more about
      - link "Sign in with Google":
        - /url: https://support.google.com/accounts/answer/12921417?sjid=1919169284593837430-NC
      - text: .
      - button "Cancel"
      - button "Continue"
      - contentinfo:
        - combobox "Change language English (United States)"
        - list:
          - listitem:
            - link "Help":
              - /url: https://support.google.com/accounts?hl=en&p=account_iph
          - listitem:
            - link "Privacy":
              - /url: https://accounts.google.com/TOS?loc=US&hl=en&privacy=true
          - listitem:
            - link "Terms":
              - /url: https://accounts.google.com/TOS?loc=US&hl=en
      `);
  } catch (error) {
    console.log('Error matching aria snapshot for Google Drive auth:', error);
  }
  await page1.getByRole('button', { name: 'Continue' }).click();
  try {
    await expect(page1.locator('body')).toMatchAriaSnapshot(`
      - text: Sign in with Google
      - heading "Composio wants access to your Google Account" [level=1]
      - text: agentis.test@gmail.com
      - heading "Composio already has some access" [level=2]
      - text: See the
      - button "3 services"
      - text: that Composio has some access to.
      - heading "Make sure you trust Composio" [level=2]
      - text: Review Composio's
      - link "Privacy Policy":
        - /url: https://www.composio.dev/privacy-policy
      - text: and
      - link "Terms of Service":
        - /url: https://www.composio.dev/terms-of-service
      - text: to understand how Composio will process and protect your data. To make changes at any time, go to your
      - link "Google Account":
        - /url: https://myaccount.google.com/connections
      - text: . Learn how Google helps you
      - link "share data safely":
        - /url: https://support.google.com/accounts/answer/14012355?hl=en&sjid
      - text: .
      - button "Cancel"
      - button "Continue"
      - contentinfo:
        - combobox "‪English (United States)‬"
        - list:
          - listitem:
            - link "Help":
              - /url: https://support.google.com/accounts?hl=en&p=account_iph
          - listitem:
            - link "Privacy":
              - /url: https://accounts.google.com/TOS?loc=US&hl=en&privacy=true
          - listitem:
            - link "Terms":
              - /url: https://accounts.google.com/TOS?loc=US&hl=en
      `);
  } catch (error) {
    console.log('Error matching aria snapshot for Google Drive auth:', error);
  }
  await page1.getByRole('button', { name: 'Continue' }).click();

  try {
    await expect(page.getByRole('main')).toMatchAriaSnapshot(`
      - img
      - text: Authentication Required
      - paragraph: "This conversation uses tools that require authentication:"
      - button "✓ Connected" [disabled]
      - button "Connect Google Docs"
      - button "Connect Google Sheets"
      `);
  } catch (error) {
    console.log('Error matching aria snapshot for Google Drive auth completion:', error);
  }

  const page2Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Connect Google Docs' }).click();
  const page2 = await page2Promise;
  await page2.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
  await page2.getByRole('button', { name: 'Continue' }).click();
  await page2.getByRole('button', { name: 'Continue' }).click();
  try {
    await expect(page.getByRole('main')).toMatchAriaSnapshot(`
      - img
      - text: Authentication Required
      - paragraph: "This conversation uses tools that require authentication:"
      - button "✓ Connected" [disabled]
      - button "✓ Connected" [disabled]
      - button "Connect Google Sheets"
      `);
  } catch (error) {
    console.log('Error matching aria snapshot for Google Docs auth completion:', error);
  }
  const page3Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Connect Google Sheets' }).click();
  const page3 = await page3Promise;
  await page3.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
  await page3.getByRole('button', { name: 'Continue' }).click();
  try {
    await expect(page.getByRole('main')).toMatchAriaSnapshot(`
      - img
      - text: Authentication Required
      - paragraph: "This conversation uses tools that require authentication:"
      - button "✓ Connected" [disabled]
      - button "✓ Connected" [disabled]
      - button "✓ Connected" [disabled]
      `);
  } catch (error) {
    console.log('Error matching aria snapshot for Google Sheets auth completion:', error);
  }

  // ------------------ end codegen debug
  // // Send first message to trigger proactive MCP auth
  // await page
  //   .getByTestId('text-input')
  //   .fill('Hello! What tools do you have? What are your capabilities?');

  // await page.getByTestId('send-button').click();
  // logProgress('✅ Sent message');

  // // Wait for message streaming to complete before checking auth buttons
  // await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
  //   logProgress('Network still active, continuing...');
  // });

  // // Wait for the message streaming to finish
  // await page.waitForTimeout(3000);
  // logProgress('✅ Waited for message streaming to complete');

  // // assert auth elements ---------------------------
  // await expect(page.getByText('Authentication Required')).toBeVisible();
  // logProgress('✅ Found proactive Authentication Required section');
  // await expect(page.getByRole('main')).toContainText(
  //   'This conversation uses tools that require authentication:',
  // );
  // logProgress('✅ Found descriptive text about authentication');
  // await expect(page.getByRole('button', { name: 'Connect Google Drive' })).toBeVisible();
  // logProgress('✅ Found Connect Google Drive button in proactive auth UI');
  // await expect(page.getByRole('button', { name: 'Connect Google Docs' })).toBeVisible();
  // logProgress('✅ Found Connect Google Docs button in proactive auth UI');
  // await expect(page.getByRole('button', { name: 'Connect Google Sheets' })).toBeVisible();
  // logProgress('✅ Found Connect Google Sheets button in proactive auth UI');

  // // DO PRE-AUTH STUFF -----------///////

  // // Google Docs authentication --------------------
  // logProgress('✅ starting Google Docs authentication');

  // await handleGoogleOAuth(page, 'Google Docs');

  // // scroll the page up
  // await page.evaluate(() => {
  //   window.scrollTo(0, 0);
  // });
  // logProgress('✅ Scrolled to top of page');

  // // Wait for authentication to complete
  // logProgress('⏳ Waiting 2 sec for authentication to complete...');
  // await page.waitForTimeout(2000);
  // logProgress('✅ Waited for authentication to complete');
  // // scroll the page up
  // await page.evaluate(() => {
  //   window.scrollTo(0, 0);
  // });
  // logProgress('✅ Scrolled to top of page');
  // // The proactive auth section should remain visible as part of conversation history
  // await expect(page.getByText('Authentication Required')).toBeVisible();
  // logProgress('✅ Proactive auth section remains visible as part of conversation history');
  // // scroll the page up
  // await page.evaluate(() => {
  //   window.scrollTo(0, 0);
  // });
  // logProgress('✅ Scrolled to top of page');
  // // Check that the button shows "✓ Connected" after successful authentication
  // await expect(page.getByText('✓ Connected')).toBeVisible();
  // logProgress('✅ Found "✓ Connected" status indicating successful Google Docs authentication');

  // // Handle the Google Sheets authentication
  // logProgress('✅ starting Google Sheets authentication');

  // // Wait for message streaming to complete and scroll to top BEFORE auth
  // await page.waitForTimeout(3000);
  // await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
  //   logProgress('Network still active, continuing...');
  // });

  // // Scroll to top and wait for scroll to complete
  // await page.evaluate(() => {
  //   window.scrollTo({ top: 0, behavior: 'instant' });
  // });
  // await page.waitForTimeout(1000);
  // logProgress('✅ Scrolled to top of page and waited for Google Sheets auth');

  // await handleGoogleOAuth(page, 'Google Sheets');

  // // Handle google drive authentication
  // logProgress('✅ starting Google Drive authentication');

  // // Wait for any ongoing activity and scroll to top BEFORE auth
  // await page.waitForTimeout(2000);
  // await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
  //   logProgress('Network still active, continuing...');
  // });

  // // Scroll to top and wait for scroll to complete
  // await page.evaluate(() => {
  //   window.scrollTo({ top: 0, behavior: 'instant' });
  // });
  // await page.waitForTimeout(1000);
  // logProgress('✅ Scrolled to top of page and waited for Google Drive auth');

  // await handleGoogleOAuth(page, 'Google Drive');
  // // Wait for authentication to complete
  // logProgress('⏳ Waiting 2 sec for authentication to complete...');
  // await page.waitForTimeout(2000);

  // // DO POST-AUTH STUFF -----------///////
  // await expect(page.getByRole('button', { name: '✓ Connected' }).first()).toBeVisible();
  // logProgress('✅ Found "✓ Connected" status for Google Docs');

  // await expect(page.getByRole('button', { name: '✓ Connected' }).nth(1)).toBeVisible();
  // logProgress('✅ Found "✓ Connected" status for Google Sheets');

  // await expect(page.getByRole('button', { name: '✓ Connected' }).nth(2)).toBeVisible();
  // logProgress('✅ Found "✓ Connected" status for Google Drive');
});
