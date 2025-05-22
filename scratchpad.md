GOOGLESHEETS_BATCH_GET
GOOGLESHEETS_BATCH_UPDATE
GOOGLESHEETS_CLEAR_VALUES
GOOGLESHEETS_CREATE_GOOGLE_SHEET1
GOOGLESHEETS_CREATE_SPREADSHEET_COLUMN
GOOGLESHEETS_CREATE_SPREADSHEET_ROW
GOOGLESHEETS_FIND_WORKSHEET_BY_TITLE
GOOGLESHEETS_FORMAT_CELL
GOOGLESHEETS_GET_SHEET_NAMES
GOOGLESHEETS_GET_SPREADSHEET_INFO
GOOGLESHEETS_LOOKUP_SPREADSHEET_ROW
GOOGLESHEETS_SHEET_FROM_JSON
COMPOSIO_CHECK_ACTIVE_CONNECTION
COMPOSIO_INITIATE_CONNECTION
COMPOSIO_GET_REQUIRED_PARAMETERS


npm run build:mcp && npm run build:data-schemas && npm run build:data-provider


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

<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot-icon lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>


<svg xmlns="http://www.w3.org/2000/svg" width="41" height="41" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-feather h-2/3 w-2/3 text-black dark:text-white"><path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"></path><path d="M16 8 2 22"></path><path d="M17.5 15H9"></path></svg>

<Feather size={48} strokeWidth={3} absoluteStrokeWidth />

Feather

Bot

import React from "react"
            export default function GoogleDrive() {
              return (
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(0 0 0)">
<path d="M15.2581 14.2901L8.87097 3.25781H15.129L21.5484 14.2901H15.2581ZM9.87097 15.1933L6.74194 20.7417H18.871L22 15.1933H9.87097ZM8.03226 4.61265L2 15.1933L5.12903 20.7417L11.2258 10.161L8.03226 4.61265Z" fill="#343C54"/>
</svg>

              )
            }

github
https://mcp.composio.dev/composio/server/c9a1b460-400a-4648-b40a-d2578bba29bf?transport=sse&useComposioHelperActions=true