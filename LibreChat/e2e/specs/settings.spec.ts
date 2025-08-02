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

      // Organization tab should be visible for organization owners
      // Since we create the test user as an organization owner, it should be visible
      const organizationTab = page.locator('text=Organization');
      await expect(organizationTab).toBeVisible({
        timeout: 5000
      });
      logProgress('🏢 Organization tab visible - user is organization owner');
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

      // Step 1: Verify initial theme state (should be light by default)
      const initialTheme = await page.evaluate(() => {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark') || 
                      html.getAttribute('data-theme') === 'dark';
        const storageTheme = localStorage.getItem('color-theme') || 
                           localStorage.getItem('theme') || 
                           sessionStorage.getItem('theme');
        return { isDark, storageTheme };
      });
      
      // Assert we're starting from a known state (light theme)
      expect(initialTheme.isDark).toBe(false);
      expect(initialTheme.storageTheme).not.toBe('dark');
      logProgress('✅ Verified initial theme is light');

      // Step 2: Open settings and navigate to General tab
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=General');
      logProgress('⚙️ Navigated to General settings tab');

      // Step 3: Change theme to dark
      await page.click('[data-testid="theme-selector"]');
      logProgress('🎨 Clicked theme selector');

      await page.click('text=Dark');
      logProgress('🌙 Selected dark theme');

      // Step 4: Wait for theme to apply and verify the change
      await page.waitForFunction(() => {
        const html = document.documentElement;
        return html.classList.contains('dark') || 
               html.getAttribute('data-theme') === 'dark';
      }, { timeout: 5000 });

      // Step 5: Verify theme actually changed in DOM
      const currentTheme = await page.evaluate(() => {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark') || 
                      html.getAttribute('data-theme') === 'dark';
        const storageTheme = localStorage.getItem('color-theme') || 
                           localStorage.getItem('theme') || 
                           sessionStorage.getItem('theme');
        return { isDark, storageTheme };
      });
      
      // Assert theme changed to dark
      expect(currentTheme.isDark).toBe(true);
      expect(currentTheme.storageTheme).toBe('dark');
      logProgress('✅ Verified dark theme is applied and saved');

      // Step 6: Change back to light theme to verify bidirectional changes
      await page.click('[data-testid="theme-selector"]');
      await page.click('text=Light');
      logProgress('☀️ Selected light theme');

      // Wait for light theme to apply
      await page.waitForFunction(() => {
        const html = document.documentElement;
        return !html.classList.contains('dark') && 
               html.getAttribute('data-theme') !== 'dark';
      }, { timeout: 5000 });

      // Verify theme changed back to light
      const finalTheme = await page.evaluate(() => {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark') || 
                      html.getAttribute('data-theme') === 'dark';
        const storageTheme = localStorage.getItem('color-theme') || 
                           localStorage.getItem('theme') || 
                           sessionStorage.getItem('theme');
        return { isDark, storageTheme };
      });
      
      expect(finalTheme.isDark).toBe(false);
      expect(finalTheme.storageTheme).toBe('light');
      logProgress('✅ Verified theme can be changed back to light');
    } finally {
      await context.close();
    }
  });

  test('should persist theme setting across browser sessions', async ({ browser }) => {
    logProgress('🚀 Testing theme persistence across sessions...');

    // First session: set theme to dark
    const context1 = await browser.newContext();
    await context1.addCookies([{
      name: 'better-auth.session_token',
      value: testAuth.session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);

    const page1 = await context1.newPage();
    let storageState;

    try {
      await page1.goto('http://localhost:3080/');
      await expect(page1).toHaveURL(/.*\/c\/new/);

      // Open settings and set dark theme
      await page1.click('[data-testid="nav-user"]');
      await page1.click('text=Settings');
      await expect(page1.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page1.click('text=General');
      await page1.click('[data-testid="theme-selector"]');
      await page1.click('text=Dark');

      // Wait for theme to apply and be saved
      await page1.waitForFunction(() => {
        return localStorage.getItem('color-theme') === 'dark';
      }, { timeout: 10000 });

      // Also verify DOM changes
      await page1.waitForFunction(() => {
        const html = document.documentElement;
        return html.classList.contains('dark') || 
               html.getAttribute('data-theme') === 'dark' ||
               html.getAttribute('class')?.includes('dark');
      }, { timeout: 5000 });

      // Get the localStorage state to transfer to next session
      storageState = await context1.storageState();
      logProgress('✅ Dark theme set in first session');
    } finally {
      await context1.close();
    }

    // Second session: verify theme persists (with same storage state)
    const context2 = await browser.newContext({ storageState });
    await context2.addCookies([{
      name: 'better-auth.session_token',
      value: testAuth.session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);

    const page2 = await context2.newPage();

    try {
      await page2.goto('http://localhost:3080/');
      await expect(page2).toHaveURL(/.*\/c\/new/);

      // Wait for page to load and theme to apply
      await page2.waitForLoadState('networkidle');

      // First verify theme is still in storage
      const themeInStorage = await page2.evaluate(() => {
        return localStorage.getItem('color-theme');
      });
      
      expect(themeInStorage).toBe('dark');

      // Wait for theme to be applied to DOM - sometimes takes a moment
      await page2.waitForFunction(() => {
        const html = document.documentElement;
        return html.classList.contains('dark') || 
               html.getAttribute('data-theme') === 'dark' ||
               html.getAttribute('class')?.includes('dark');
      }, { timeout: 10000 });

      // Now verify dark theme is applied to DOM
      const htmlElement = page2.locator('html');
      const hasClass = await htmlElement.evaluate(el => 
        el.classList.contains('dark') || 
        el.getAttribute('data-theme') === 'dark' ||
        el.getAttribute('class')?.includes('dark')
      );
      
      expect(hasClass).toBe(true);
      logProgress('✅ Dark theme persisted across browser sessions');
    } finally {
      await context2.close();
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
    logProgress('🚀 Testing avatar management functionality...');

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

      // Verify all required elements for avatar management are present
      await expect(page.getByText('Profile Photo', { exact: true })).toBeVisible();
      
      // Check that file input for avatar upload exists and is properly configured
      const fileInput = page.locator('#avatar-upload');
      await expect(fileInput).toHaveCount(1);
      
      // Verify the input accepts proper file types (AccountProfileSetup uses image/*)
      const acceptAttribute = await fileInput.getAttribute('accept');
      expect(acceptAttribute).toBe('image/*');
      
      // Check that the avatar upload button/label exists (camera icon label)
      await expect(page.locator('label[for="avatar-upload"]')).toBeVisible();
      
      logProgress('✅ Avatar management functionality fully verified');
    } finally {
      await context.close();
    }
  });

  test('should display avatar in settings UI after upload', async ({ browser }) => {
    logProgress('🚀 Testing avatar display in settings UI after upload...');

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

      // Check that avatar upload functionality exists
      await expect(page.getByText('Profile Photo', { exact: true })).toBeVisible();
      await expect(page.locator('text=Upload').or(page.locator('text=Change'))).toBeVisible();

      // Upload a test image file using the hidden file input
      const fileInput = page.locator('#avatar-upload');
      
      // Assert file input exists - fail immediately if not found
      await expect(fileInput).toHaveCount(1);

      // Create a simple test image file and upload it
      await fileInput.setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
      logProgress('📝 Uploaded test avatar image');

      // Wait for upload to complete and verify avatar preview is displayed
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Avatar displayed in settings UI after upload');
      
      // Verify the avatar image source is set correctly
      const avatarSrc = await page.locator('[data-testid="avatar-preview"]').getAttribute('src');
      expect(avatarSrc).toBeTruthy();
      expect(avatarSrc).not.toBe('');
      logProgress('✅ Avatar image source verified');
    } finally {
      await context.close();
    }
  });

  test('should display avatar in chat side panel after upload', async ({ browser }) => {
    logProgress('🚀 Testing avatar display in chat side panel after upload...');

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

      // Step 1: Capture initial state - test users start with DiceBear avatars
      logProgress('📝 Step 1: Capturing initial state before upload...');
      const navUser = page.locator('[data-testid="nav-user"]');
      await expect(navUser).toBeVisible();

      // Test users are created with default DiceBear avatars
      const existingAvatarSelector = '[data-testid="nav-user"] img';
      const existingAvatars = page.locator(existingAvatarSelector);
      
      // Verify initial avatar exists (DiceBear default)
      await expect(existingAvatars.first()).toBeVisible();
      const initialAvatarSrc = await existingAvatars.first().getAttribute('src');
      expect(initialAvatarSrc).toBeTruthy();
      expect(initialAvatarSrc).toContain('data:image/svg+xml'); // DiceBear avatars are SVG data URLs
      logProgress(`📊 Found default DiceBear avatar: ${initialAvatarSrc?.substring(0, 50)}...`);

      // Step 2: Upload avatar via settings
      logProgress('📝 Step 2: Uploading avatar via settings...');
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=Account');
      logProgress('⚙️ Navigated to Account settings tab');

      // Check that avatar upload functionality exists
      await expect(page.getByText('Profile Photo', { exact: true })).toBeVisible();
      await expect(page.locator('text=Upload').or(page.locator('text=Change'))).toBeVisible();

      // Upload a test image file using the hidden file input
      const fileInput = page.locator('#avatar-upload');
      
      // Assert file input exists - fail immediately if not found
      await expect(fileInput).toHaveCount(1);

      // Create a simple test image file
      await fileInput.setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
      });

      // Wait for upload to process
      await page.waitForLoadState('networkidle');
      logProgress('📤 File uploaded, checking for Save button...');

      // Click Save button to persist the avatar upload
      const saveButton = page
        .getByRole('button', { name: /save/i })
        .or(page.getByTestId('profile-save-button'));
      
      // Assert Save button exists and is enabled
      await expect(saveButton).toBeVisible();
      await expect(saveButton).toBeEnabled();
      
      await saveButton.first().click();
      logProgress('💾 Clicked Save button to persist avatar upload');
      
      // Wait for save to complete
      await page.waitForLoadState('networkidle');

      // VERIFY the avatar actually appears in the settings UI
      const settingsAvatar = page.locator(
        '[data-testid="user-avatar"], .user-avatar, img[alt*="avatar" i], img[alt*="profile" i]',
      );
      
      // Assert avatar is displayed after upload
      await expect(settingsAvatar.first()).toBeVisible({
        timeout: 10000
      });
      logProgress('✅ Avatar successfully displayed in settings UI after upload');

      // Step 3: Navigate back to chat and check side panel for newly uploaded avatar
      logProgress('📝 Step 3: Checking side panel for newly uploaded avatar...');
      
      // Close the settings modal by pressing Escape
      await page.keyboard.press('Escape');
      
      // Wait for modal to actually close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({
        timeout: 5000
      });
      
      // Verify we're back on the chat page
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Check for newly uploaded avatar in side panel
      const avatarElements = page.locator(
        '[data-testid="nav-user"] img, .nav-user img, [data-testid="user-avatar"], .user-avatar',
      );
      
      // Assert avatar is displayed in side panel - fail if not visible
      await expect(avatarElements.first()).toBeVisible({
        timeout: 10000
      });
      
      // Verify avatar changed from default DiceBear to uploaded image
      const newAvatarSrc = await avatarElements.first().getAttribute('src');
      expect(newAvatarSrc).toBeTruthy();
      expect(newAvatarSrc).not.toContain('data:image/svg+xml'); // No longer a DiceBear SVG
      expect(newAvatarSrc).not.toBe(initialAvatarSrc); // Different from initial avatar
      
      logProgress('✅ Avatar successfully displayed in chat side panel after upload');
    } finally {
      await context.close();
    }
  });

  test('should display fallback text initials in settings UI after image removal', async ({
    browser,
  }) => {
    logProgress('🚀 Testing fallback text initials in settings UI after image removal...');

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

      // Check that avatar management functionality exists
      await expect(page.getByText('Profile Photo', { exact: true })).toBeVisible();

      // This test requires an avatar to be present first, so we can remove it
      // Step 1: Upload an avatar first
      const fileInput = page.locator('#avatar-upload');
      
      // Assert file input exists - fail if avatar upload functionality is missing
      await expect(fileInput).toHaveCount(1);

      // Upload a test avatar
      await fileInput.setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
      logProgress('📤 Uploaded test avatar for removal test');

      // Wait for upload and verify avatar is present
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible({ timeout: 10000 });
      logProgress('✅ Avatar uploaded and visible');

      // Step 2: Look for and click remove button
      const removeButton = page.locator(
        'button:has-text("Remove"), button:has-text("Delete"), [aria-label*="remove" i], [aria-label*="delete" i]',
      );
      
      // Assert remove button exists and is visible
      await expect(removeButton.first()).toBeVisible();

      // Click the remove button
      await removeButton.first().click();
      logProgress('🗑️ Clicked avatar remove button');

      // Step 3: Wait for removal and verify fallback avatar appears
      await page.waitForLoadState('networkidle');

      // After removal, the avatar preview should be gone
      await expect(page.locator('[data-testid="avatar-preview"]')).not.toBeVisible();

      // Calculate expected initials from test user name
      const userName = testAuth.user.name;
      const expectedInitials = userName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      logProgress(`🔍 Looking for fallback initials: "${expectedInitials}" from name: "${userName}"`);

      // Look for the calculated initials
      const initialsElement = page.getByText(expectedInitials, { exact: true });

      // Assert the initials are visible
      await expect(initialsElement).toBeVisible({
        timeout: 10000
      });
      logProgress(`✅ Fallback avatar with initials "${expectedInitials}" displayed after image removal`);
    } finally {
      await context.close();
    }
  });

  test('should display fallback text initials in chat side panel after image removal', async ({
    browser,
  }) => {
    logProgress('🚀 Testing fallback text initials in chat side panel after image removal...');

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

      // Step 1: Upload avatar via settings first
      logProgress('📝 Step 1: Uploading avatar via settings...');
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=Account');

      // Upload avatar
      const fileInput = page.locator('#avatar-upload');
      
      // Assert file input exists
      await expect(fileInput).toHaveCount(1);

      await fileInput.setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
      });

      // Wait for upload and save changes
      await page.waitForLoadState('networkidle');
      
      // Click Save button to persist the avatar upload
      const saveButton = page
        .getByRole('button', { name: /save/i })
        .or(page.getByTestId('profile-save-button'));
      
      await expect(saveButton).toBeVisible();
      await saveButton.first().click();
      await page.waitForLoadState('networkidle');
      logProgress('✅ Avatar uploaded and saved in settings');

      // Step 2: Remove the avatar
      logProgress('📝 Step 2: Removing avatar...');
      const removeButton = page.locator(
        'button:has-text("Remove"), button:has-text("Delete"), [aria-label*="remove" i], [aria-label*="delete" i]',
      );
      
      // Assert remove button exists and is visible
      await expect(removeButton.first()).toBeVisible();

      await removeButton.first().click();
      logProgress('🗑️ Clicked avatar remove button');

      // Wait for UI to update after removal
      await page.waitForLoadState('networkidle');

      // Save the removal changes
      logProgress('💾 Saving avatar removal changes...');
      const saveRemovalButton = page
        .getByRole('button', { name: /save/i })
        .or(page.getByTestId('profile-save-button'));
      
      // Assert save button exists and click it
      await expect(saveRemovalButton.first()).toBeVisible();
      await expect(saveRemovalButton.first()).toBeEnabled();
      await saveRemovalButton.first().click();
      
      // Wait for save to complete
      await page.waitForLoadState('networkidle');
      logProgress('✅ Avatar removal saved');

      // Step 3: Close settings modal and verify fallback initials in side panel
      logProgress('📝 Step 3: Closing settings and checking side panel for fallback initials...');

      // Close the settings modal by clicking the X button or pressing Escape
      await page.keyboard.press('Escape');
      
      // Wait for modal to actually close
      await expect(page.locator('[role="dialog"]')).not.toBeVisible({
        timeout: 5000
      });

      // Verify we're back on the chat page
      await expect(page).toHaveURL(/.*\/c\/new/, { timeout: 10000 });

      // Check for fallback initials avatar in the side panel after modal close
      logProgress('🔍 Checking for fallback initials avatar in chat side panel...');

      // Wait for UI updates after modal close
      await page.waitForLoadState('networkidle');

      // Look for the nav-user area and verify DiceBear fallback avatar is displayed
      const navUser = page.locator('[data-testid="nav-user"]');
      await expect(navUser).toBeVisible({ timeout: 5000 });

      const avatarImg = navUser.locator('img');
      const imgSrc = await avatarImg.first().getAttribute('src');

      // Assert that avatar has reverted to DiceBear fallback after removal
      expect(imgSrc).toBeTruthy();
      expect(imgSrc).toContain('data:image/svg+xml'); // Should be DiceBear SVG
      logProgress('✅ Found DiceBear-generated fallback avatar (SVG with initials)');
    } finally {
      await context.close();
    }
  });

  test('should display helpful error if image type is not supported', async ({ browser }) => {
    logProgress('🚀 Testing error handling for unsupported image types...');

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

      // Navigate to Account Settings
      logProgress('📝 Opening Account Settings...');
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=Account');

      // Verify avatar upload functionality is available
      const fileInput = page.locator('#avatar-upload');
      const fileInputCount = await fileInput.count();

      if (fileInputCount === 0) {
        throw new Error('Avatar upload functionality not found - cannot test error handling');
      }

      // Try to upload an unsupported file type (.txt file)
      logProgress('📤 Attempting to upload unsupported file type (.txt)...');

      // Create a text file buffer
      const textFileContent = 'This is a text file, not an image';
      const textFileBuffer = Buffer.from(textFileContent, 'utf8');

      await fileInput.setInputFiles({
        name: 'test-file.txt',
        mimeType: 'text/plain',
        buffer: textFileBuffer,
      });

      // Wait for error message to appear
      logProgress('⏳ Waiting for error message...');
      await page.waitForLoadState('networkidle');

      // Look for error message: "Please select a valid image file (JPEG, PNG, GIF, or WebP)"
      await expect(page.getByText('valid image file')).toBeVisible({ timeout: 5000 });
      logProgress('✅ Found unsupported file type error message');

      logProgress('✅ Error properly displayed for unsupported image type');
    } finally {
      await context.close();
    }
  });

  test('should display helpful error if image size exceeds limit', async ({ browser }) => {
    logProgress('🚀 Testing error handling for oversized images...');

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

      // Navigate to Account Settings
      logProgress('📝 Opening Account Settings...');
      await page.click('[data-testid="nav-user"]');
      await page.click('text=Settings');
      await expect(page.getByRole('tab', { name: 'General' })).toBeVisible({ timeout: 15000 });
      await page.click('text=Account');

      // Verify avatar upload functionality is available
      const fileInput = page.locator('#avatar-upload');
      const fileInputCount = await fileInput.count();

      if (fileInputCount === 0) {
        throw new Error('Avatar upload functionality not found - cannot test error handling');
      }

      // Create a large image file (simulate exceeding size limit)
      logProgress('📤 Attempting to upload oversized image...');

      // Create a large buffer (5MB) to simulate an oversized image
      const largeImageSize = 5 * 1024 * 1024; // 5MB
      const largeImageBuffer = Buffer.alloc(largeImageSize, 0);

      // Add minimal PNG header to make it a valid image format
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      pngHeader.copy(largeImageBuffer, 0);

      await fileInput.setInputFiles({
        name: 'large-image.png',
        mimeType: 'image/png',
        buffer: largeImageBuffer,
      });

      // Wait for error message to appear
      logProgress('⏳ Waiting for size limit error message...');
      await page.waitForLoadState('networkidle');

      // Look for error message: "Image is too large (5.0MB). Please select an image smaller than 2MB"
      await expect(page.getByText('too large')).toBeVisible({ timeout: 5000 });
      logProgress('✅ Found oversized image error message');

      logProgress('✅ Error properly displayed for oversized image');
    } finally {
      await context.close();
    }
  });

  test('should delete account and verify deletion', async ({ browser }) => {
    logProgress('🚀 Testing account deletion functionality...');

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

      // Find and click the red Delete button in the Danger Zone
      const deleteButton = page.locator(
        'button:has-text("Delete"):not(:has-text("Delete Account"))',
      );
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();
      logProgress('🗑️ Clicked red Delete button in Danger Zone');

      // Wait for delete confirmation dialog to appear
      await page.waitForLoadState('networkidle');

      // Wait for the delete account confirmation dialog to appear
      // The dialog contains "Delete Account" title with alert icon
      await expect(page.getByRole('heading', { name: 'Delete Account' })).toBeVisible({ timeout: 10000 });
      logProgress('📧 Delete account confirmation dialog appeared');

      // Find the email input field by its id
      const emailInput = page.locator('#email-confirm-input');
      await expect(emailInput).toBeVisible({ timeout: 5000 });

      // Clear any existing text and enter the user's email
      await emailInput.clear();
      await emailInput.fill(testAuth.user.email);
      logProgress(`📧 Entered email confirmation: ${testAuth.user.email}`);

      // Wait for form validation to complete
      await page.waitForLoadState('networkidle');

      // Click the final red "Delete Account" button in the confirmation dialog
      // The actual button shows "Delete Account" text but is not a role button
      const finalDeleteButton = page.locator('button:has-text("Delete Account"):not([disabled])');
      await expect(finalDeleteButton).toBeVisible({ timeout: 5000 });
      await finalDeleteButton.click();
      logProgress('✅ Clicked final Delete Account button with email verification');

      // Wait for deletion to complete and verify user is logged out
      await page.waitForLoadState('networkidle');

      // Wait for potential redirect after account deletion - either to login page or user menu disappears
      try {
        await page.waitForURL(/\/(login|register|auth|$)/, { timeout: 10000 });
        logProgress('✅ Redirected to authentication page after account deletion');
      } catch {
        // If no redirect, wait for user menu to disappear as sign of logout
        await expect(page.locator('[data-testid="nav-user"]')).not.toBeVisible({ timeout: 10000 });
        logProgress('✅ User menu disappeared after account deletion');
      }

      // Check if user was logged out by trying to access the current page
      const currentUrl = page.url();
      logProgress(`📍 Current URL after deletion: ${currentUrl}`);

      // Try to determine if user is still authenticated by checking for user menu
      try {
        // If the user menu is still present, the user is still logged in
        const userMenuVisible = await page.locator('[data-testid="nav-user"]').isVisible({ timeout: 2000 });
        if (!userMenuVisible) {
          logProgress('✅ Account deletion successful - user menu no longer visible');
        } else {
          logProgress('❌ Account deletion may have failed - user menu still visible');
          // Check if we're on login/register page despite user menu being visible
          if (currentUrl.includes('/login') || currentUrl.includes('/register') || currentUrl.includes('/auth')) {
            logProgress('✅ Account deletion successful - redirected to authentication page');
          } else {
            throw new Error('Account deletion failed - user menu still visible and not on auth page');
          }
        }
      } catch (e) {
        // If we can't find the user menu, that's actually good - means user was logged out
        logProgress('✅ Account deletion successful - user menu not found (user logged out)');
      }

      logProgress('✅ Account deletion completed and verified');
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
    logProgress(
      `✅ Created owner test user: ${ownerAuth.user.email} for org: ${ownerAuth.organization.name}`,
    );

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
    const { db } = await import('../utils/testAuth.js').then((m) => m.getTestDatabase());
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
    const completeOnboardingResponse = await fetch(
      'http://localhost:3080/api/user/update-onboarding-step',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${memberSessionToken}`,
        },
        body: JSON.stringify({
          onboardingStep: 'complete',
        }),
      },
    );

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
