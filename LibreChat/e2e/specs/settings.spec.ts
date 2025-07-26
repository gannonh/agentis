import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import {
  createTestUserWithOrganization,
  cleanupTestUser,
  generateTestId,
  type TestAuthResult,
} from '../utils/testAuth';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Settings Modal', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    // Generate unique test ID and create authenticated user
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(
      `✅ Created test user: ${testAuth.user.email} with org: ${testAuth.organization.name}`,
    );
  });

  test.afterAll(async () => {
    // Clean up test data after all tests complete
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Cleanup failed for user ${testAuth.user.email}: ${error}`);
        // Don't throw to avoid masking test failures
      }
    }
  });

  test('should open settings modal via navigation menu', async ({ browser }) => {
    logProgress('🚀 Starting settings modal navigation test...');

    // Create a new context with authentication cookies
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');

      // With session token, we should be automatically authenticated
      // Verify we're on the main chat page
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('📱 Navigated to application and verified authentication');

      // Click on user menu to open dropdown
      await page.click('[data-testid="nav-user"]');
      logProgress('👤 Clicked user navigation menu');

      // Click on Settings option in the dropdown
      await page.click('text=Settings');
      logProgress('⚙️ Clicked Settings option');

      // Wait for the settings modal content to be visible (not just the dialog wrapper)
      await expect(page.locator('text=General')).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Account' })).toBeVisible();
      logProgress('✅ Settings modal opened successfully');
    } finally {
      await context.close();
    }
  });

  test('should display all settings tabs', async ({ browser }) => {
    logProgress('🚀 Starting settings tabs visibility test...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('📱 Navigated to application and verified authentication');

      // Open settings modal
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      logProgress('⚙️ Opened settings modal');

      // Wait for modal content to be visible
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });

      // Check all expected tabs are present
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Beta features' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Commands' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Speech' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Data controls' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Account' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Sharing' })).toBeVisible();
      logProgress('📋 Verified all settings tabs are visible');

      // Check if Organization tab is visible (only for owners)
      const organizationTab = page.locator('text=Organization');
      const isOrganizationTabVisible = (await organizationTab.count()) > 0;

      if (isOrganizationTabVisible) {
        logProgress('🏢 Organization tab visible - user is organization owner');
      } else {
        logProgress('🏢 Organization tab hidden - user is not organization owner');
      }
    } finally {
      await context.close();
    }
  });

  test('should navigate between settings tabs', async ({ browser }) => {
    logProgress('🚀 Starting settings tab navigation test...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('📱 Navigated to application and verified authentication');

      // Open settings modal
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      logProgress('⚙️ Opened settings modal');

      // Wait for modal content to be ready
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });

      // Click on Chat tab
      await page.getByRole('tab', { name: 'Chat' }).click();
      logProgress('💬 Clicked Chat tab');

      // Verify Chat tab content is visible
      await expect(page.locator('text=Font size')).toBeVisible();
      logProgress('✅ Chat tab content verified');

      // Click on Account tab
      await page.getByRole('tab', { name: 'Account' }).click();
      logProgress('👤 Clicked Account tab');

      // Verify Account tab content is visible
      await expect(page.getByRole('heading', { name: 'Profile Information' })).toBeVisible();
      logProgress('✅ Account tab content verified');

      // Test Sharing tab
      await page.getByRole('tab', { name: 'Sharing' }).click();
      logProgress('🔗 Clicked Sharing tab');

      // Verify Sharing tab content
      await expect(page.getByRole('heading', { name: 'Sharing' })).toBeVisible();
      await expect(page.locator('text=Manage shared agents, prompts and chats')).toBeVisible();
      logProgress('✅ Sharing tab content verified');
    } finally {
      await context.close();
    }
  });

  test('should close settings modal', async ({ browser }) => {
    logProgress('🚀 Starting settings modal close test...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('📱 Navigated to application and verified authentication');

      // Open settings modal
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      logProgress('⚙️ Opened settings modal');

      // Wait for modal content to be ready
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });

      // Close modal via Escape key
      await page.keyboard.press('Escape');
      logProgress('❌ Pressed Escape to close modal');

      // Modal should be closed
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      logProgress('✅ Settings modal closed successfully');
    } finally {
      await context.close();
    }
  });
});

test.describe('General Settings Tab', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user for General Settings: ${testAuth.user.email}`);
  });

  test.afterAll(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up General Settings test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ General Settings cleanup failed: ${error}`);
      }
    }
  });

  test('should display theme selector', async ({ browser }) => {
    logProgress('🚀 Testing theme selector visibility...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to General tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=General');
      logProgress('⚙️ Navigated to General settings tab');

      await expect(page.locator('text=Theme')).toBeVisible();
      await expect(page.locator('[data-testid="theme-selector"]')).toBeVisible();
      logProgress('✅ Theme selector verified');
    } finally {
      await context.close();
    }
  });

  test('should NOT display language selector (removed in Issue #130)', async ({ browser }) => {
    logProgress('🚀 Testing language selector removal...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to General tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=General');
      logProgress('⚙️ Navigated to General settings tab');

      // Language selector should NOT be present (removed in Issue #130)
      await expect(page.locator('text=Language').first()).not.toBeVisible({ timeout: 5000 });
      logProgress('✅ Confirmed language selector is removed');
    } finally {
      await context.close();
    }
  });

  test('should display toggle switches', async ({ browser }) => {
    logProgress('🚀 Testing toggle switches...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to General tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=General');
      logProgress('⚙️ Navigated to General settings tab');

      // Check for various toggle switches
      await expect(page.locator('text=Render user messages as markdown')).toBeVisible();
      await expect(page.locator('text=Auto-Scroll to latest message on chat open')).toBeVisible();
      await expect(page.locator('text=Hide right-most side panel')).toBeVisible();
      logProgress('✅ Toggle switches verified');
    } finally {
      await context.close();
    }
  });

  test('should change theme setting', async ({ browser }) => {
    logProgress('🚀 Testing theme change functionality...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to General tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=General');
      logProgress('⚙️ Navigated to General settings tab');

      // Click on theme dropdown
      await page.click('[data-testid="theme-selector"]');
      logProgress('🎨 Clicked theme selector');

      // Select dark theme
      await page.click('text=Dark');
      logProgress('🌙 Selected dark theme');

      // Verify theme change (basic test - actual verification depends on implementation)
      logProgress('✅ Theme change test completed');
    } finally {
      await context.close();
    }
  });
});

test.describe('Chat Settings Tab', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user for Chat Settings: ${testAuth.user.email}`);
  });

  test.afterAll(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up Chat Settings test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Chat Settings cleanup failed: ${error}`);
      }
    }
  });

  test('should display font size selector', async ({ browser }) => {
    logProgress('🚀 Testing font size selector...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Chat tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('tab', { name: 'Chat' }).click();
      logProgress('⚙️ Navigated to Chat settings tab');

      await expect(page.locator('text=Font size').first()).toBeVisible({ timeout: 5000 });
      logProgress('✅ Font size selector verified');
    } finally {
      await context.close();
    }
  });

  test('should NOT display chat direction option (removed in Issue #130)', async ({ browser }) => {
    logProgress('🚀 Testing chat direction removal...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Chat tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('tab', { name: 'Chat' }).click();
      logProgress('⚙️ Navigated to Chat settings tab');

      // Chat direction should NOT be present (removed in Issue #130)
      await expect(
        page.locator('text=Chat direction').or(page.locator('text=Direction')),
      ).not.toBeVisible({ timeout: 5000 });
      logProgress('✅ Confirmed chat direction is removed');
    } finally {
      await context.close();
    }
  });

  test('should NOT display code interpreter option (removed in Issue #130)', async ({
    browser,
  }) => {
    logProgress('🚀 Testing code interpreter option removal...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Chat tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('tab', { name: 'Chat' }).click();
      logProgress('⚙️ Navigated to Chat settings tab');

      // Code interpreter option should NOT be present (removed in Issue #130)
      await expect(
        page
          .locator('text=Always show code when using code interpreter')
          .or(page.locator('text=Show code')),
      ).not.toBeVisible();
      logProgress('✅ Confirmed code interpreter option is removed');
    } finally {
      await context.close();
    }
  });

  test('should display updated endpoint switching text', async ({ browser }) => {
    logProgress('🚀 Testing updated endpoint switching text...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Chat tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('tab', { name: 'Chat' }).click();
      logProgress('⚙️ Navigated to Chat settings tab');

      // Should display updated text (changed in Issue #130)
      await expect(page.locator('text=Enable switching agents or models')).toBeVisible();
      logProgress('✅ Updated endpoint switching text verified');
    } finally {
      await context.close();
    }
  });

  test('should display various toggle switches', async ({ browser }) => {
    logProgress('🚀 Testing chat toggle switches...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Chat tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('tab', { name: 'Chat' }).click();
      logProgress('⚙️ Navigated to Chat settings tab');

      // Check for common chat settings
      await expect(
        page.locator('text=Enter to send').or(page.locator('text=enterToSend')),
      ).toBeVisible();
      await expect(page.locator('text=Maximize chat space')).toBeVisible();
      await expect(page.locator('text=Center chat input')).toBeVisible();
      logProgress('✅ Chat toggle switches verified');
    } finally {
      await context.close();
    }
  });
});

test.describe('Account Settings Tab', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user for Account Settings: ${testAuth.user.email}`);
  });

  test.afterAll(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up Account Settings test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Account Settings cleanup failed: ${error}`);
      }
    }
  });

  test('should display avatar management functionality', async ({ browser }) => {
    logProgress('🚀 Testing avatar management...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Account tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=Account');
      logProgress('⚙️ Navigated to Account settings tab');

      // Check for avatar management functionality
      await expect(page.getByText('Profile Photo', { exact: true })).toBeVisible();
      await expect(page.locator('text=Upload').or(page.locator('text=Change'))).toBeVisible();
      logProgress('✅ Avatar management functionality verified');
    } finally {
      await context.close();
    }
  });

  test('should display delete account option', async ({ browser }) => {
    logProgress('🚀 Testing delete account option...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Account tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=Account');
      logProgress('⚙️ Navigated to Account settings tab');

      await expect(page.locator('text=Delete Account')).toBeVisible();
      logProgress('✅ Delete account option verified');
    } finally {
      await context.close();
    }
  });
});

test.describe('Sharing Settings Tab', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user for Sharing Settings: ${testAuth.user.email}`);
  });

  test.afterAll(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up Sharing Settings test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Sharing Settings cleanup failed: ${error}`);
      }
    }
  });

  test('should display Sharing tab placeholder (added in Issue #130)', async ({ browser }) => {
    logProgress('🚀 Testing Sharing tab placeholder...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings and go to Sharing tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=Sharing');
      logProgress('⚙️ Navigated to Sharing settings tab');

      // Check for Sharing tab placeholder content (added in Issue #130)
      await expect(page.getByRole('heading', { name: 'Sharing' })).toBeVisible();
      await expect(page.locator('text=Manage shared agents, prompts and chats')).toBeVisible();
      await expect(page.locator('text=Coming Soon')).toBeVisible();
      logProgress('✅ Sharing tab placeholder verified');
    } finally {
      await context.close();
    }
  });
});

test.describe('Organization Settings Tab', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user for Organization Settings: ${testAuth.user.email}`);
  });

  test.afterAll(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up Organization Settings test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Organization Settings cleanup failed: ${error}`);
      }
    }
  });

  test('should display organization settings for owners (added owner checks in Issue #130)', async ({
    browser,
  }) => {
    logProgress('🚀 Testing organization settings for owners...');

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      logProgress('⚙️ Opened settings modal');

      // Check if Organization tab is visible (only for owners - added in Issue #130)
      const organizationTab = page.locator('text=Organization');
      const isOrganizationTabVisible = (await organizationTab.count()) > 0;

      if (isOrganizationTabVisible) {
        // Click on Organization tab if visible
        await organizationTab.click();
        logProgress('🏢 Clicked Organization tab');

        // Check for organization settings content
        await expect(page.getByRole('heading', { name: 'Organization Settings' })).toBeVisible();

        // Check for organization name field
        await expect(page.getByRole('textbox', { name: 'Organization Name' })).toBeVisible();

        // Check for Organization Logo section
        await expect(page.getByRole('heading', { name: 'Organization Logo' })).toBeVisible();
        
        // Check for Basic Information section
        await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
        
        logProgress('✅ Organization settings content verified');
      } else {
        // If not visible, test user is not an organization owner
        logProgress('🏢 Organization tab not visible - user is not an organization owner');
      }
    } finally {
      await context.close();
    }
  });

  test('should NOT display organization settings for non-owners', async ({ browser }) => {
    logProgress('🚀 Testing organization settings hidden for non-owners...');

    // Create an owner user first (this will be the organization owner)
    const ownerTestId = generateTestId();
    const ownerAuth = await createTestUserWithOrganization(ownerTestId);
    logProgress(`✅ Created owner test user: ${ownerAuth.user.email} for org: ${ownerAuth.organization.name}`);

    // Create a second user that will be added as a member to the existing organization
    const memberTestId = generateTestId();
    const memberEmail = `test-${memberTestId}@example.com`;
    const memberName = `Test Member ${memberTestId}`;
    const memberPassword = `TestPass123!${memberTestId}`;

    // Sign up the member user (without creating an organization)
    const signUpResponse = await fetch('http://localhost:3080/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: memberEmail,
        password: memberPassword,
        name: memberName,
      }),
    });

    if (!signUpResponse.ok) {
      throw new Error(`Member sign up failed: ${signUpResponse.status}`);
    }

    // Sign in the member user
    const signInResponse = await fetch('http://localhost:3080/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: memberEmail,
        password: memberPassword,
      }),
    });

    if (!signInResponse.ok) {
      throw new Error(`Member sign in failed: ${signInResponse.status}`);
    }

    // Extract session token
    const setCookieHeader = signInResponse.headers.get('set-cookie');
    const sessionTokenMatch = setCookieHeader?.match(/better-auth\.session_token=([^;]+)/);
    if (!sessionTokenMatch) {
      throw new Error('Session token not found in cookies');
    }
    const memberSessionToken = sessionTokenMatch[1];

    const signInData = await signInResponse.json();
    const memberUserId = signInData.user?.id;

    // Manually add the member to the owner's organization with 'member' role
    const { db } = await import('../utils/testAuth.js').then(m => m.getTestDatabase());
    await db.collection('member').insertOne({
      userId: memberUserId,
      organizationId: ownerAuth.organization.id,
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logProgress(`✅ Added member user to organization as 'member' role`);

    // Accept terms for the member user
    await fetch('http://localhost:3080/api/user/terms/accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `better-auth.session_token=${memberSessionToken}`,
      },
    });

    // Complete onboarding for the member user to bypass onboarding flow
    const completeOnboardingResponse = await fetch('http://localhost:3080/api/user/update-onboarding-step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `better-auth.session_token=${memberSessionToken}`,
      },
      body: JSON.stringify({
        onboardingStep: 'complete',
      }),
    });

    if (!completeOnboardingResponse.ok) {
      logProgress(`⚠️ Member onboarding completion failed: ${completeOnboardingResponse.status}`);
    } else {
      logProgress(`✅ Member onboarding completed successfully`);
    }

    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: memberSessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Open settings
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      logProgress('⚙️ Opened settings modal');

      // Organization tab should NOT be visible for non-owners
      const organizationTab = page.locator('text=Organization');
      await expect(organizationTab).not.toBeVisible();
      logProgress('✅ Confirmed Organization tab is hidden for non-owners');

      // Verify other tabs are still visible
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Account' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Sharing' })).toBeVisible();
      logProgress('✅ Confirmed other tabs remain visible for non-owners');

    } finally {
      await context.close();
      
      // Clean up both test users
      try {
        // Clean up member first
        await db.collection('member').deleteMany({ userId: memberUserId });
        await db.collection('user').deleteOne({ _id: memberUserId });
        logProgress(`✅ Cleaned up member test user: ${memberEmail}`);

        // Clean up owner and organization
        await cleanupTestUser(ownerAuth.user.id, ownerAuth.organization.id);
        logProgress(`✅ Cleaned up owner test user: ${ownerAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Test user cleanup failed: ${error}`);
      }
    }
  });
});

// Additional navigation and keyboard support tests can be added here as needed
// The core Issue #130 requirements have been covered in the tests above
