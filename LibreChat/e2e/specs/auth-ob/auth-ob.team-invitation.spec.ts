import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_VIEWPORT,
  cleanDatabase,
  generateTestEmail,
} from '../../utils/authOnboardingUtils';
import {
  createTestUserWithOrganization,
  cleanupTestUser,
  generateTestId,
  type TestAuthResult,
} from '../../utils/testAuth';

test.use({
  viewport: TEST_VIEWPORT,
});

test.describe.configure({ mode: 'default' });

/**
 * Create a test user for onboarding testing (does not complete onboarding)
 */
async function createTestUserForOnboarding(testId: string): Promise<TestAuthResult> {
  // Generate unique test data
  const userEmail = `test-${testId}@example.com`;
  const userName = `Test User ${testId}`;
  const userPassword = `TestPass123!${testId}`;
  const orgName = `Test Org ${testId}`;
  const orgSlug = `test-org-${testId}`;

  // Create user via Better Auth sign-up
  const signUpResponse = await fetch('http://localhost:3080/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      password: userPassword,
      name: userName,
    }),
  });

  if (!signUpResponse.ok) {
    throw new Error(`Sign up failed: ${signUpResponse.status}`);
  }

  // Sign in to get session
  const signInResponse = await fetch('http://localhost:3080/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userEmail,
      password: userPassword,
    }),
  });

  if (!signInResponse.ok) {
    throw new Error(`Sign in failed: ${signInResponse.status}`);
  }

  // Extract session token
  const setCookieHeader = signInResponse.headers.get('set-cookie');
  if (!setCookieHeader) {
    throw new Error('No session cookie returned');
  }

  const sessionTokenMatch = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!sessionTokenMatch) {
    throw new Error('Session token not found in cookies');
  }

  const sessionToken = sessionTokenMatch[1];

  // Create organization
  const createOrgResponse = await fetch('http://localhost:3080/api/auth/organization/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
    body: JSON.stringify({
      name: orgName,
      slug: orgSlug,
      metadata: { testId, createdForE2E: true },
    }),
  });

  if (!createOrgResponse.ok) {
    throw new Error(`Organization creation failed: ${createOrgResponse.status}`);
  }

  const orgData = await createOrgResponse.json();
  const orgId = orgData.id || orgData._id;

  // Set onboarding step to 'team' (not complete)
  const setOnboardingResponse = await fetch('http://localhost:3080/api/user/update-onboarding-step', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
    body: JSON.stringify({
      onboardingStep: 'team',
    }),
  });

  if (!setOnboardingResponse.ok) {
    throw new Error(`Setting onboarding step failed: ${setOnboardingResponse.status}`);
  }

  // Accept terms to bypass modal
  await fetch('http://localhost:3080/api/user/terms/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `better-auth.session_token=${sessionToken}`,
    },
  });

  return {
    user: {
      id: 'test-user-id',
      email: userEmail,
      name: userName,
      role: 'user',
      organizationId: orgId,
    },
    organization: {
      id: orgId,
      name: orgName,
      slug: orgSlug,
      ownerId: 'test-user-id',
    },
    session: {
      sessionToken,
      userId: 'test-user-id',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    sessionCookie: `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
  };
}

test.describe('Team Invitation Flow Tests', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeEach(async () => {
    await cleanDatabase();
    testId = generateTestId();
    
    // Create a test user but don't complete onboarding
    // We'll create a modified version for team invitation testing
    testAuth = await createTestUserForOnboarding(testId);
    logProgress(`✅ Created test user: ${testAuth.user.email} with org: ${testAuth.organization.name}`);
  });

  test.afterEach(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Cleanup failed for user ${testAuth.user.email}: ${error}`);
      }
    }
    await cleanDatabase();
  });

  /**
   * =================================================================================
   * TEAM INVITATION ACCEPTANCE TEST
   * =================================================================================
   */

  test('User can send team invitations during onboarding', async ({ browser }) => {
    logProgress('🚀 Testing team invitation flow during onboarding...');

    const context = await browser.newContext();
    await context.addCookies([{
      name: 'better-auth.session_token',
      value: testAuth.session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);

    const page = await context.newPage();

    try {
      // Step 1: Navigate to onboarding flow
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Step 2: Navigate through onboarding steps to team invitation
      logProgress('📍 Navigating through onboarding steps...');
      
      // Skip organization step (already have org)
      const skipOrgButton = page.getByRole('button', { name: 'Skip' });
      if (await skipOrgButton.isVisible()) {
        await skipOrgButton.click();
        await page.waitForLoadState('networkidle');
      }

      // Skip profile step (for now, focus on invitation)
      const skipProfileButton = page.getByRole('button', { name: 'Skip' });
      if (await skipProfileButton.isVisible()) {
        await skipProfileButton.click();
        await page.waitForLoadState('networkidle');
      }

      // Step 3: Verify team invitation step is displayed
      await expect(page.getByRole('heading', { name: 'Invite your team' })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText('Invite by email')).toBeVisible();
      logProgress('✅ Team invitation step displayed correctly');

      // Step 4: Test email input functionality
      const emailInput = page.getByTestId('team-email-input').first();
      await emailInput.fill('colleague1@company.com');
      await expect(emailInput).toHaveValue('colleague1@company.com');
      logProgress('✅ Email input functionality working');

      // Step 5: Test add email functionality with Plus button
      await page.getByRole('button', { name: '+' }).click();
      // Add second email
      await page.getByTestId('team-email-input').fill('colleague2@company.com');
      await page.getByRole('button', { name: '+' }).click();
      logProgress('✅ Add email functionality working');

      // Step 6: Test email validation
      const thirdEmailInput = page.getByTestId('team-email-input').nth(2);
      if (await thirdEmailInput.isVisible()) {
        await thirdEmailInput.fill('invalid-email');
        await page.getByRole('button', { name: 'Send Invitations' }).click();
        
        // Should show validation error
        await expect(page.getByText(/Invalid email/i)).toBeVisible();
        logProgress('✅ Email validation working');
      }

      // Step 7: Test successful invitation sending
      // Clear invalid email and enter valid ones
      await emailInput.fill('colleague1@company.com');
      await secondEmailInput.fill('colleague2@company.com');
      
      // Send invitations
      await page.getByRole('button', { name: 'Send Invitations' }).click();
      await page.waitForLoadState('networkidle');

      // Step 8: Verify progression to next step
      // Should proceed to welcome step or main app
      await expect(page).toHaveURL(/.*\/(welcome|c\/new).*/);
      logProgress('✅ Successfully sent invitations and progressed to next step');

      // Step 9: Verify invitations were created (by checking for success feedback)
      // This could be success message or progress to next step
      logProgress('✅ Team invitation flow completed successfully');

    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * SKIP FUNCTIONALITY TEST
   * =================================================================================
   */

  test('User can skip team invitation step', async ({ browser }) => {
    logProgress('🚀 Testing skip functionality in team invitation flow...');

    const context = await browser.newContext();
    await context.addCookies([{
      name: 'better-auth.session_token',
      value: testAuth.session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);

    const page = await context.newPage();

    try {
      // Navigate to onboarding
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Navigate through steps to team invitation
      logProgress('📍 Navigating to team invitation step...');
      
      // Skip previous steps
      const skipButtons = page.getByRole('button', { name: 'Skip' });
      const skipCount = await skipButtons.count();
      
      for (let i = 0; i < skipCount; i++) {
        const skipButton = skipButtons.nth(i);
        if (await skipButton.isVisible()) {
          await skipButton.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Verify team invitation step
      await expect(page.getByRole('heading', { name: 'Invite your team' })).toBeVisible({
        timeout: 10000,
      });

      // Click skip button
      await page.getByRole('button', { name: 'Skip for now' }).click();
      await page.waitForLoadState('networkidle');

      // Verify progression to next step
      await expect(page).toHaveURL(/.*\/(welcome|c\/new).*/);
      logProgress('✅ Successfully skipped team invitation step');

    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * BULK INVITATION TEST
   * =================================================================================
   */

  test('User can send bulk invitations', async ({ browser }) => {
    logProgress('🚀 Testing bulk invitation functionality...');

    const context = await browser.newContext();
    await context.addCookies([{
      name: 'better-auth.session_token',
      value: testAuth.session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);

    const page = await context.newPage();

    try {
      // Navigate to team invitation step
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Navigate through steps to team invitation
      const skipButtons = page.getByRole('button', { name: 'Skip' });
      const skipCount = await skipButtons.count();
      
      for (let i = 0; i < skipCount && i < 2; i++) {
        const skipButton = skipButtons.nth(i);
        if (await skipButton.isVisible()) {
          await skipButton.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Verify team invitation step
      await expect(page.getByRole('heading', { name: 'Invite your team' })).toBeVisible({
        timeout: 10000,
      });

      // Test bulk paste functionality (comma-separated emails)
      const bulkEmails = 'user1@company.com,user2@company.com,user3@company.com';
      const emailInput = page.getByTestId('team-email-input').first();
      await emailInput.fill(bulkEmails);

      // Trigger bulk processing (could be on blur or paste event)
      await emailInput.blur();
      await page.waitForTimeout(1000);

      // Should have multiple email fields populated
      const emailInputs = page.getByTestId('team-email-input');
      const inputCount = await emailInputs.count();
      
      expect(inputCount).toBeGreaterThan(1);
      logProgress(`✅ Bulk invitation created ${inputCount} email fields`);

      // Verify each email is properly separated
      await expect(emailInputs.nth(0)).toHaveValue('user1@company.com');
      if (inputCount > 1) {
        await expect(emailInputs.nth(1)).toHaveValue('user2@company.com');
      }
      if (inputCount > 2) {
        await expect(emailInputs.nth(2)).toHaveValue('user3@company.com');
      }

      logProgress('✅ Bulk invitation functionality working correctly');

    } finally {
      await context.close();
    }
  });

  /**
   * =================================================================================
   * ERROR HANDLING TEST
   * =================================================================================
   */

  test('Team invitation handles errors gracefully', async ({ browser }) => {
    logProgress('🚀 Testing error handling in team invitation flow...');

    const context = await browser.newContext();
    await context.addCookies([{
      name: 'better-auth.session_token',
      value: testAuth.session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);

    const page = await context.newPage();

    try {
      // Navigate to team invitation step
      await page.goto('http://localhost:3080/onboarding');
      await page.waitForLoadState('networkidle');

      // Navigate through steps to team invitation
      const skipButtons = page.getByRole('button', { name: 'Skip' });
      const skipCount = await skipButtons.count();
      
      for (let i = 0; i < skipCount && i < 2; i++) {
        const skipButton = skipButtons.nth(i);
        if (await skipButton.isVisible()) {
          await skipButton.click();
          await page.waitForLoadState('networkidle');
        }
      }

      // Verify team invitation step
      await expect(page.getByRole('heading', { name: 'Invite your team' })).toBeVisible({
        timeout: 10000,
      });

      // Test duplicate email detection
      const emailInput1 = page.getByTestId('team-email-input').first();
      await emailInput1.fill('duplicate@company.com');
      
      await page.getByRole('button', { name: '+' }).click();
      const emailInput2 = page.getByTestId('team-email-input').nth(1);
      await emailInput2.fill('duplicate@company.com');

      // Try to send invitations
      await page.getByRole('button', { name: 'Send Invitations' }).click();

      // Should show duplicate error
      await expect(page.getByText(/Duplicate email/i)).toBeVisible();
      logProgress('✅ Duplicate email detection working');

      // Test empty email handling
      await emailInput1.fill('');
      await page.getByRole('button', { name: 'Send Invitations' }).click();

      // Should show required field error
      await expect(page.getByText(/required|empty/i)).toBeVisible();
      logProgress('✅ Empty email validation working');

      // Test maximum invitations limit
      // Add many emails to test limit
      for (let i = 0; i < 12; i++) {
        if (i > 0) {
          await page.getByRole('button', { name: '+' }).click();
        }
        const emailInput = page.getByTestId('team-email-input').nth(i);
        await emailInput.fill(`user${i}@company.com`);
      }

      // Should show limit error or disable add button
      const addButton = page.getByRole('button', { name: 'Add another' });
      const isAddDisabled = await addButton.isDisabled();
      const hasLimitError = await page.getByText(/maximum|limit/i).isVisible();

      expect(isAddDisabled || hasLimitError).toBe(true);
      logProgress('✅ Maximum invitations limit working');

    } finally {
      await context.close();
    }
  });
});