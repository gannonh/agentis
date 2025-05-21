"e2e:record-large": "npx playwright codegen --viewport-size=1600,1700 http://localhost:3080/",

GOOGLE_TEST_ACCOUNT_1_EMAIL="agentis.test@gmail.com"
GOOGLE_TEST_ACCOUNT_1_PASSWORD="KJHkh97HKH87jjfU"

import { test, expect } from '@playwright/test';

test.use({
  viewport: {
    height: 1700,
    width: 1600
  }
});

test('test', async ({ page }) => {
  await page.goto('http://localhost:3080/login');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('agentis.test@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('KJHkh97HKH87jjfU');
  await page.getByTestId('login-button').click();
  await page.getByRole('button', { name: 'Controls' }).click();
  await page.getByRole('button', { name: 'Agent Builder ' }).click();
  await page.getByRole('button', { name: 'Create New Agent' }).click();
  await page.getByRole('textbox', { name: 'Agent name' }).click();
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Sheets Agent');
  await page.getByRole('textbox', { name: 'Agent description' }).click();
  await page.getByRole('textbox', { name: 'Agent description' }).fill('Claude 3.7 Agent with access to Google Sheets.');
  await page.getByRole('textbox', { name: 'Agent instructions' }).click();
  await page.getByRole('textbox', { name: 'Agent instructions' }).fill('You possess expert-level Google Sheets skills. Whenever you create a new spreadsheet or make spreadsheet edits for the user, please provide a link so they can access it conveniently.');
  await page.getByLabel('Agent Builder').getByRole('button', { name: 'Select a model' }).click();
  await page.getByRole('combobox', { name: 'Provider' }).click();
  await page.getByText('Anthropic').click();
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByLabel('Agent Builder').getByRole('button').filter({ hasText: /^$/ }).first().click();
  await page.getByRole('button', { name: 'Add Tools' }).click();
  await page.getByRole('button', { name: 'Add googlesheets' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByTestId('text-input').click();
  await page.getByTestId('text-input').fill('Create a spreadsheet with all David Bowie albums in chronological order, with columns for Guitarists, Drummer, Bassist, PKeyboards/Piano');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').press('ArrowLeft');
  await page.getByTestId('text-input').fill('Create a spreadsheet with all David Bowie albums in chronological order, with columns for Guitarists, Drummer, Bassist, Keyboards/Piano');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').press('ArrowRight');
  await page.getByTestId('text-input').fill('Create a spreadsheet with all David Bowie albums in chronological order, with columns for Guitarists, Drummer, Bassist, Keyboards/Piano, Other Musicans, and Producer');
  await page.getByTestId('text-input').click();
  await page.getByTestId('send-button').click();
  await page.goto('http://localhost:3080/c/411248d5-348b-4cdc-96db-f168f053ac2f');
  await expect(page.getByRole('button', { name: 'Ran COMPOSIO_CHECK_ACTIVE_CONNECTION' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ran COMPOSIO_INITIATE_CONNECTION' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Google Sheets Authorization' })).toBeVisible();
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Google Sheets Authorization' }).click();
  const page1 = await page1Promise;
  await page1.getByRole('textbox', { name: 'Email or phone' }).fill('agentis.test@gmail.com');
  await page1.getByRole('button', { name: 'Next' }).click();
  await page1.getByRole('textbox', { name: 'Enter your password' }).fill('KJHkh97HKH87jjfU');
  await page1.getByRole('button', { name: 'Next' }).click();
  await page1.getByRole('button', { name: 'Continue' }).click();
  await expect(page1.getByRole('heading', { name: 'Authentication successful' })).toBeVisible();
  await page.getByTestId('text-input').click();
  await page.getByTestId('text-input').fill('Ok, I\'m authenticated!');
  await page.getByTestId('send-button').click();
  await expect(page.getByRole('button', { name: 'Ran GOOGLESHEETS_CREATE_GOOGLE_SHEET1' })).toBeVisible();
});