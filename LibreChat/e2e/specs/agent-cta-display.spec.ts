import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { createFileAuth, type FileAuthConfig } from '../utils/fileAuthentication';

/**
 * Test 1: Basic CTA Display Test
 * Verifies that featured agents appear in the "Discover Agents" section
 */

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Agent CTA Display Tests', () => {
  let fileAuth: FileAuthConfig;

  test.beforeAll(async ({ browser }) => {
    // Create file-scoped authentication for this test file
    fileAuth = await createFileAuth(browser, 'agent-cta-display');
    logProgress(`✅ Created file authentication for user: ${fileAuth.user.email}`);
  });

  test('should display no featured agents message when no agents are featured', async ({
    browser,
  }) => {
    logProgress('Starting no featured agents test');

    // Create a new context with the file-specific storage state
    const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');

      // With storage state, we should be automatically authenticated
      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('Verified on main chat page');

      // Since no agents are featured by default, should show the no agents message
      await expect(page.getByText('No featured agents available')).toBeVisible();
      logProgress('✅ No featured agents message displayed correctly');

      // Verify Discover Agents section does not appear when no featured agents
      await expect(page.getByRole('heading', { name: 'Discover Agents' })).not.toBeVisible();
      logProgress('✅ Discover Agents section properly hidden when no featured agents');
    } finally {
      await context.close();
    }
  });
  test('should create featured agent and display in CTAs', async ({ browser }) => {
    logProgress('Starting Agent CTA Display test');

    // Create a new context with the file-specific storage state
    const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');

      // With storage state, we should be automatically authenticated

      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('Verified on main chat page');

      // Initially, there should be no featured agents
      await expect(page.getByText('No featured agents available')).toBeVisible();
      logProgress('Confirmed no initial featured agents');

      // Create a Google Sheets Agent to test CTAs
      await page.getByRole('button', { name: 'Controls' }).click();
      await page.getByRole('button', { name: 'Agent Builder' }).click();
      logProgress('Opened Agent Builder');

      try {
        await page.getByRole('button', { name: 'Create New Agent' }).click({ timeout: 5000 });
      } catch (e) {
        console.log('Create New Agent button not found, continuing...');
      }

      // Fill agent details first
      await page.getByRole('textbox', { name: 'Agent name' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Sheets Agent');
      await page.getByRole('textbox', { name: 'Agent description' }).click();
      await page
        .getByRole('textbox', { name: 'Agent description' })
        .fill(
          'Create charts, run complex calculations, automate data processing, and build custom reports.',
        );
      await page.getByRole('textbox', { name: 'Agent instructions' }).click();
      await page
        .getByRole('textbox', { name: 'Agent instructions' })
        .fill(
          'You possess expert-level Google Sheets skills and deep knowledge of spreadsheet functions, formulas, and data analysis techniques. Whenever you create a new spreadsheet or make spreadsheet edits for the user, please provide a link so they can access it conveniently. Proactively suggest data visualizations, pivot tables, or formulas that could enhance their analysis. When working with data, ensure accuracy and explain any complex formulas or functions you implement. Always ask for clarification if data requirements are ambiguous.',
        );

      // Select model using the same pattern as working tests
      await page
        .getByLabel('Agent Builder')
        .getByRole('button', { name: 'Select a model' })
        .click();
      await page.getByRole('combobox', { name: 'Provider' }).click();
      await page.getByText('Anthropic').click();
      await page.getByRole('combobox', { name: 'Model' }).click();
      await page.getByRole('option', { name: 'claude-3-7-sonnet-' }).locator('span').click();
      await page.getByRole('button', { name: 'Create' }).click();
      logProgress('✅ Basic agent created');

      try {
        await page
          .getByLabel('Agent Builder')
          .getByRole('button')
          .filter({ hasText: /^$/ })
          .first()
          .click();
      } catch (e) {
        console.log('back button not found, continuing...');
      }
      try {
        await page
          .getByLabel('Agent Builder')
          .getByRole('button')
          .filter({ hasText: /^$/ })
          .click();
      } catch (e) {
        console.log('back button still not found, continuing...');
      }
      logProgress('✅ Skipping Featured toggle (no longer needed)');

      // Add Google Sheets tools to make it functional
      await page.getByRole('button', { name: 'Add Tools' }).click();
      await page.getByRole('button', { name: 'Add Google Sheets' }).click();
      await page.getByRole('checkbox', { name: 'Select all tools' }).check();
      await page.getByRole('button', { name: 'Add Selected' }).click();
      await page.getByRole('button', { name: 'Close dialog' }).click();

      // Save the agent
      await page.getByRole('button', { name: 'Save' }).click();
      logProgress('Saved featured agent with tools');

      // Create 3 more agents to ensure we have enough for the grid

      // Google Drive Agent

      await page.getByRole('button', { name: 'Create New Agent' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Drive Agent');
      await page.getByRole('textbox', { name: 'Agent description' }).click();
      await page
        .getByRole('textbox', { name: 'Agent description' })
        .fill(
          'Find files instantly, create folder structures, manage permissions, and streamline document workflows. ',
        );
      await page.getByRole('textbox', { name: 'Agent instructions' }).click();
      await page
        .getByRole('textbox', { name: 'Agent instructions' })
        .fill(
          'You are an expert at Google Drive organization and file management. When creating or moving files, always provide direct links and clear descriptions of the folder structure. Proactively suggest organizational improvements, such as consistent naming conventions or logical folder hierarchies. Help users establish efficient workflows and maintain a clean, searchable Drive environment. When searching for files, cast a wide net initially, then help narrow results based on user feedback.',
        );
      await page
        .getByLabel('Agent Builder')
        .getByRole('button', { name: 'Select a model' })
        .click();
      await page.getByRole('combobox', { name: 'Provider' }).click();
      await page.getByText('Anthropic').click();
      await page.getByRole('combobox', { name: 'Model' }).click();
      await page.getByRole('option', { name: 'claude-3-7-sonnet-' }).locator('span').click();
      await page.getByRole('button', { name: 'Create' }).click();
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
      await page.getByRole('button', { name: 'Close dialog' }).click();
      await page.getByRole('button', { name: 'Save' }).click();

      // Google Docs Agent

      await page.getByRole('button', { name: 'Create New Agent' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Docs Agent');
      await page.getByRole('textbox', { name: 'Agent description' }).click();
      await page
        .getByRole('textbox', { name: 'Agent description' })
        .fill(
          'Generate content, format documents professionally, create templates, and extract key information.',
        );
      await page.getByRole('textbox', { name: 'Agent instructions' }).click();
      await page
        .getByRole('textbox', { name: 'Agent instructions' })
        .fill(
          'You are a skilled document creation and editing specialist with expertise in professional writing and formatting. When creating or editing documents, always provide a shareable link and summarize the key changes made. Maintain consistent formatting, use appropriate styles and headings, and ensure documents are well-structured and readable. Offer suggestions for improving clarity, flow, and visual appeal. When working on collaborative documents, respect existing content while enhancing overall quality.',
        );
      await page
        .getByLabel('Agent Builder')
        .getByRole('button', { name: 'Select a model' })
        .click();
      await page.getByRole('combobox', { name: 'Provider' }).click();
      await page.getByText('Anthropic').click();
      await page.getByRole('combobox', { name: 'Model' }).click();
      await page.getByRole('option', { name: 'claude-3-7-sonnet-' }).locator('span').click();
      await page.getByRole('button', { name: 'Create' }).click();
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
      await page.getByTestId('featured-toggle').click();
      await page.getByRole('button', { name: 'Save' }).click();

      // Gmail Agent
      await page.getByRole('button', { name: 'Create New Agent' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).fill('Gmail Agent');
      await page.getByRole('textbox', { name: 'Agent description' }).click();
      await page
        .getByRole('textbox', { name: 'Agent description' })
        .fill(
          'Draft emails, organize messages, schedule sends, and analyze communication patterns. ',
        );
      await page.getByRole('textbox', { name: 'Agent instructions' }).click();
      await page
        .getByRole('textbox', { name: 'Agent instructions' })
        .fill(
          `You are an email communication expert focused on clarity, professionalism, and efficiency. When drafting emails, match the appropriate tone to the context and relationship. Always show drafts to the user before sending unless explicitly told otherwise. Help organize inbox with smart labels, filters, and priority markers. Provide summaries of important email threads and flag time-sensitive messages. Suggest templates for recurring communication needs and help maintain inbox zero practices.`,
        );
      await page
        .getByLabel('Agent Builder')
        .getByRole('button', { name: 'Select a model' })
        .click();
      await page.getByRole('combobox', { name: 'Provider' }).click();
      await page.getByText('Anthropic').click();
      await page.getByRole('combobox', { name: 'Model' }).click();
      await page.getByRole('option', { name: 'claude-3-7-sonnet-' }).locator('span').click();
      await page.getByRole('button', { name: 'Create' }).click();
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
      await page.getByTestId('featured-toggle').click();
      await page.getByRole('button', { name: 'Save' }).click();

      // Google Calendar
      await page.getByRole('button', { name: 'Create New Agent' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).click();
      await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Calendar Agent');
      await page.getByRole('textbox', { name: 'Agent description' }).click();
      await page
        .getByRole('textbox', { name: 'Agent description' })
        .fill(
          'Schedule meetings intelligently, find open time slots, set smart reminders, and coordinate with others.',
        );
      await page.getByRole('textbox', { name: 'Agent instructions' }).click();
      await page
        .getByRole('textbox', { name: 'Agent instructions' })
        .fill(
          `You are a scheduling optimization expert who helps users make the most of their time. When creating events, include all relevant details (location, description, attendees) and provide calendar links. Proactively identify scheduling conflicts and suggest alternatives. Help users block time for focused work, breaks, and personal commitments. Analyze calendar patterns to suggest productivity improvements. Always respect time zones and clarify ambiguous time references. Offer to create recurring events for regular activities.`,
        );
      await page
        .getByLabel('Agent Builder')
        .getByRole('button', { name: 'Select a model' })
        .click();
      await page.getByRole('combobox', { name: 'Provider' }).click();
      await page.getByText('Anthropic').click();
      await page.getByRole('combobox', { name: 'Model' }).click();
      await page.getByRole('option', { name: 'claude-3-7-sonnet-' }).locator('span').click();
      await page.getByRole('button', { name: 'Create' }).click();
      await page
        .getByLabel('Agent Builder')
        .getByRole('button')
        .filter({ hasText: /^$/ })
        .first()
        .click();
      await page.getByRole('button', { name: 'Add Tools' }).click();
      await page.getByRole('button', { name: 'Add Google Calendar' }).click();
      await page.getByRole('checkbox', { name: 'Select all tools' }).check();
      await page.getByRole('button', { name: 'Add Selected' }).click();
      await page.getByRole('button', { name: 'Close dialog' }).click();
      await page.getByTestId('featured-toggle').click();
      await page.getByRole('button', { name: 'Save' }).click();

      // Navigate away and back to verify CTAs appear
      await page.getByRole('button', { name: 'New chat' }).click();
      await page.waitForURL(/.*\/c\/new/);
      logProgress('Navigated to new chat to verify CTA display');

      // Now verify the "Discover Agents" section appears
      await expect(page.getByRole('heading', { name: 'Discover Agents' })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Get started with these featured agents')).toBeVisible();
      logProgress('✅ Discover Agents section is visible');

      // Verify the Discover Agents grid container is visible
      await expect(page.getByTestId('agent-discovery-grid')).toBeVisible();
      logProgress('✅ Agent discovery grid is visible');

      // Verify other featured agents CTAs are displayed

      await expect(
        page.getByRole('button', { name: 'Start chat with Google Calendar Agent' }),
      ).toBeVisible();
      logProgress('✅ Google Calendar Agent CTA is visible');
      await expect(page.getByRole('button', { name: 'Start chat with Gmail Agent' })).toBeVisible();
      logProgress('✅ Gmail Agent CTA is visible');
      await expect(page.getByRole('button', { name: 'Start chat with Google Docs' })).toBeVisible();
      logProgress('✅ Google Docs Agent CTA is visible');
    } finally {
      await context.close();
    }
  });
  test('should navigate correctly when clicking on CTAs', async ({ browser }) => {
    logProgress('Starting CTA navigation test');

    // Create a new context with the file-specific storage state
    const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      // With storage state, we should be automatically authenticated
      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('Verified on main chat page');

      await page.getByRole('button', { name: 'Start chat with Google Docs' }).click();
      logProgress('Clicked Google Docs Agent CTA');
      await expect(page.getByRole('button', { name: 'Select a model' })).toBeVisible();
      logProgress('Model selection button is visible after clicking CTA');
      await expect(
        page.getByLabel('Start chat with Google Docs').getByRole('heading'),
      ).toContainText('Google Docs Agent');
      logProgress('Google Docs Agent heading is visible');
      await expect(
        page.getByLabel('Start chat with Google Docs').getByRole('paragraph'),
      ).toContainText(
        'Generate content, format documents professionally, create templates, and extract key information.',
      );
      logProgress('Google Docs Agent paragraph is visible');
      await page.getByRole('button', { name: 'Start chat with Gmail Agent' }).click();
      logProgress('Clicked Gmail Agent CTA');
      await expect(page.getByRole('button', { name: 'Select a model' })).toBeVisible();
      logProgress('Model selection button is visible after clicking Gmail Agent CTA');
      await expect(
        page.getByLabel('Start chat with Gmail Agent').getByRole('heading'),
      ).toContainText('Gmail Agent');
      logProgress('Gmail Agent heading is visible');
      await expect(
        page.getByLabel('Start chat with Gmail Agent').getByRole('paragraph'),
      ).toContainText(
        'Draft emails, organize messages, schedule sends, and analyze communication patterns.',
      );
      logProgress('Gmail Agent paragraph is visible');
      await page.getByRole('button', { name: 'Start chat with Google Calendar Agent' }).click();
      logProgress('Clicked Google Calendar Agent CTA');
      await expect(page.getByRole('button', { name: 'Select a model' })).toBeVisible();
      logProgress('Model selection button is visible after clicking Google Calendar Agent CTA');
      await expect(
        page.getByLabel('Start chat with Google Calendar Agent').getByRole('heading'),
      ).toContainText('Google Calendar Agent');
      logProgress('Google Calendar Agent heading is visible');
      await expect(
        page.getByLabel('Start chat with Google Calendar Agent').getByRole('paragraph'),
      ).toContainText(
        'Schedule meetings intelligently, find open time slots, set smart reminders, and coordinate with others.',
      );
      logProgress('Google Calendar Agent paragraph is visible');

      // Verify featured agents CTAs are still displayed
      logProgress('Verify featured agents CTAs are still displayed');

      await expect(
        page.getByRole('button', { name: 'Start chat with Google Calendar Agent' }),
      ).toBeVisible();
      logProgress('✅ Google Calendar Agent CTA is visible');
      await expect(page.getByRole('button', { name: 'Start chat with Gmail Agent' })).toBeVisible();
      logProgress('✅ Gmail Agent CTA is visible');
      await expect(page.getByRole('button', { name: 'Start chat with Google Docs' })).toBeVisible();
      logProgress('✅ Google Docs Agent CTA is visible');
      await expect(
        page.getByRole('button', { name: 'Start chat with Google Calendar Agent' }),
      ).toBeVisible();
      logProgress('✅ Google Calendar Agent CTA is visible');
    } finally {
      // Always close context, regardless of test success/failure
      try {
        await context.close();
      } catch (closeError) {
        console.log(
          '⚠️ Context close error:',
          closeError instanceof Error ? closeError.message : String(closeError),
        );
        // Don't throw here - we want the original test error to propagate
      }
    }
  });
  test('chat should dissapear CTAs', async ({ browser }) => {
    logProgress('Starting CTA navigation test');

    // Create a new context with the file-specific storage state
    const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      // With storage state, we should be automatically authenticated
      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('Verified on main chat page');

      await page.getByRole('button', { name: 'Start chat with Google Calendar Agent' }).click();
      await page.getByTestId('text-input').click();
      await page.getByTestId('text-input').fill('Do I have any appointments today?');
      await page.getByTestId('send-button').click();

      // Verify that CTAs are no longer visible after starting a chat
      await expect(page.getByRole('heading', { name: 'Discover Agents' })).not.toBeVisible();
      logProgress('✅ Discover Agents section is no longer visible after starting a chat');
      await expect(page.getByTestId('agent-discovery-grid')).not.toBeVisible();
      logProgress('✅ Agent discovery grid is no longer visible after starting a chat');

      // Verify the chat message was sent successfully
      await expect(page.getByTestId('text-input')).toHaveValue('');
      await expect(page.getByText('Do I have any appointments')).toBeVisible();

      // Note: No cleanup needed - the fixture handles cleanup on next run
      logProgress('✅ Test complete - fixture will handle cleanup on next run');
    } finally {
      // Always close context, regardless of test success/failure
      try {
        await context.close();
      } catch (closeError) {
        console.log(
          '⚠️ Context close error:',
          closeError instanceof Error ? closeError.message : String(closeError),
        );
        // Don't throw here - we want the original test error to propagate
      }
    }
  });
}); // End of test.describe('Agent CTA Display Tests')
