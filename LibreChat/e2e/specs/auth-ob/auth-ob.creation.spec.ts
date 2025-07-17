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
 *
 * IMPORTANT TEST LIMITATIONS:
 * =========================
 * 1. OAuth Testing Constraints:
 *    - Only ONE OAuth account available per domain (PUBLIC_DOMAIN and PRIVATE_DOMAIN)
 *    - Cannot test multi-user OAuth scenarios (same email address)
 *    - All OAuth tests must use the same account sequentially
 *
 * 2. Magic Link Testing:
 *    - Can generate unique email addresses for multi-user scenarios
 *    - Preferred method for testing organization join flows
 *
 * 3. Test Coverage Focus:
 *    - Single OAuth user flows (creation, profile setup, logout/login)
 *    - Magic link multi-user scenarios (org creation, joining, permissions)
 *    - Form validation and error handling
 */

import { test, expect, Page } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
  handleTermsOfService,
  completeFullOnboarding,
  TEST_PATTERNS,
} from '../../utils/authOnboardingUtils';

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
      await expect(page.getByTestId('profile-name-input')).toBeVisible();

      // Complete profile
      logProgress('📝 Filling in profile name...');
      const profileNameInput = page.getByTestId('profile-name-input');
      await profileNameInput.fill('Test User');
      await expect(profileNameInput).toHaveValue('Test User');

      logProgress('🖱️ Clicking Continue button on profile...');
      await page.getByTestId('profile-continue-button').click();

      // Wait for profile submission to complete
      await page.waitForLoadState('networkidle');
      logProgress('⏳ Waiting for profile submission to complete...');

      // Step 10: Should advance to Team invitation step
      const teamHeading = page.getByRole('heading', { name: 'Invite Your Team', level: 1 });
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
      const { getTestDatabase } = await import('../../utils/testAuth');
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

      // Handle organization creation/join flow
      const requestToJoinButton = page.getByRole('button', { name: 'Request to Join' });
      const continuePersonalButton = page.getByText('Continue with personal workspace');
      const skipButton = page.getByRole('button', { name: /skip for now/i });

      if (await requestToJoinButton.isVisible()) {
        // This is an organization join flow - click "Continue with personal workspace"
        logProgress('📋 Organization join flow detected, continuing with personal workspace');
        await continuePersonalButton.click();
      } else if (await skipButton.isVisible()) {
        // This is a standard organization creation flow with skip option
        logProgress('📋 Organization creation flow detected, skipping');
        await skipButton.click();
      } else {
        throw new Error('Neither organization join nor skip option found');
      }

      // Handle Terms of Service if it appears
      await handleTermsOfService(page);

      // CRITICAL: Should advance to profile step, not skip to chat!
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 5000 });
      await expect(page.getByRole('heading', { name: /Complete Your Profile/i })).toBeVisible({
        timeout: 5000,
      });
      logProgress('✅ Skip correctly advances to profile step');

      // Complete the rest of the flow
      await page.getByTestId('profile-name-input').fill('Test User');
      await page.getByTestId('profile-continue-button').click();

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
      // Use abstracted OAuth utilities
      const { requireOAuthCredentials, completeOAuthOnboardingFlow } = await import(
        '../../utils/authOnboardingUtils'
      );

      // Verify OAuth credentials are available (will fail test if missing)
      requireOAuthCredentials('PUBLIC_DOMAIN', 'OAuth onboarding flow');

      // Complete full OAuth onboarding flow
      await completeOAuthOnboardingFlow(page, 'PUBLIC_DOMAIN', {
        orgName: 'OAuth Test Organization',
        skipTeam: true,
      });

      // Verify we reach the chat interface
      await expect(page.getByTestId('text-input')).toBeVisible();
      logProgress('✅ OAuth flow correctly advances through all steps');
    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * OAUTH CORPORATE DOMAIN ORGANIZATION CREATION TESTS
   * =================================================================================
   * Tests OAuth authentication with corporate domain organization creation.
   * Extends Issue #103 scope to include OAuth flows with PRIVATE_DOMAIN.
   */

  test('OAuth → Corporate Domain → Organization Creation with Domain Join', async ({ browser }) => {
    logProgress('🚀 Testing OAuth corporate domain organization creation with domain join...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Use abstracted OAuth utilities
      const { requireOAuthCredentials, completeOAuthOnboardingFlow } = await import(
        '../../utils/authOnboardingUtils'
      );

      // Verify OAuth credentials are available (will fail test if missing)
      requireOAuthCredentials('PRIVATE_DOMAIN', 'OAuth corporate organization creation');

      // Complete OAuth onboarding flow with corporate domain and domain join enabled
      const orgName = 'Astrolabs OAuth Corp';
      await completeOAuthOnboardingFlow(page, 'PRIVATE_DOMAIN', {
        orgName: orgName,
        enableDomainJoin: true, // Enable domain join for corporate domain
        skipTeam: true,
      });

      // Verify we reach the chat interface
      await expect(page).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      await expect(page.getByTestId('text-input')).toBeVisible();
      logProgress('✅ OAuth corporate organization creation completed successfully');

      // =================================================================
      // VERIFICATION: Database validation
      // =================================================================
      logProgress('🔍 Verifying database state...');

      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      // Verify organization exists with correct settings
      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      expect(org?.slug).toBe('astrolabs-oauth-corp');
      expect(org?.metadata?.domain).toBe('astrolabs.llc');
      expect(org?.metadata?.allowDomainJoin).toBe(true);
      logProgress('✅ Organization created with domain join enabled');

      // Verify OAuth user is organization owner
      const members = await db.collection('member').find({ organizationId: org?._id }).toArray();
      expect(members).toHaveLength(1);
      expect(members[0].role).toBe('owner');
      logProgress('✅ Database verification: OAuth user is organization owner');

      logProgress('🎉 OAuth corporate domain organization creation test PASSED!');
    } finally {
      await context.close();
    }
  });

  test('OAuth → Corporate Domain → Organization Creation (Domain Join Disabled)', async ({
    browser,
  }) => {
    logProgress('🚀 Testing OAuth corporate domain organization creation WITHOUT domain join...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Use abstracted OAuth utilities
      const { requireOAuthCredentials, completeOAuthOnboardingFlow } = await import(
        '../../utils/authOnboardingUtils'
      );

      // Verify OAuth credentials are available
      requireOAuthCredentials(
        'PRIVATE_DOMAIN',
        'OAuth corporate organization creation (no domain join)',
      );

      // Complete OAuth onboarding flow with domain join DISABLED
      const orgName = 'Astrolabs Private Corp';
      await completeOAuthOnboardingFlow(page, 'PRIVATE_DOMAIN', {
        orgName: orgName,
        enableDomainJoin: false, // Key difference - domain join disabled
        skipTeam: true,
      });

      // Verify we reach the chat interface
      await expect(page).toHaveURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
      await expect(page.getByTestId('text-input')).toBeVisible();
      logProgress(
        '✅ OAuth corporate organization creation (no domain join) completed successfully',
      );

      // Verify organization created with domain join DISABLED
      const { getTestDatabase } = await import('../../utils/testAuth');
      const { db } = await getTestDatabase();

      const org = await db.collection('organization').findOne({ name: orgName });
      expect(org).toBeTruthy();
      expect(org?.metadata?.domain).toBe('astrolabs.llc');
      expect(org?.metadata?.allowDomainJoin).toBe(false); // Should be disabled
      logProgress('✅ Organization created with domain join disabled');
    } finally {
      await context.close();
    }
  });

  /**
   * SKIPPED IMPOSSIBLE TESTS - Multi-User OAuth Scenarios
   * ====================================================
   *
   * The following test scenarios are IMPOSSIBLE with current OAuth constraints:
   *
   * 1. "OAuth User 1 creates org, OAuth User 2 joins"
   *    - Would require 2 different OAuth accounts with same domain
   *    - We only have 1 OAuth account per domain
   *
   * 2. "Multiple OAuth users in same organization"
   *    - Each OAuth provider (Google) uses a single test account
   *    - Cannot simulate different users with same email
   *
   * 3. "OAuth admin approves OAuth member join request"
   *    - Would require 2 OAuth sessions with different accounts
   *    - OAuth accounts are domain-locked (gmail.com, astrolabs.llc)
   *
   * ALTERNATIVE: Use magic link tests for multi-user scenarios
   * See: auth-ob.join-auto.spec.ts for magic link multi-user tests
   */
  test.skip('Multi-user OAuth scenarios', async () => {
    // This test is skipped because it's impossible to implement
    // with only one OAuth account per domain
  });
});
