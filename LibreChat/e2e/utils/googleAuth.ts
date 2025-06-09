import { Page } from '@playwright/test';
import { logProgress } from './testLogger';

// Google test credentials - directly use the known test account
export const GOOGLE_CREDS = {
  email: 'agentis.test@gmail.com',
  password: 'KJHkh97HKH87jjfU',
} as const;

// Google service types
export type GoogleService =
  | 'Google Drive'
  | 'Google Docs'
  | 'Google Sheets'
  | 'Google Calendar'
  | 'Gmail';

/**
 * Simpler helper to just handle the initial popup and credentials
 * Use this in your existing codegen flow rather than replacing everything
 */
export async function handleInitialAuth(
  page: Page,
  serviceName: GoogleService,
  credentials = GOOGLE_CREDS,
): Promise<Page> {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: `Connect ${serviceName}` }).click();
  const popup = await popupPromise;

  await popup.getByRole('textbox', { name: 'Email or phone' }).fill(credentials.email);
  await popup.getByRole('button', { name: 'Next' }).click();
  await popup.getByRole('textbox', { name: 'Enter your password' }).fill(credentials.password);
  await popup.getByRole('button', { name: 'Next' }).click();

  return popup;
}

/**
 * Helper for existing account flow (Google Docs - has 2 Continue buttons)
 */
export async function handleExistingAccountAuth(
  page: Page,
  serviceName: GoogleService,
): Promise<Page> {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: `Connect ${serviceName}` }).click();
  const popup = await popupPromise;

  await popup.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
  await popup.getByRole('button', { name: 'Continue' }).click();
  await popup.getByRole('button', { name: 'Continue' }).click();

  return popup;
}

/**
 * Helper for existing account flow (Google Sheets - has only 1 Continue button)
 */
export async function handleExistingAccountAuthSingle(
  page: Page,
  serviceName: GoogleService,
): Promise<Page> {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: `Connect ${serviceName}` }).click();
  const popup = await popupPromise;

  await popup.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
  await popup.getByRole('button', { name: 'Continue' }).click();

  return popup;
}
