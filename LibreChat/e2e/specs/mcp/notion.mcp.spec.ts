import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import { handleInitialNotionAuth } from '../../utils/oAuth';
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

test.describe('Notion MCP Tests', () => {
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

  test('Create Notion MCP', async ({ browser }) => {
    logProgress('Starting Create Notion MCP test');

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

      // Create Notion Agent
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
      await page.getByRole('textbox', { name: 'Agent name' }).fill('Notion Agent');
      await page.getByRole('textbox', { name: 'Agent description' }).dblclick();
      await page
        .getByRole('textbox', { name: 'Agent description' })
        .fill('Sonnet 3.7 with access to Notion');
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
          "You possess expert-level Notion skills. Whenever you create new pages, databases, or make content edits for the user, please provide links so they can access them conveniently. Help users organize their information effectively using Notion's powerful database and page features.",
        );

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

      // Add MCP tools
      await page
        .getByLabel('Agent Builder')
        .getByRole('button')
        .filter({ hasText: /^$/ })
        .first()
        .click();
      await page.getByRole('button', { name: 'Add Tools' }).click();
      await page.getByRole('button', { name: 'Add Notion' }).click();
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
        page.getByLabel('Agent Builder').getByText('Notion', { exact: true }),
      ).toBeVisible();
      logProgress('Notion MCP created successfully');

      // Open panel
      await page.getByLabel('Agent Builder').getByText('Notion', { exact: true }).click();

      // Assert MCP/tool
      await expect(page.getByText('Add Page Content')).toBeVisible();
    } finally {
      // Close the context
      await context.close();
    }
  });

  test('Use Notion Agent', async ({ browser }) => {
    if (process.env.CI) {
      logProgress('⚠️ CI mode - Skipping Use Notion Agent test');
      return;
    }

    logProgress('Starting Use Notion Agent test');

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

      // Select the Notion Agent explicitly to avoid conflicts with other parallel tests
      await page.getByRole('button', { name: 'Select a model' }).click();
      await page.getByText('Agents', { exact: true }).first().click();
      await page.getByLabel('Agents').getByText('Notion Agent').first().click();
      logProgress('✅ Selected Notion Agent');

      // Send first message to trigger proactive MCP auth
      await page
        .getByTestId('text-input')
        .fill(
          'Can you help me create a new page in my Notion workspace called "Test Page" with some sample content?',
        );

      await page.getByTestId('send-button').click();
      logProgress('✅ Sent message to create Notion page');

      // Auth ---------------------------
      // Look for the proactive authentication UI that should appear automatically
      await expect(page.getByText('Authentication Required')).toBeVisible();
      logProgress('✅ Found proactive Authentication Required section');

      // Verify the descriptive text about tools requiring authentication
      await expect(
        page.getByText('This conversation uses tools that require authentication:'),
      ).toBeVisible();
      logProgress('✅ Found descriptive text about authentication');

      // Look for the Connect Notion button in the proactive auth UI
      await expect(page.getByRole('button', { name: 'Connect Notion' })).toBeVisible();
      logProgress('✅ Found Connect Notion button in proactive auth UI');

      // Handle the authentication - For Notion, we expect to use "Connect with Google" option
      logProgress('✅ Starting Notion authentication');
      const popup = await handleInitialNotionAuth(page, 'Notion');
      logProgress('✅ Notion authentication completed');

      logProgress('⏳ Waiting up to 10 sec for authentication to complete...');
      // Wait for authentication to complete
      await expect(page.getByText('✓ Connected')).toBeVisible({ timeout: 10000 });
      logProgress('✅ Found "✓ Connected" status indicating successful Notion authentication');
      // await page.pause(); // codegen

      // none of these are guarenteed due to non-deterministic LLM responses
      // so we wrap in try/catch blocks for obvervability
      try {
        await expect(page.getByRole('button', { name: 'Thinking' })).toBeVisible({ timeout: 5000 });
        logProgress('✅ Found Thinking button after authentication');
      } catch {
        logProgress('❌ Thinking button not found');
      }

      try {
        await expect(page.getByRole('button', { name: 'Thoughts' })).toBeVisible({ timeout: 5000 });
        logProgress('✅ Found Thoughts button after authentication');
      } catch {
        logProgress('❌ Thoughts button not found');
      }

      try {
        await expect(page.getByRole('button', { name: /Running.*/ })).toBeVisible({
          timeout: 5000,
        });
        logProgress('✅ Found "Running" tool execution after authentication');
      } catch {
        logProgress('❌ "Running" tool execution not found');
      }
      try {
        await expect(page.getByRole('button', { name: /Ran.*/ })).toBeVisible({
          timeout: 5000,
        });
        logProgress('✅ Found "Ran" tool execution after authentication');
      } catch {
        logProgress('❌ "Ran" tool execution not found');
      }
      try {
        await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible({
          timeout: 5000,
        });
        logProgress('✅ Found Regenerate button after authentication');
      } catch {
        logProgress('❌ Regenerate button not found');
      }
    } finally {
      // Close the context
      await context.close();
    }
  });
}); // End of test.describe('Notion MCP Tests')
