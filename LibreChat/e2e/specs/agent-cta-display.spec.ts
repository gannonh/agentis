import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { handleConditionalAuth } from '../utils/handleConditionalAuth';
import cleanupAgents, { cleanupChats } from '../utils/cleanupUser';

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

test.describe('Agent CTA Display', () => {
  test('should create featured agent and display in CTAs', async ({ page }) => {
    logProgress('Starting Agent CTA Display test');
    await page.goto('http://localhost:3080/');

    // Handle conditional authentication using existing system
    await handleConditionalAuth(page);

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
    await page.getByRole('textbox', { name: 'Agent name' }).fill('Test Featured Agent');
    await page.getByRole('textbox', { name: 'Agent description' }).click();
    await page
      .getByRole('textbox', { name: 'Agent description' })
      .fill('Test agent for CTA display verification');
    await page.getByRole('textbox', { name: 'Agent instructions' }).click();
    await page
      .getByRole('textbox', { name: 'Agent instructions' })
      .fill('You are a test agent for verifying the CTA display functionality.');

    // Select model using the same pattern as working tests
    await page.getByLabel('Agent Builder').getByRole('button', { name: 'Select a model' }).click();
    await page.getByRole('combobox', { name: 'Provider' }).click();
    await page.getByText('Anthropic').click();
    await page.getByRole('combobox', { name: 'Model' }).click();
    await page.getByText('claude-3-5-sonnet-20241022').click();
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
      await page.getByLabel('Agent Builder').getByRole('button').filter({ hasText: /^$/ }).click();
    } catch (e) {
      console.log('back button still not found, continuing...');
    }
    // Enable Featured toggle - this is the key test requirement
    await page.getByTestId('featured-toggle').click();

    logProgress('✅ Enabled Featured toggle');

    // Add Google Sheets tools to make it functional
    await page.getByRole('button', { name: 'Add Tools' }).click();
    await page.getByRole('button', { name: 'Add Google Sheets' }).click();
    await page.getByRole('checkbox', { name: 'Select all tools' }).check();
    await page.getByRole('button', { name: 'Add Selected' }).click();
    await page.getByRole('button', { name: 'Close dialog' }).click();

    // Save the agent
    await page.getByRole('button', { name: 'Save' }).click();
    logProgress('Saved featured agent with tools');

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

    // Verify our test agent CTA is displayed
    const testAgentCTA = page.getByRole('button', { name: 'Start chat with Test Featured Agent' });
    await expect(testAgentCTA).toBeVisible();
    logProgress('✅ Test Featured Agent CTA is visible');

    // Verify CTA contains proper structure
    await expect(testAgentCTA.getByRole('heading', { name: 'Test Featured Agent' })).toBeVisible();
    await expect(testAgentCTA.getByText('Test agent for CTA display verification')).toBeVisible();
    await expect(testAgentCTA.getByText('+12 more tools')).toBeVisible(); // Google Sheets has 15 tools
    logProgress('✅ CTA contains proper agent information');

    // Test that the CTA is clickable and has proper structure
    await expect(testAgentCTA).toHaveAttribute('aria-label', 'Start chat with Test Featured Agent');
    logProgress('✅ CTA has proper accessibility attributes');

    // Cleanup
    const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
    await cleanupAgents(testUserEmail);
    await cleanupChats(testUserEmail);
    logProgress('✅ Cleaned up test data');
  });

  test('should display no featured agents message when no agents are featured', async ({
    page,
  }) => {
    logProgress('Starting no featured agents test');
    await page.goto('http://localhost:3080/');

    // Handle conditional authentication using existing system
    await handleConditionalAuth(page);

    // Verify we're on the main chat page
    await expect(page).toHaveURL(/.*\/c\/new/);
    logProgress('Verified on main chat page');

    // Since no agents are featured by default, should show the no agents message
    await expect(page.getByText('No featured agents available')).toBeVisible();
    logProgress('✅ No featured agents message displayed correctly');

    // Verify Discover Agents section does not appear when no featured agents
    await expect(page.getByRole('heading', { name: 'Discover Agents' })).not.toBeVisible();
    logProgress('✅ Discover Agents section properly hidden when no featured agents');

    // Cleanup
    const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
    await cleanupAgents(testUserEmail);
    await cleanupChats(testUserEmail);
    logProgress('✅ Cleaned up test data');
  });
});
