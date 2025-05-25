import { expect, Page } from '@playwright/test';

/**
 * Helper function to log test progress with timestamps
 */
export function logProgress(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Wrapper for expect with automatic logging
 */
export async function expectWithLog(
  page: Page,
  selector: string,
  message: string,
  options?: { timeout?: number }
) {
  await expect(page.getByRole('button', { name: selector })).toBeVisible(options);
  logProgress(`✅ ${message}`);
}