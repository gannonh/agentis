import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Onboarding Profile Setup', () => {
  test.describe('Magic Link Flow', () => {
    test('User can complete profile setup with name and avatar', async ({ page }) => {
      // Arrange - Create a test user and navigate to profile setup step
      const testEmail = `test-profile-${Date.now()}@example.com`;
      
      // Start the onboarding flow with a magic link user
      await page.goto('/onboarding?step=profile');
      
      // Act - Fill in profile information
      await page.fill('[data-testid="profile-name-input"]', 'John Doe');
      
      // Upload an avatar image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('e2e/fixtures/test-avatar.png');
      
      // Wait for avatar preview to update
      await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible();
      
      // Click continue button
      await page.click('[data-testid="profile-continue-button"]');
      
      // Assert - Verify navigation to next step
      await expect(page).toHaveURL(/\/onboarding\?step=team/);
      
      // Verify profile data was saved
      await page.goto('/chat');
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText('John Doe');
    });
  });

  test.describe('OAuth Flow', () => {
    test('OAuth user sees pre-filled profile data from provider', async ({ page }) => {
      // This test requires OAuth mock setup - will be implemented with OAuth integration
      test.skip(true, 'OAuth integration pending - Task #11');
      
      // Arrange - Mock OAuth user with profile data
      const mockOAuthUser = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        picture: 'https://example.com/oauth-avatar.jpg'
      };
      
      // Navigate to profile setup as OAuth user
      await page.goto('/onboarding?step=profile');
      
      // Assert - Verify pre-filled data
      await expect(page.locator('[data-testid="profile-name-input"]')).toHaveValue('OAuth User');
      await expect(page.locator('[data-testid="avatar-preview"]')).toHaveAttribute('src', /oauth-avatar\.jpg/);
      
      // Act - User can modify pre-filled data
      await page.fill('[data-testid="profile-name-input"]', 'Modified OAuth Name');
      await page.click('[data-testid="profile-continue-button"]');
      
      // Assert - Verify modified data was saved
      await expect(page).toHaveURL(/\/onboarding\?step=team/);
    });
  });

  test.describe('Profile Fields', () => {
    test('User can add username and bio to profile', async ({ page }) => {
      // Navigate to profile setup
      await page.goto('/onboarding?step=profile');
      
      // Fill required name field
      await page.fill('[data-testid="profile-name-input"]', 'Test User');
      
      // Add username
      await page.fill('[data-testid="profile-username-input"]', 'testuser123');
      
      // Verify username availability check
      await expect(page.locator('[data-testid="username-available"]')).toBeVisible();
      
      // Add bio
      await page.fill('[data-testid="profile-bio-input"]', 'This is my test bio');
      
      // Submit profile
      await page.click('[data-testid="profile-continue-button"]');
      
      // Verify data was saved
      await expect(page).toHaveURL(/\/onboarding\?step=team/);
    });
  });
});