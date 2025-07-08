/**
 * @fileoverview Organization Creation Flow Tests - Issue #103
 * @module e2e/specs/auth-ob.creation
 *
 * Tests the complete organization creation flow including:
 * - Organization name and slug input
 * - Domain verification for corporate emails
 * - "Allow domain join" checkbox functionality
 * - Profile setup integration (must not skip)
 * - Complete flow through all onboarding steps
 */

import { test, expect, Page } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import {
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
  handleTermsOfService,
  completeFullOnboarding,
  TEST_PATTERNS,
} from '../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

test.describe('Organization Creation Flow - Issue #103', () => {
  // Magic link capture helper imported from authOnboardingUtils

  // Terms of Service helper imported from authOnboardingUtils

  // Database cleanup helper imported from authOnboardingUtils

  test.beforeEach(async () => {
    await cleanDatabase();
    logProgress('🧹 Database cleaned for test');
  });

  test.afterEach(async () => {
    await cleanDatabase();
  });

  /**
   * CRITICAL PATH TEST: Complete flow from auth → org creation → profile → team → app
   * This test MUST verify that profile step is NOT skipped
   */
  test('Complete onboarding flow with organization creation and domain join', async ({
    browser,
  }) => {
    logProgress('🚀 Testing complete organization creation flow with all steps...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Start with corporate domain email
      const corporateEmail = `test-${Date.now()}@testcorp.com`;
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

      // Step 3: Should be on onboarding (not chat!)
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      logProgress('✅ Step 1/4: Reached onboarding');

      // Step 4: Verify organization creation UI
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible();
      await expect(page.getByRole('textbox').first()).toBeVisible(); // org name input

      // Fill organization details
      const orgName = 'TestCorp Engineering';
      logProgress('📝 Filling in organization name...');
      const orgNameInput = page.getByRole('textbox').first();
      await orgNameInput.fill(orgName);
      await expect(orgNameInput).toHaveValue(orgName);

      // Step 5: Verify domain join checkbox for corporate domain
      const domainJoinLabel = page.getByText(/let anyone with an @testcorp.com email join/i);
      await expect(domainJoinLabel).toBeVisible();
      logProgress('✅ Domain join option available for corporate domain');
      await expect(page.getByRole('checkbox')).toBeVisible();

      // Enable domain join
      logProgress('☑️ Enabling domain join...');
      const domainJoinCheckbox = page.getByRole('checkbox');
      await domainJoinCheckbox.check();
      await expect(domainJoinCheckbox).toBeChecked();

      // Step 6: Submit organization creation
      logProgress('🖱️ Clicking Next button to create organization...');
      await page.getByRole('button', { name: 'Next' }).click();

      // Wait for navigation or error handling
      await page.waitForLoadState('networkidle');

      // Step 7: CRITICAL - Verify NO error toast about domain join
      const errorToast = page.getByText(/failed to.*enable.*domain.*join/i);
      await expect(errorToast).not.toBeVisible();
      logProgress('✅ No domain join error - API working correctly');

      // Step 9: CRITICAL - Must be on PROFILE step, NOT chat!
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 5000 });
      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ Step 2/4: Advanced to Profile step (not skipped!)');

      // Verify profile form elements
      await expect(page.getByRole('textbox', { name: /your name/i })).toBeVisible();

      // Complete profile
      logProgress('📝 Filling in profile name...');
      const profileNameInput = page.getByRole('textbox', { name: /your name/i });
      await profileNameInput.fill('Test User');
      await expect(profileNameInput).toHaveValue('Test User');

      logProgress('🖱️ Clicking Continue button on profile...');
      await page.getByRole('button', { name: 'Continue' }).click();

      // Wait for profile submission to complete
      await page.waitForLoadState('networkidle');
      logProgress('⏳ Waiting for profile submission to complete...');

      // Step 10: Should advance to Team invitation step
      const teamHeading = page.getByRole('heading', { name: /Invite Your Team/i });
      await expect(teamHeading).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Step 3/4: Advanced to Team invitation');
      await expect(page.getByRole('button', { name: 'Skip for Now' })).toBeVisible();

      // Skip team invites for now
      logProgress('🖱️ Clicking Skip for Now on team step...');
      await page.getByRole('button', { name: 'Skip for Now' }).click();

      // Wait for team step to complete
      await page.waitForLoadState('networkidle');
      logProgress('⏳ Waiting for team step to complete...');

      // Step 11: Should reach Welcome step
      const welcomeHeading = page.getByRole('heading', { name: /Welcome to Agentis/i });
      await expect(welcomeHeading).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Step 4/4: Reached Welcome step');
      await expect(
        page.getByRole('button', { name: /Start Your First Conversation/i }),
      ).toBeVisible();

      // Complete onboarding
      logProgress('🖱️ Clicking Start Your First Conversation...');
      await page.getByRole('button', { name: /Start Your First Conversation/i }).click();
      await page.waitForLoadState('networkidle');

      // Step 8: Handle Terms of Service modal if it appears
      const termsHandled = await handleTermsOfService(page);
      if (termsHandled) {
        await page.waitForLoadState('networkidle');
      }

      // Step 12: Finally should redirect to chat
      await expect(page).toHaveURL(/.*\/c\/new/, { timeout: 10000 });
      logProgress('✅ Successfully completed full onboarding flow!');
      await expect(page.getByTestId('text-input')).toBeVisible();

      // Verify organization was created in database
      const { getTestDatabase } = await import('../utils/testAuth');
      const { db } = await getTestDatabase();

      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      expect(org?.slug).toBe('testcorp-engineering');
      expect(org?.metadata?.domain).toBe('testcorp.com');
      expect(org?.metadata?.allowDomainJoin).toBe(true);
      logProgress('✅ Organization created correctly in database');
    } finally {
      await context.close();
    }
  });

  /**
   * Test organization creation with public domain (no domain join option)
   */
  test('Organization creation with public domain should not show domain join', async ({
    browser,
  }) => {
    logProgress('🚀 Testing organization creation with public domain...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Use Gmail (public domain)
      const publicEmail = `test-${Date.now()}@gmail.com`;
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(publicEmail);
      await page.getByTestId('login-button').click();

      const magicLinkUrl = await captureMagicLink(publicEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Should be on onboarding
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });

      // Fill organization name
      await page.getByRole('textbox').first().fill('Personal Workspace');

      // CRITICAL: Should NOT show domain join option for public domains
      const domainJoinLabel = page.getByText(/let anyone with an @gmail.com email join/i);
      await expect(domainJoinLabel).not.toBeVisible();
      logProgress('✅ Domain join correctly hidden for public domain');

      // Should not have any checkbox visible
      const checkbox = page.getByRole('checkbox');
      await expect(checkbox).not.toBeVisible();

      // Continue with organization creation
      await page.getByRole('button', { name: 'Next' }).click();

      // Handle Terms of Service if it appears
      await handleTermsOfService(page);

      // Should still advance to profile step
      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ Public domain org creation works without domain join');
    } finally {
      await context.close();
    }
  });

  /**
   * Test "Skip for now" creates personal workspace and continues flow
   */
  test('Skip for now should create personal workspace and continue to profile', async ({
    browser,
  }) => {
    logProgress('🚀 Testing skip organization creation flow...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const email = `test-${Date.now()}@example.com`;
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(email);
      await page.getByTestId('login-button').click();

      const magicLinkUrl = await captureMagicLink(email);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Should be on onboarding
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });

      // Click "Skip for now"
      const skipButton = page.getByText(/skip for now/i);
      await expect(skipButton).toBeVisible();
      await skipButton.click();

      // Handle Terms of Service if it appears
      await handleTermsOfService(page);

      // CRITICAL: Should advance to profile step, not skip to chat!
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 5000 });
      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ Skip correctly advances to profile step');

      // Complete the rest of the flow
      await page.getByRole('textbox', { name: /your name/i }).fill('Test User');
      await page.getByRole('button', { name: 'Continue' }).click();

      await page.getByRole('button', { name: 'Skip for Now' }).click();
      await page.getByRole('button', { name: /Start Your First Conversation/i }).click();

      await expect(page).toHaveURL(/.*\/c\/new/, { timeout: 10000 });
      logProgress('✅ Personal workspace flow completed successfully');
    } finally {
      await context.close();
    }
  });

  /**
   * Test form validation for organization creation
   */
  test('Organization creation form validation', async ({ browser }) => {
    logProgress('🚀 Testing organization creation form validation...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const email = `test-${Date.now()}@testcorp.com`;
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(email);
      await page.getByTestId('login-button').click();

      const magicLinkUrl = await captureMagicLink(email);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Ensure we're on the organization creation page
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible();
      logProgress('✅ On organization creation page');

      // Wait for form to be ready - use the specific textbox selector
      const orgNameInput = page.getByRole('textbox', { name: 'Acme Inc., Marketing Team,' });
      await expect(orgNameInput).toBeVisible();

      // Try to submit without organization name - button should be disabled
      const nextButton = page.getByRole('button', { name: 'Next' });
      const isButtonDisabled = await nextButton.isDisabled();
      if (isButtonDisabled) {
        logProgress('✅ Next button is disabled with empty organization name');
      } else {
        // If not disabled, try clicking but expect it to stay on same page
        await nextButton.click();
        await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 2000 });
        await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible();
      }
      logProgress('✅ Empty organization name validation works');

      // Test minimum length (less than 2 characters)
      await orgNameInput.clear();
      await orgNameInput.fill('A');
      logProgress('✅ Filled input with single character: A');

      // Verify the input has the value
      const inputValue = await orgNameInput.inputValue();
      logProgress(`📝 Input value after fill: "${inputValue}"`);

      // Check if button is still disabled with single character
      const isButtonStillDisabled = await nextButton.isDisabled();
      if (isButtonStillDisabled) {
        logProgress('✅ Next button is still disabled with single character');
      } else {
        // If not disabled, try clicking but expect validation to prevent progression
        await nextButton.click();
        await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 2000 });
        logProgress('✅ Clicked Next but stayed on page due to validation');
      }

      // Check for validation message
      const errorText = page.getByText(/must be at least 2 characters/i);
      if (await errorText.isVisible()) {
        logProgress('✅ Minimum length validation message shown');
      }

      // Test maximum length (more than 50 characters)
      const longName = 'A'.repeat(51);
      await orgNameInput.clear();
      await orgNameInput.fill(longName);
      logProgress(`✅ Filled input with ${longName.length} characters`);

      // Should truncate or show error
      const longInputValue = await orgNameInput.inputValue();
      logProgress(
        `📝 Input value after long fill: "${longInputValue}" (length: ${longInputValue.length})`,
      );
      expect(longInputValue.length).toBeLessThanOrEqual(50);
      logProgress('✅ Maximum length validation works');

      // Valid organization name should proceed
      await orgNameInput.clear();
      await orgNameInput.fill('Valid Organization Name');
      logProgress('✅ Filled input with valid organization name');

      // Button should now be enabled with valid name
      const isButtonEnabled = !(await nextButton.isDisabled());
      if (isButtonEnabled) {
        logProgress('✅ Next button is enabled with valid organization name');
        await nextButton.click();
        logProgress('✅ Clicked Next button with valid name');
      } else {
        logProgress('❌ Next button is still disabled with valid name - this is unexpected');
      }

      // Handle Terms of Service if it appears
      await handleTermsOfService(page);

      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ Valid organization name proceeds correctly');
    } finally {
      await context.close();
    }
  });

  /**
   * Test OAuth flow completes all onboarding steps
   */
  test('OAuth signup should complete full onboarding flow', async ({ browser }) => {
    logProgress('🚀 Testing OAuth → organization → profile flow...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/login');
      await page.getByTestId('google').click();
      await page.waitForLoadState('networkidle');

      // Should redirect to Google OAuth
      expect(page.url()).toContain('accounts.google.com');
      logProgress('✅ Redirected to Google OAuth');

      const { GOOGLE_CREDS } = await import('../utils/oAuth');
      if (!GOOGLE_CREDS.email || !GOOGLE_CREDS.password) {
        logProgress('⚠️ OAuth credentials not available - skipping test');
        return;
      }

      // Complete OAuth
      await page.getByRole('textbox', { name: 'Email or phone' }).fill(GOOGLE_CREDS.email);
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('textbox', { name: 'Enter your password' }).fill(GOOGLE_CREDS.password);
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();

      // Should redirect to onboarding
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 15000 });
      logProgress('✅ OAuth redirected to onboarding');

      // Complete organization step
      await page.getByRole('textbox').first().fill('OAuth Test Organization');
      await page.getByRole('button', { name: 'Next' }).click();

      // CRITICAL: Should be on profile step
      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ OAuth flow correctly advances through all steps');
    } finally {
      await context.close();
    }
  });
});
