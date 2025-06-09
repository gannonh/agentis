import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { handleInitialAuth } from '../utils/googleAuth';
import { createFileAuth, type FileAuthConfig } from '../utils/fileAuthentication';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Google Calendar MCP Tests', () => {
  let fileAuth: FileAuthConfig;

  test.beforeAll(async ({ browser }) => {
    // Create file-scoped authentication for this test file
    fileAuth = await createFileAuth(browser, 'google-calendar-mcp');
    logProgress(`✅ Created file authentication for user: ${fileAuth.user.email}`);
  });

  test('Create Calendar MCP Agent', async ({ browser }) => {
    logProgress('Starting Create Calendar MCP test');

    // Create a new context with the file-specific storage state
    const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
    const page = await context.newPage();

    await page.goto('http://localhost:3080/');

    // With storage state, we should be automatically authenticated
    // Verify we're on the main chat page
    await expect(page).toHaveURL(/.*\/c\/new/);
    logProgress('Verified on main chat page');
    //

    // Create Google Calendar Agent
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
    await page.getByLabel('Agent Builder').getByRole('button', { name: 'Select a model' }).click();
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
    await page.getByRole('button', { name: 'Save' }).click();

    // Wait for save operation to complete by waiting for success indicator or page change
    try {
      // Look for success toast, saved state, or navigation change
      await page.waitForTimeout(2000); // Give server time to save
      logProgress('Waited for save operation to complete');
    } catch (error) {
      logProgress('⚠️ Save wait timeout, continuing...');
    }

    // Verify agent was saved by checking for success state
    try {
      await expect(page.getByText('Agent saved successfully')).toBeVisible({ timeout: 5000 });
      logProgress('✅ Found explicit save confirmation');
    } catch (error) {
      logProgress('⚠️ No explicit save confirmation found, continuing...');
    }

    logProgress('Saved agent configuration');

    // Assert MCP is created

    await expect(
      page.getByLabel('Agent Builder').getByText('Google Calendar', { exact: true }),
    ).toBeVisible();
    logProgress('✅ Google Calendar MCP created successfully');

    await page.getByLabel('Agent Builder').getByText('Google Calendar', { exact: true }).click();

    await expect(page.getByText('Create Event')).toBeVisible();

    // Close the context
    await context.close();
  });

  test('Use Calendar Agent', async ({ browser }) => {
    logProgress('✅ Starting Use Google Calendar Agent test');

    // Create a new context with the file-specific storage state
    const context = await browser.newContext({ storageState: fileAuth.storageStatePath });
    const page = await context.newPage();

    await page.goto('http://localhost:3080/');

    // With storage state, we should be automatically authenticated
    // Verify we're on the main chat page
    await expect(page).toHaveURL(/.*\/c\/new/);
    logProgress('✅ Verified on main chat page');

    // Select the Google Calendar Agent explicitly to avoid conflicts with other parallel tests

    await page.getByRole('button', { name: 'Select a model' }).click();
    await page.getByText('Agents', { exact: true }).click();
    await page.getByLabel('Agents').getByText('Google Calendar Agent').first().click();

    // ----------------- begin cogegen

    await page.getByTestId('text-input').click();
    await page
      .getByTestId('text-input')
      .fill(
        "Create the following appointments for next week:**\n\n1. **Monday 9:00 AM** - Team standup meeting (30 min, recurring daily M-F, invite sarah@company.com and mike@company.com)\n\n2. **Tuesday 2:30 PM** - Client presentation prep (1.5 hours, location: Conference Room B, add reminder 1 hour before)\n\n3. **Wednesday 12:00 PM** - Lunch with mentor (1 hour, location: Café Milano, 123 Main St)\n\n4. **Thursday 10:00 AM - 11:30 AM** - Q2 Budget Review (invite finance-team@company.com, attach agenda document, mark as high priority)\n\n5. **Friday 3:00 PM** - Weekly reflection & planning session (45 min, private event, recurring weekly)\n\nAlso, please:\n- Block 2 hours of 'Focus Time' each morning from 8-10 AM (no meetings)\n- Find the best available 1-hour slot for a 1:1 with my manager (they're in EST, I'm in PST)\n- Set up a reminder for Thursday at 4 PM to submit my expense report\n- Check if I have any conflicts with these new appointments.\n\nYou need to 'Connect to Google Calendar' and provide an authorization link. You do not need to check a connection first and if you do it will erroneously tell you that you have one. You also need to provide me with the link or redirect URL to authenmticate with Google Calendar.",
      );
    await page.getByTestId('send-button').click();
    logProgress('✅ Sent message to create calendar events');

    // Look for the proactive authentication UI that should appear automatically
    await expect(page.getByText('Authentication Required')).toBeVisible();
    logProgress('✅ Found proactive Authentication Required section');

    // Verify the descriptive text about tools requiring authentication
    await expect(
      page.getByText('This conversation uses tools that require authentication:'),
    ).toBeVisible();
    logProgress('✅ Found descriptive text about authentication');

    // Look for the Connect Google Calendar button in the proactive auth UI
    await expect(page.getByRole('button', { name: 'Connect Google Calendar' })).toBeVisible();
    logProgress('✅ Found Connect Google Calendar button in proactive auth UI');

    // Handle the authentication
    const popup = await handleInitialAuth(page, 'Google Calendar');
    logProgress('✅ Starting Google Calendar authentication');

    // Handle the consent screens
    try {
      await popup.getByRole('button', { name: 'Continue' }).click();
      await popup.getByRole('button', { name: 'Continue' }).click();
    } catch (error) {
      logProgress('⚠️ Consent screen handling completed or not needed');
    }

    // Wait for authentication to complete
    logProgress('⏳ Waiting 2 sec for authentication to complete...');
    await page.waitForTimeout(2000);
    logProgress('✅ Waited for authentication to complete');

    // The proactive auth section should remain visible as part of conversation history
    await expect(page.getByText('Authentication Required')).toBeVisible();
    logProgress('✅ Proactive auth section remains visible as part of conversation history');

    // Check that the button shows "✓ Connected" after successful authentication
    await expect(page.getByText('✓ Connected')).toBeVisible();
    logProgress(
      '✅ Found "✓ Connected" status indicating successful Google Calendar authentication',
    );

    // Check if agent starts using tools automatically after authentication
    logProgress('⏳ Checking if agent starts tool execution automatically...');
    if (!process.env.CI) {
      try {
        // run ------------------ (after authentication)
        await expect(page.getByRole('button').filter({ hasText: 'Running' })).toBeVisible({
          timeout: 30000,
        });
        logProgress('✅ Found "Running"  execution after authentication');

        // ran ------------------ (after authentication)
        // Wait for the second "Ran" button to appear (indicating completion)
        await expect(page.getByRole('button').filter({ hasText: 'Ran' })).toBeVisible({
          timeout: 30000,
        });
        logProgress('✅ Found "Ran"  execution after authentication');
      } catch (error) {
        logProgress('⚠️ No run ran - wait for regenerate button to appear');
        // If no run ran, wait for the regenerate button to appear
        await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible({
          timeout: 30000,
        });
        logProgress('✅ Regenerate button appeared after authentication');

        // send follow up message that you have authenticated and to try now
        await page.getByTestId('text-input').click();
        await page.getByTestId('text-input').fill('ok, try now.');
        await page.getByTestId('send-button').click();
        logProgress('✅ Sent message to create calendar events after authentication');
        // run ------------------ (after authentication)
        // run ------------------ (after authentication)
        await expect(page.getByRole('button').filter({ hasText: 'Running' })).toBeVisible({
          timeout: 30000,
        });
        logProgress('✅ Found "Running"  execution after authentication');

        // ran ------------------ (after authentication)
        // Wait for the second "Ran" button to appear (indicating completion)
        await expect(page.getByRole('button').filter({ hasText: 'Ran' })).toBeVisible({
          timeout: 30000,
        });
        logProgress('✅ Found "Ran"  execution after authentication');
      }
    }
    // Close the context
    await context.close();
  });
}); // End of test.describe('Google Calendar MCP Tests')
