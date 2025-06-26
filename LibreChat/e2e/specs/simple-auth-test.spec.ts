/**
 * @fileoverview Simple test to verify authentication setup works
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser, cleanupAuthenticatedUser } from '../utils/authSetup.js';
import { validateTestAuth } from '../utils/testAuth.js';

test.describe('Simple Auth Test', () => {
  test.beforeAll(async () => {
    const isValid = await validateTestAuth();
    if (!isValid) {
      throw new Error('Database validation failed - cannot run tests');
    }
  });

  test('should create authenticated user and reach homepage', async ({ page, context }) => {
    // Setup authenticated user with organization
    const testContext = await setupAuthenticatedUser(page, context);
    
    try {
      // Check that we're on some page (don't worry about specific content yet)
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // Get the page title or URL to verify we loaded something
      const title = await page.title();
      const url = page.url();
      
      console.log(`✅ Page loaded - Title: "${title}", URL: ${url}`);
      
      // Basic verification that we're authenticated (page should not redirect to login)
      expect(url).not.toContain('/login');
      expect(url).not.toContain('/auth');
      
      console.log(`✅ Simple authentication test passed for user: ${testContext.auth.user.email}`);
    } finally {
      // Clean up test data
      await cleanupAuthenticatedUser(testContext);
    }
  });
});