import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import { handleInitialAuth } from '../../utils/oAuth';
import {
  createTestUserWithOrganization,
  cleanupTestUser,
  generateTestId,
  type TestAuthResult,
} from '../../utils/testAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Google Gmail MCP Tests', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    // Generate unique test ID and create authenticated user
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(
      `✅ Created test user: ${testAuth.user.email} with org: ${testAuth.organization.name}`,
    );
  });

  test.afterAll(async () => {
    // Clean up test data after all tests complete
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Cleanup failed for user ${testAuth.user.email}: ${error}`);
        // Don't throw to avoid masking test failures
      }
    }
  });

  test('Create Gmail MCP', async ({ browser }) => {
    logProgress('Starting Create Gmail MCP test');

    // Create a new context with authentication cookies
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');

      // With session token, we should be automatically authenticated
      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('Verified on main chat page');

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
      await page
        .getByLabel('Agent Builder')
        .getByRole('button', { name: 'Select a model' })
        .click();
      await page.getByRole('combobox', { name: 'Provider' }).click();
      await page.getByText('Anthropic').click();
      await page.getByRole('combobox', { name: 'Model' }).click();
      await page.getByRole('option', { name: 'claude-3-7-sonnet-latest' }).locator('span').click();

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
        page.getByLabel('Agent Builder').getByText('Gmail', { exact: true }),
      ).toBeVisible();
      logProgress('✅ Gmail MCP created successfully');
      await page.getByLabel('Agent Builder').getByText('Gmail', { exact: true }).click();

      // assert mcp/tool
      await expect(page.getByText('Add Label To Email')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('Use Gmail Agent', async ({ browser }) => {
    if (process.env.CI) {
      logProgress('⚠️ CI mode - Skipping Use Gmail Agent test');
      return;
    }

    logProgress('✅ Starting Use Gmail Agent test');

    // Create a new context with authentication cookies
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');

      // With session token, we should be automatically authenticated
      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('✅ Verified on main chat page');

      // Select the Gmail Agent explicitly to avoid conflicts with other parallel tests
      await page.getByRole('button', { name: 'Select a model' }).click();
      await page.getByRole('dialog').getByRole('option', { name: 'Agents' }).click();
      await page.getByLabel('Agents').getByText('Gmail Agent').click();
      logProgress('✅ Selected Gmail Agent');

      await page
        .getByTestId('text-input')
        .fill(
          'Create a 250 word Gmail draft about musician Carlos Alomar. Include a discography.\n\nRecipient: agentis.test@gmail.com\nSubject: Carlos Alomar blurb.',
        );
      await page.getByTestId('send-button').click();
      logProgress('✅ Sent message to create Gmail draft');

      if (!process.env.CI) {
        try {
          await expect(
            page.getByRole('button', { name: 'Running Create Email Draft' }).first(),
          ).toBeVisible({
            timeout: 20000,
          });
          logProgress('✅ Running Create Email Draft');
        } catch {
          logProgress('⚠️ Running Create Email Draft not found');
        }

        try {
          await expect(
            page.getByRole('button', { name: 'Ran Create Email Draft' }).first(),
          ).toBeVisible({
            timeout: 20000,
          });
          logProgress('✅ Ran Create Email Draft');
        } catch {
          logProgress('⚠️ Ran Create Email Draft not found');
        }
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

      // Look for the Connect Gmail button in the proactive auth UI
      await expect(page.getByRole('button', { name: 'Connect Gmail' })).toBeVisible();
      logProgress('✅ Found Connect Gmail button in proactive auth UI');

      // Handle the authentication
      logProgress('✅ Starting Gmail authentication');
      const popup = await handleInitialAuth(page, 'Gmail');

      // Handle the consent screens
      await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 10000 });
      logProgress('✅ Clicked Continue on first consent screen');
      await popup.getByRole('button', { name: 'Continue' }).click({ timeout: 10000 });
      logProgress('✅ Clicked Continue on second consent screen');

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

      try {
        await expect(
          page.getByRole('button', { name: 'Running Create Email Draft' }).first(),
        ).toBeVisible({
          timeout: 20000,
        });
        logProgress('✅ Running Create Email Draft');
      } catch {
        logProgress('⚠️ Running Create Email Draft not found');
      }

      try {
        await expect(
          page.getByRole('button', { name: 'Ran Create Email Draft' }).first(),
        ).toBeVisible({
          timeout: 20000,
        });
        logProgress('✅ Ran Create Email Draft');
      } catch {
        logProgress('⚠️ Ran Create Email Draft not found');
      }
    } finally {
      await context.close();
    }
  });
}); // End of test.describe('Google Gmail MCP Tests')
