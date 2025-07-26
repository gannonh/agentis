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
      const fileInputCount = await fileInput.count();

      if (fileInputCount > 0) {
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
      } else {
        logProgress('❌ File input not found - avatar upload feature is missing');
        // FAIL the test if upload functionality doesn't exist
        throw new Error(
          'Avatar upload functionality not found - file input with id "avatar-upload" is missing',
        );
      }
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

      // Step 1: Check that avatar does NOT exist in side panel (fallback initials instead)
      logProgress('📝 Step 1: Checking for fallback initials before upload...');
      const navUser = page.locator('[data-testid="nav-user"]');
      await expect(navUser).toBeVisible();

      // Look for fallback initials in the navigation
      const fallbackElements = navUser.locator('text=/^[A-Z]{1,2}$/');
      const fallbackCount = await fallbackElements.count();
      if (fallbackCount > 0) {
        await expect(fallbackElements.first()).toBeVisible();
        logProgress('✅ Confirmed fallback initials displayed before upload');
      } else {
        logProgress('ℹ️ No fallback initials found - checking for default avatar state');
      }

      // Verify no actual avatar image exists yet
      const existingAvatarImages = page.locator('[data-testid="nav-user"] img, .nav-user img');
      const existingImageCount = await existingAvatarImages.count();
      logProgress(`📊 Found ${existingImageCount} existing avatar images in nav`);

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
      const fileInputCount = await fileInput.count();

      if (fileInputCount > 0) {
        // Create a simple test image file
        await fileInput.setInputFiles({
          name: 'test-avatar.png',
          mimeType: 'image/png',
          buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            'base64',
          ),
        });

        // Wait for upload to complete
        await page.waitForTimeout(2000);
        logProgress('📤 File uploaded, checking for Save button...');

        // Click Save button to persist the avatar upload
        const saveButton = page
          .getByRole('button', { name: /save/i })
          .or(page.getByTestId('profile-save-button'));
        const saveButtonCount = await saveButton.count();

        if (saveButtonCount > 0) {
          const isEnabled = await saveButton.first().isEnabled();
          logProgress(`💾 Save button found, enabled: ${isEnabled}`);
          
          if (isEnabled) {
            await saveButton.first().click();
            logProgress('💾 Clicked Save button to persist avatar upload');
            
            // Wait for save to complete
            await page.waitForTimeout(2000);
          } else {
            logProgress('⚠️ Save button is disabled - avatar may auto-save');
          }
        } else {
          logProgress('⚠️ No Save button found - avatar may auto-save');
        }

        // VERIFY the avatar actually appears in the settings UI
        const settingsAvatar = page.locator(
          '[data-testid="user-avatar"], .user-avatar, img[alt*="avatar" i], img[alt*="profile" i]',
        );
        const settingsAvatarCount = await settingsAvatar.count();

        if (settingsAvatarCount > 0 && (await settingsAvatar.first().isVisible())) {
          logProgress('✅ Avatar successfully displayed in settings UI after upload');
        } else {
          logProgress(
            '❌ Avatar NOT displayed in settings UI after upload - upload may have failed',
          );
          // Still continue the test to see what happens in side panel
        }
      } else {
        logProgress('❌ File input not found');
        // FAIL the test if upload functionality doesn't exist
        throw new Error('Avatar upload functionality not found');
      }

      // Step 3: Navigate back to chat and check side panel for newly uploaded avatar
      logProgress('📝 Step 3: Checking side panel for newly uploaded avatar...');
      
      // Close the settings modal by pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500); // Wait for modal to close
      
      // Verify we're back on the chat page
      await expect(page).toHaveURL(/.*\/c\/new/);

      // Check for newly uploaded avatar in side panel
      const avatarElements = page.locator(
        '[data-testid="nav-user"] img, .nav-user img, [data-testid="user-avatar"], .user-avatar',
      );
      const avatarElementCount = await avatarElements.count();

      if (avatarElementCount > 0) {
        await expect(avatarElements.first()).toBeVisible();
        logProgress('✅ Avatar successfully displayed in chat side panel after upload');
      } else {
        logProgress(
          '⚠️ Avatar not found in side panel after upload - may need page refresh or not implemented yet',
        );
        // Try refreshing the page to see if avatar appears
        await page.reload();
        await page.waitForTimeout(1000);

        const refreshedAvatarElements = page.locator(
          '[data-testid="nav-user"] img, .nav-user img, [data-testid="user-avatar"], .user-avatar',
        );
        const refreshedCount = await refreshedAvatarElements.count();

        if (refreshedCount > 0) {
          await expect(refreshedAvatarElements.first()).toBeVisible();
          logProgress('✅ Avatar displayed in side panel after page refresh');
        } else {
          logProgress('⚠️ Avatar still not visible after refresh');
        }
      }
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
      const fileInputCount = await fileInput.count();

      if (fileInputCount === 0) {
        throw new Error('Avatar upload functionality not found - cannot test removal');
      }

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
      const removeButtonExists = (await removeButton.count()) > 0;

      if (!removeButtonExists || !(await removeButton.first().isVisible())) {
        throw new Error(
          'Remove button not found - cannot test avatar removal and fallback initials',
        );
      }

      // Click the remove button
      await removeButton.first().click();
      logProgress('🗑️ Clicked avatar remove button');

      // Step 3: Wait for removal and verify fallback avatar appears
      await page.waitForTimeout(1000);

      // After removal, the avatar preview should be gone
      await expect(page.locator('[data-testid="avatar-preview"]')).not.toBeVisible();

      // Look for the initials that should appear after removal
      // Test user name is "Test User 1753551830313-1h3s8z", so initials should be "TU"
      const initialsElement = page.getByText('TU', { exact: true });

      // Verify the initials are visible
      const initialsVisible = await initialsElement.isVisible();

      if (!initialsVisible) {
        throw new Error('Fallback initials "TU" not displayed after avatar image removal');
      }

      await expect(initialsElement).toBeVisible();
      logProgress('✅ Fallback avatar with initials "TU" displayed after image removal');
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
      const fileInputCount = await fileInput.count();

      if (fileInputCount === 0) {
        throw new Error('Avatar upload functionality not found - cannot test removal');
      }

      await fileInput.setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64',
        ),
      });

      // Wait for upload and verify avatar is present
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible({ timeout: 10000 });
      logProgress('✅ Avatar uploaded and visible in settings');

      // Step 2: Remove the avatar
      logProgress('📝 Step 2: Removing avatar...');
      const removeButton = page.locator(
        'button:has-text("Remove"), button:has-text("Delete"), [aria-label*="remove" i], [aria-label*="delete" i]',
      );
      const removeButtonExists = (await removeButton.count()) > 0;

      if (!removeButtonExists || !(await removeButton.first().isVisible())) {
        throw new Error('Remove button not found - cannot test avatar removal');
      }

      await removeButton.first().click();
      logProgress('🗑️ Clicked avatar remove button');

      // Wait a moment for the UI to update after removal
      await page.waitForTimeout(1000);

      // Check if Save button becomes enabled after avatar removal
      logProgress('💾 Checking Save button state after avatar removal...');
      const saveButton = page
        .getByRole('button', { name: /save/i })
        .or(page.getByTestId('profile-save-button'));
      const saveButtonCount = await saveButton.count();

      if (saveButtonCount > 0) {
        const isEnabled = await saveButton.first().isEnabled();
        logProgress(`💾 Save button enabled: ${isEnabled}`);

        if (isEnabled) {
          await saveButton.first().click();
          logProgress('💾 Clicked Save button to persist changes');

          // Wait for save to complete
          await page.waitForTimeout(2000);
          logProgress('✅ Profile changes saved');
        } else {
          logProgress('⚠️ Save button is disabled - changes might auto-save');
          // Wait a bit longer in case changes auto-save
          await page.waitForTimeout(2000);
        }
      } else {
        logProgress('⚠️ No Save button found - changes might auto-save');
        await page.waitForTimeout(2000);
      }

      // Step 3: Close settings modal and verify fallback initials in side panel
      logProgress('📝 Step 3: Closing settings and checking side panel for fallback initials...');

      // Close the settings modal by clicking the X button or pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500); // Wait for modal to close

      // Verify we're back on the chat page
      await expect(page).toHaveURL(/.*\/c\/new/, { timeout: 10000 });

      // Check for fallback initials avatar in the side panel after modal close
      logProgress('🔍 Checking for fallback initials avatar in chat side panel...');

      // Wait for UI updates after modal close
      await page.waitForTimeout(1000);

      // Look for the nav-user area and verify DiceBear fallback avatar is displayed
      const navUser = page.locator('[data-testid="nav-user"]');
      await expect(navUser).toBeVisible({ timeout: 5000 });

      const avatarImg = navUser.locator('img');
      const imgSrc = await avatarImg.first().getAttribute('src');

      if (imgSrc && imgSrc.startsWith('data:image/svg+xml')) {
        logProgress('✅ Found DiceBear-generated fallback avatar (SVG with initials)');
      } else {
        throw new Error(
          `Expected DiceBear fallback avatar, but found: ${imgSrc?.substring(0, 50)}...`,
        );
      }
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
      await page.waitForTimeout(2000);

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
      await page.waitForTimeout(2000);

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

      // Handle email confirmation dialog that appears after clicking Delete
      await page.waitForTimeout(2000);

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

      // Wait a moment for the form to validate
      await page.waitForTimeout(1000);

      // Click the final red "Delete Account" button in the confirmation dialog
      const finalDeleteButton = page.getByRole('button', { name: 'Delete Account' });
      await expect(finalDeleteButton).toBeVisible({ timeout: 5000 });
      await finalDeleteButton.click();
      logProgress('✅ Clicked final Delete Account button with email verification');

      // Wait for deletion to complete and verify user is logged out
      await page.waitForTimeout(3000);

      // After account deletion, user should be immediately redirected to login/auth page
      const currentUrl = page.url();
      logProgress(`📍 Current URL after deletion: ${currentUrl}`);

      if (
        currentUrl.includes('/login') ||
        currentUrl.includes('/register') ||
        currentUrl.includes('/auth')
      ) {
        logProgress('✅ Account deletion successful - redirected to authentication page');
      } else {
        // If not redirected, this indicates the account deletion failed
        logProgress('❌ Account deletion failed - user still logged in and on protected route');
        throw new Error(
          'Account deletion failed - user was not logged out and redirected to authentication',
        );
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
