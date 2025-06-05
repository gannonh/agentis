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

  await page.pause();
  // DO CREATE STUFF -----------///////
});

test('Use  Agent', async ({ page }) => {
  logProgress('Starting Use Google Docs Agent test');
  await page.goto('http://localhost:3080/');

  // Handle conditional authentication
  await handleConditionalAuth(page);

  // Verify we're on the main chat page
  await expect(page).toHaveURL(/.*\/c\/new/);
  logProgress('✅ Verified on main chat page');

  // Send first message to trigger proactive MCP auth
  await page
    .getByTestId('text-input')
    .fill('Create a 250 word doc about musician Carlos Alomar. Include a discography.');

  await page.getByTestId('send-button').click();
  logProgress('✅ Sent message to create document');

  // assert auth elements ---------------------------
  // Look for the proactive authentication UI that should appear automatically
  await expect(page.getByText('Authentication Required')).toBeVisible();
  logProgress('✅ Found proactive Authentication Required section');

  // Verify the descriptive text about tools requiring authentication
  await expect(
    page.getByText('This conversation uses tools that require authentication:'),
  ).toBeVisible();
  logProgress('✅ Found descriptive text about authentication');

  // Look for the Connect Google Docs button in the proactive auth UI
  await expect(page.getByRole('button', { name: 'Connect Google Docs' })).toBeVisible();
  logProgress('✅ Found Connect Google Docs button in proactive auth UI');

  await page.pause();
  // DO PRE-AUTH STUFF -----------///////

  // Handle the authentication --------------------
  await handleGoogleOAuth(page, 'Google Docs');
  logProgress('✅ starting Google Docs authentication');

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

  await page.pause();
  // DO POST-AUTH STUFF -----------///////

  // // try again -------------------
  // await page.getByTestId('text-input').click();
  // await page
  //   .getByTestId('text-input')
  //   .fill('ok, try now. please also provide a link to the doc when created.');
  // await page.getByTestId('send-button').click();
  // logProgress('✅ Sent message to create document after authentication');

  // // run ------------------ (after authentication)
  // await expect(page.getByRole('button', { name: 'Running Create Markdown Doc' })).toBeVisible({
  //   timeout: 30000,
  // });
  // logProgress('✅ Found "Running Create" tool execution after authentication');

  // // ran ------------------ (after authentication)
  // // Wait for the second "Ran" button to appear (indicating completion)
  // await expect(page.getByRole('button', { name: 'Ran Create Markdown Doc' })).toHaveCount(2, {
  //   timeout: 30000,
  // });
  // logProgress('✅ Found second "Ran Create" tool execution after authentication');

  // // Long wait because agent may want to do some formatting or other processing
  // logProgress('⏳ Waiting for Google Docs link to appear...');
  // await expect(page.getByRole('link', { name: 'https://docs.google.com/' })).toBeVisible({
  //   timeout: 90000,
  // });
  // logProgress('✅ Found Google Docs link');
});
