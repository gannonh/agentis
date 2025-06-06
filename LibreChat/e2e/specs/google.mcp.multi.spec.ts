import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { handleConditionalAuth } from '../utils/handleConditionalAuth';
import {
  createGoogleAgent,
  GOOGLE_AGENT_CONFIG,
  GOOGLE_CREDS,
} from '../utils/googleAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('Create Google Multi Agent', async ({ page }) => {
  logProgress('Starting agent creation test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  // Create the Google Multi Agent using utility function
  await createGoogleAgent(page, GOOGLE_AGENT_CONFIG);

  // Verify agent was created successfully
  await expect(page.getByRole('button', { name: 'Start chat with Google Multi' })).toBeVisible();
  logProgress('✅ Found "Start chat with Google Multi Agent" button');
  
  await expect(page.getByTestId('agent-discovery-grid').getByRole('heading')).toContainText(
    GOOGLE_AGENT_CONFIG.name,
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

  await page1.getByRole('textbox', { name: 'Email or phone' }).fill(GOOGLE_CREDS.email);
  await page1.getByRole('button', { name: 'Next' }).click();

  await page1.getByRole('textbox', { name: 'Enter your password' }).fill(GOOGLE_CREDS.password);
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
});
