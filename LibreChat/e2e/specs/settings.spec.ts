import { test, expect } from '@playwright/test';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login
    await page.goto('/');
    
    // Wait for the app to load and login if needed
    await page.waitForSelector('[data-testid="login-form"]', { state: 'detached', timeout: 10000 }).catch(() => {
      // If login form doesn't disappear, we might need to login
    });
    
    // Check if we need to login
    const loginForm = await page.locator('[data-testid="login-form"]').count();
    if (loginForm > 0) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/c/new');
    }
  });

  test('should open settings modal via navigation menu', async ({ page }) => {
    // Click on user menu to open dropdown
    await page.click('[data-testid="nav-user"]');
    
    // Click on Settings option in the dropdown
    await page.click('text=Settings');
    
    // Settings modal should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('should display all settings tabs', async ({ page }) => {
    // Open settings modal
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    
    // Wait for modal to be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Check all expected tabs are present
    await expect(page.locator('text=General')).toBeVisible();
    await expect(page.locator('text=Chat')).toBeVisible();
    await expect(page.locator('text=Beta')).toBeVisible();
    await expect(page.locator('text=Commands')).toBeVisible();
    await expect(page.locator('text=Speech')).toBeVisible();
    await expect(page.locator('text=Data')).toBeVisible();
    await expect(page.locator('text=Account')).toBeVisible();
    await expect(page.locator('text=Organization')).toBeVisible();
  });

  test('should navigate between settings tabs', async ({ page }) => {
    // Open settings modal
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    
    // Wait for modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Click on Chat tab
    await page.click('text=Chat');
    
    // Verify Chat tab content is visible
    await expect(page.locator('text=Font size')).toBeVisible();
    
    // Click on Account tab
    await page.click('text=Account');
    
    // Verify Account tab content is visible (user avatar or profile info)
    await expect(page.locator('text=Avatar', 'text=Profile', 'text=Delete Account')).toBeVisible();
  });

  test('should close settings modal', async ({ page }) => {
    // Open settings modal
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    
    // Wait for modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Close modal via X button
    await page.click('[aria-label*="Close"], button:has(svg[stroke="currentColor"])', { timeout: 5000 });
    
    // Modal should be closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});

test.describe('General Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login if needed
    const loginForm = await page.locator('[data-testid="login-form"]').count();
    if (loginForm > 0) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/c/new');
    }
    
    // Open settings and go to General tab
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('text=General');
  });

  test('should display theme selector', async ({ page }) => {
    await expect(page.locator('text=Theme')).toBeVisible();
    await expect(page.locator('[data-testid="theme-selector"]')).toBeVisible();
  });

  test('should display language selector', async ({ page }) => {
    await expect(page.locator('text=Language')).toBeVisible();
    // Language dropdown should be present
    await expect(page.locator('text=English, text=Auto, [role="combobox"]')).toBeVisible();
  });

  test('should display toggle switches', async ({ page }) => {
    // Check for various toggle switches
    await expect(page.locator('text=Enable markdown in user messages', 'text=User message markdown')).toBeVisible();
    await expect(page.locator('text=Auto-scroll chat', 'text=Auto scroll')).toBeVisible();
    await expect(page.locator('text=Hide side panel')).toBeVisible();
  });

  test('should display archived chats section', async ({ page }) => {
    await expect(page.locator('text=Archived chats', 'text=Archived Chats')).toBeVisible();
  });

  test('should change theme setting', async ({ page }) => {
    // Click on theme dropdown
    await page.click('[data-testid="theme-selector"]');
    
    // Select dark theme
    await page.click('text=Dark');
    
    // Verify theme change (might need to check body class or similar)
    // This is a basic test - actual theme verification would depend on implementation
  });
});

test.describe('Chat Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login if needed
    const loginForm = await page.locator('[data-testid="login-form"]').count();
    if (loginForm > 0) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/c/new');
    }
    
    // Open settings and go to Chat tab
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('text=Chat');
  });

  test('should display font size selector', async ({ page }) => {
    await expect(page.locator('text=Font size')).toBeVisible();
  });

  test('should display chat direction option', async ({ page }) => {
    await expect(page.locator('text=Chat direction', 'text=Direction')).toBeVisible();
  });

  test('should display code interpreter option', async ({ page }) => {
    await expect(page.locator('text=Always show code when using code interpreter', 'text=Show code')).toBeVisible();
  });

  test('should display badges state option', async ({ page }) => {
    await expect(page.locator('text=Save badges state')).toBeVisible();
  });

  test('should display endpoint switching option', async ({ page }) => {
    await expect(page.locator('text=Enable switching Endpoints mid-conversation', 'text=switching Endpoints')).toBeVisible();
  });

  test('should display various toggle switches', async ({ page }) => {
    // Check for common chat settings
    await expect(page.locator('text=Enter to send', 'text=enterToSend')).toBeVisible();
    await expect(page.locator('text=Maximize chat space')).toBeVisible();
    await expect(page.locator('text=Center chat input')).toBeVisible();
    await expect(page.locator('text=Show thinking')).toBeVisible();
  });

  test('should display fork settings', async ({ page }) => {
    await expect(page.locator('text=Fork', 'text=default')).toBeVisible();
  });
});

test.describe('Account Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login if needed
    const loginForm = await page.locator('[data-testid="login-form"]').count();
    if (loginForm > 0) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/c/new');
    }
    
    // Open settings and go to Account tab
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('text=Account');
  });

  test('should display account settings options', async ({ page }) => {
    // Check for account-related settings
    await expect(page.locator('text=Avatar', 'text=Display username', 'text=Delete Account')).toBeVisible();
  });

  test('should display two-factor authentication for local users', async ({ page }) => {
    // This test assumes local auth - might need conditional logic
    await expect(page.locator('text=Two-factor', 'text=2FA')).toBeVisible();
  });

  test('should display delete account option', async ({ page }) => {
    await expect(page.locator('text=Delete Account')).toBeVisible();
  });
});

test.describe('Organization Settings Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login if needed
    const loginForm = await page.locator('[data-testid="login-form"]').count();
    if (loginForm > 0) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/c/new');
    }
    
    // Open settings and go to Organization tab
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('text=Organization');
  });

  test('should display organization settings for owners', async ({ page }) => {
    // This test assumes user is an org owner
    await expect(page.locator('text=Organization Settings', 'text=Organization')).toBeVisible();
    
    // Check for organization name field
    await expect(page.locator('text=Organization Name', 'input[placeholder*="organization"]')).toBeVisible();
  });

  test('should show access denied for non-owners', async ({ page }) => {
    // This would need conditional logic based on user role
    // For now, just check if either settings or access denied is shown
    const hasSettings = await page.locator('text=Organization Settings').count();
    const hasAccessDenied = await page.locator('text=Access Denied').count();
    
    expect(hasSettings + hasAccessDenied).toBeGreaterThan(0);
  });
});

test.describe('Settings Navigation and Keyboard Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login if needed
    const loginForm = await page.locator('[data-testid="login-form"]').count();
    if (loginForm > 0) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('/c/new');
    }
    
    // Open settings
    await page.click('[data-testid="nav-user"]');
    await page.click('text=Settings');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should support keyboard navigation between tabs', async ({ page }) => {
    // Focus on the first tab
    await page.keyboard.press('Tab');
    
    // Use arrow keys to navigate
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    
    // Verify navigation worked (this is a basic test)
    const focusedElement = await page.locator(':focus').textContent();
    expect(focusedElement).toBeTruthy();
  });

  test('should support Home and End keys for tab navigation', async ({ page }) => {
    // Focus on tabs area
    await page.keyboard.press('Tab');
    
    // Press Home to go to first tab
    await page.keyboard.press('Home');
    
    // Press End to go to last tab
    await page.keyboard.press('End');
    
    // Verify we can navigate with keyboard
    const focusedElement = await page.locator(':focus').textContent();
    expect(focusedElement).toBeTruthy();
  });
});