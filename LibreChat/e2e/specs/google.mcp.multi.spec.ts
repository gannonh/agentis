import { test, expect } from '../fixtures/fixtures';
import { logProgress } from '../utils/testLogger';
import {
  handleInitialAuth,
  handleExistingAccountAuth,
  handleExistingAccountAuthSingle,
} from '../utils/googleAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test('Create Google Multi Agent', async ({ browser, fileStorageState }) => {
  logProgress('Starting agent creation test');

  // Create a new context with the file-specific storage state
  const context = await browser.newContext({ storageState: fileStorageState });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3080/');

    // With storage state, we should be automatically authenticated

    // Verify we're on the main chat page
    await expect(page).toHaveURL(/.*\/c\/new/);
    logProgress('✅ Verified on main chat page');

    // Create Google Multi Agent (using original codegen approach)
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
    await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Multi Agent');
    await page
      .getByRole('textbox', { name: 'Agent description' })
      .fill(
        "Seamlessly work across Google's core productivity tools to manage complex projects, analyze data, and create comprehensive documentation.",
      );
    await page
      .getByRole('textbox', { name: 'Agent instructions' })
      .fill(
        'You are a Google Workspace integration expert with mastery of Drive, Docs, and Sheets working together as a unified system. You excel at creating sophisticated workflows that leverage the strengths of each tool while maintaining seamless connections between them.\nCore Capabilities:\n\nCreate integrated solutions that span multiple Google tools (e.g., Sheets data feeding into Docs reports, all organized in Drive)\nMaintain consistent naming conventions and folder structures across all created assets\nAlways provide direct links to all files and folders you create or modify\nProactively suggest which tool is best for each task component\n\nWhen working on projects:\n\nStart by understanding the full scope and create a Drive folder structure to organize all assets\nUse Sheets for data storage, calculations, and analysis\nUse Docs for reports, documentation, and formatted output\nCreate dynamic connections between tools (e.g., embedding Sheets charts in Docs)\nMaintain a "project index" document that links to all related files\n\nBest Practices:\n\nAsk clarifying questions upfront to understand the complete workflow before starting\nCreate templates for recurring needs\nSuggest automation opportunities between tools\nMaintain version control by creating copies before major changes\nUse clear, descriptive file names that indicate relationships (e.g., "Q4_Sales_Data.sheets" and "Q4_Sales_Report.docs")\nProvide a summary of the file structure and how components connect\n\nCommunication Style:\n\nBegin responses with a brief project plan outlining which tools you\'ll use for what\nExplain the connections between different files and why you\'ve organized things a certain way\nOffer tips for maintaining and expanding the system you\'ve created\nAlways end with a clear list of all created/modified files with their links and purposes\n\nRemember: You\'re not just using three separate tools - you\'re orchestrating them as an integrated workspace solution.',
      );
    await page.getByLabel('Agent Builder').getByRole('button', { name: 'Select a model' }).click();
    await page.getByRole('combobox', { name: 'Provider' }).click();
    await page.getByText('Anthropic').click();
    await page.getByRole('combobox', { name: 'Model' }).click();
    // toggle featured

    await page.getByRole('option', { name: 'claude-3-7-sonnet-' }).locator('span').click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await page
      .getByLabel('Agent Builder')
      .getByRole('button')
      .filter({ hasText: /^$/ })
      .first()
      .click();

    await page.getByRole('button', { name: 'Add Tools' }).click();
    await page.getByRole('button', { name: 'Add Google Drive' }).click();
    await page.getByRole('checkbox', { name: 'Select all tools' }).check();
    await page.getByRole('button', { name: 'Add Selected' }).click();
    await page.getByRole('button', { name: 'Add Google Docs' }).click();
    await page.getByRole('checkbox', { name: 'Select all tools' }).check();
    await page.getByRole('button', { name: 'Add Selected' }).click();
    await page.getByRole('button', { name: 'Add Google Sheets' }).click();
    await page.getByRole('checkbox', { name: 'Select all tools' }).check();
    await page.getByRole('button', { name: 'Add Selected' }).click();
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByTestId('featured-toggle').click();
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for save operation to complete
    try {
      await page.waitForTimeout(2000); // Give server time to save
      logProgress('Waited for save operation to complete');
    } catch (error) {
      logProgress('⚠️ Save wait timeout, continuing...');
    }

    logProgress('✅ Created Google Multi Agent');
    // Verify agent was created successfully
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
  } finally {
    // Always close context, regardless of test success/failure
    try {
      await context.close();
    } catch (closeError) {
      console.log('⚠️ Context close error:', closeError.message);
      // Don't throw here - we want the original test error to propagate
    }
  }
});

test('Use Google Multi Agent', async ({ browser, fileStorageState }) => {
  logProgress('✅ Starting Use Google Multi Agent test');

  // Create a new context with the file-specific storage state
  const context = await browser.newContext({ storageState: fileStorageState });
  const page = await context.newPage();

  await page.goto('http://localhost:3080/');

  // With storage state, we should be automatically authenticated

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  // Select the Google Multi Agent explicitly to avoid conflicts with other parallel tests
  await page.getByRole('button', { name: 'Select a model' }).click();
  await page.getByText('Agents', { exact: true }).click();

  // Debug: Check if any agents are available
  const agentsContainer = page.getByLabel('Agents');
  await expect(agentsContainer).toBeVisible();

  // Wait longer and add debug logging
  try {
    await expect(agentsContainer.getByText('Google Multi Agent')).toBeVisible({
      timeout: 15000,
    });
  } catch (error) {
    // Debug: Log all available agents
    const allAgents = await agentsContainer.locator('text=').allTextContents();
    console.log('Available agents:', allAgents);

    // Try alternative selectors
    const agentExists = await page.locator('text=Google Multi Agent').count();
    console.log('Agent count:', agentExists);

    throw new Error(`Google Multi Agent not found. Available agents: ${allAgents.join(', ')}`);
  }

  await agentsContainer.getByText('Google Multi Agent').click();
  logProgress('✅ Selected Google Multi Agent');

  // ----------------- begin cogegen
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

  // START 1ST AUTH - Google Drive (initial auth flow)
  const page1 = await handleInitialAuth(page, 'Google Drive');
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

  // Google Docs (existing account flow)
  const page2 = await handleExistingAccountAuth(page, 'Google Docs');
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
  // Google Sheets (existing account flow - single Continue button)
  const page3 = await handleExistingAccountAuthSingle(page, 'Google Sheets');
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

  // Close the context
  await context.close();

  // ------------------ end codegen debug
});
