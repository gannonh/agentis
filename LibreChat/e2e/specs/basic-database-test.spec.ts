/**
 * @fileoverview Basic test to verify database connection and simple auth
 */

import { test, expect } from '@playwright/test';
import { createTestUserWithOrganization, cleanupTestUser, generateTestId, validateTestAuth } from '../utils/testAuth.js';

test.describe('Basic Database Test', () => {
  test.beforeAll(async () => {
    const isValid = await validateTestAuth();
    if (!isValid) {
      throw new Error('Database validation failed - cannot run tests');
    }
  });

  test('should create user in database and navigate to app', async ({ page, context }) => {
    const testId = generateTestId();
    
    try {
      // Create test user and organization in database
      const testAuth = await createTestUserWithOrganization(testId);
      console.log(`✅ Created test user: ${testAuth.user.email}`);
      console.log(`✅ Created test org: ${testAuth.organization.name}`);
      console.log(`✅ Created session: ${testAuth.session.sessionToken}`);
      
      // Set the session cookie manually
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: testAuth.session.sessionToken,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
        },
      ]);
      
      // Navigate to the app
      await page.goto('http://localhost:3080/');
      
      // Wait for basic DOM load (not networkidle which hangs)
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Give it a moment for any immediate redirects
      await page.waitForTimeout(2000);
      
      // Get current URL and title for verification
      const url = page.url();
      const title = await page.title();
      
      console.log(`✅ Page loaded - URL: ${url}, Title: "${title}"`);
      
      // Check if the page loads at all (this is the main success criteria)
      expect(title).toBeTruthy(); // Should have some title
      expect(url).toContain('localhost:3080'); // Should be on our test server
      
      // Check if we successfully bypassed onboarding and reached the main app
      if (url.includes('/register')) {
        console.log(`❌ User is still in onboarding - authentication setup failed`);
        console.log(`URL: ${url}`);
        
        // Log page content for debugging
        try {
          const bodyText = await page.locator('body').textContent({ timeout: 5000 });
          console.log(`Page content:`, bodyText.substring(0, 200) + '...');
        } catch (e) {
          console.log(`Could not get page content: ${e}`);
        }
        
        throw new Error('Expected to bypass onboarding but user is still in registration flow');
      } else if (url.includes('/c/')) {
        console.log(`✅ SUCCESS: User bypassed onboarding and reached main app at ${url}`);
        console.log(`✅ Authentication test successful - complete onboarding bypass achieved`);
      } else {
        console.log(`⚠️ User reached unexpected page: ${url}`);
      }
      
      // Clean up
      await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
      console.log(`✅ Database test completed successfully`);
      
    } catch (error) {
      console.error(`❌ Test failed:`, error);
      throw error;
    }
  });
});