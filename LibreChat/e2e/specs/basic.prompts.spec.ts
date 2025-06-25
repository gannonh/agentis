import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
  storageState: path.join(__dirname, '../data/codegen-auth.json'),
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Prompt Tests', () => {
  test('Create Prompts', async ({ page }) => {
    logProgress('🚀 Starting basic prompt creation test...');

    await page.goto('http://localhost:3080/');
    logProgress('📱 Navigated to application');

    await page.pause();
    await page.getByRole('button', { name: 'Prompts' }).click();
    logProgress('📝 Clicked Prompts button');

    await page.getByRole('button', { name: 'Create Prompt' }).click();
    logProgress('✨ Clicked Create Prompt button');

    await page.getByRole('heading', { name: 'Text* Add Special variables:' }).click();
    await page.getByRole('textbox', { name: 'Prompt Name*' }).click();

    await page.getByRole('textbox', { name: 'Prompt Name*' }).click();
    await page.getByRole('textbox', { name: 'Prompt Name*' }).fill('Code Review Assistant');
    logProgress('🏷️ Filled prompt name');

    await page.locator('textarea[name="prompt"]').click();
    await page
      .locator('textarea[name="prompt"]')
      .fill(
        'You are an expert code reviewer. Please review the following {{language}} code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance considerations\n4. Security concerns\n\nCode to review:\n{{code}}\n\nContext: {{context}}\n\nPlease format your response with clear sections and actionable suggestions.',
      );
    logProgress('📄 Filled prompt content');

    await page.getByText('You are an expert code').click();
    await page.getByRole('textbox', { name: 'Optional: Enter a description' }).click();
    await page
      .getByRole('textbox', { name: 'Optional: Enter a description' })
      .fill('Analyzes code snippets for quality, bugs, performance, and security issues');
    logProgress('📋 Filled prompt description');

    await page.getByRole('textbox', { name: 'Optional: Enter a command for' }).click();
    await page.getByRole('textbox', { name: 'Optional: Enter a command for' }).fill('review');
    logProgress('⌨️ Filled command field');

    await page.getByLabel('Create Prompt').click();
    logProgress('💾 Clicked Create Prompt - saving...');

    // Wait for the prompt to be created and visible
    await expect(
      page.getByRole('button', { name: 'Code Review Assistant prompt' }).first(),
    ).toBeVisible();
    logProgress('✅ Prompt created successfully');

    // Check for the prompt content that is actually visible on the page
    logProgress('🔍 Verifying prompt content...');

    await expect(
      page.getByText(
        'You are an expert code reviewer. Please review the following {{language}} code and provide feedback on:',
      ),
    ).toBeVisible();
    await expect(page.getByText('Code quality and best practices')).toBeVisible();
    await expect(page.getByText('Potential bugs or issues')).toBeVisible();
    await expect(page.getByText('Performance considerations')).toBeVisible();
    await expect(page.getByText('Security concerns')).toBeVisible();
    await expect(page.getByText('Code to review:')).toBeVisible();
    await expect(page.getByText('{{code}}')).toBeVisible();
    await expect(page.getByText('Context:')).toBeVisible();
    await expect(page.getByText('{{context}}')).toBeVisible();

    await expect(
      page.getByText('Please format your response with clear sections and actionable suggestions.'),
    ).toBeVisible();

    // Check that the command textbox has the value we entered
    await expect(page.getByRole('textbox', { name: 'Optional: Enter a command for' })).toHaveValue(
      'review',
    );
    logProgress('✅ All prompt content verified successfully');

    // clean up
    logProgress('🧹 Starting cleanup...');

    // back to chat
    await page.getByRole('link', { name: 'Back to Chat' }).click();
    logProgress('🔙 Navigated back to chat');

    await expect(
      page.getByRole('button', { name: 'Card for Code Review Assistant' }).first(),
    ).toBeVisible();
    logProgress('🎴 Verified prompt card visible in chat');

    // clean up
    await page.getByRole('button', { name: 'Manage Prompts' }).click();
    logProgress('⚙️ Clicked Manage Prompts');

    await page.getByRole('button', { name: 'Delete Prompt? Code Review' }).first().click();
    await page.getByRole('button', { name: 'Delete' }).click();
    logProgress('🗑️ Deleted test prompt');

    // back to chat
    await page.getByRole('link', { name: 'Back to Chat' }).click();
    logProgress('🏁 Test completed successfully!');
  });
});
