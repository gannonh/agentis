import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  cleanTestData,
  createTestContext,
  TEST_PATTERNS,
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Organization Detection Tests - Issue #102', () => {
  // Store test IDs for cleanup
  const testIds: string[] = [];

  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test.afterEach(async () => {
    // Clean up test-specific data
    for (const testId of testIds) {
      await cleanTestData(testId).catch(err => 
        logProgress(`⚠️ Cleanup failed for testId ${testId}: ${err.message}`)
      );
    }
    testIds.length = 0; // Clear the array
  });

  /**
   * =================================================================================
   * ORGANIZATION DETECTION TESTS - ISSUE #102 SCOPE
   * =================================================================================
   * These tests focus on detection logic only - determining what UI to show.
   * Actual create/join actions are handled in issues #103/#104.
   * Invitation creation/management is handled in issue #106.
   */


  test('Corporate domain without existing organization shows create UI', async ({ browser }) => {
    logProgress('🚀 Testing corporate domain detection without existing organization...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Use corporate domain with no existing organization
      const testContext = createTestContext({ 
        emailPrefix: 'test',
        corporateDomain: 'newcompany.com',
        orgBase: 'NewCompany'
      });
      testIds.push(testContext.testId);
      const corporateEmail = testContext.emails.corporate!;
      
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(corporateEmail);
      await page.getByTestId('login-button').click();

      // Step 2: Follow magic link
      const magicLinkUrl = await captureMagicLink(corporateEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Step 3: Verify we reach onboarding (MUST happen)
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      logProgress('✅ Successfully redirected to onboarding');

      // Step 4: Verify organization creation UI is shown
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify domain auto-join option is available for corporate domain
      const expectedDomain = testContext.emails.corporate!.split('@')[1]; // Extract domain from email
      await expect(page.getByText(new RegExp(`let anyone with an @${expectedDomain.replace('.', '\\.')} email join`, 'i'))).toBeVisible();
      logProgress(`✅ Domain auto-join option shown for corporate domain: ${expectedDomain}`);

      logProgress('✅ Journey 8 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });

  test('Public domain detection accuracy', async ({ browser }) => {
    logProgress('🚀 Testing public domain detection accuracy...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Test with Gmail (should be detected as public)
      const testContext = createTestContext({ 
        emailPrefix: 'test'
      });
      testIds.push(testContext.testId);
      const gmailEmail = `test-${testContext.testId}@gmail.com`;
      
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(gmailEmail);
      await page.getByTestId('login-button').click();

      // Step 2: Follow magic link
      const magicLinkUrl = await captureMagicLink(gmailEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Step 3: Verify we reach onboarding (MUST happen)
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      logProgress('✅ Successfully redirected to onboarding');

      // Step 4: Verify organization creation form is shown for public domain
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify NO domain join option for public domains
      await expect(page.getByText(/let anyone with an @gmail.com email join/i)).not.toBeVisible();
      logProgress('✅ Public domain correctly detected - no domain join option shown');

      logProgress('✅ Journey 13 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });

});
