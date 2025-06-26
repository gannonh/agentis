/**
 * @fileoverview Playwright authentication setup utilities
 * @module e2e/utils/authSetup
 */

import type { Page, BrowserContext } from '@playwright/test';
import { createTestUserWithOrganization, cleanupTestUser, generateTestId, type TestAuthResult } from './testAuth.js';

export interface AuthenticatedTestContext {
  testId: string;
  auth: TestAuthResult;
  page: Page;
  context: BrowserContext;
}

/**
 * Set up authenticated user context for Playwright tests
 * Creates user, organization, and session, then applies authentication to browser context
 */
export async function setupAuthenticatedUser(
  page: Page,
  context: BrowserContext,
  customTestId?: string
): Promise<AuthenticatedTestContext> {
  const testId = customTestId || generateTestId();
  
  try {
    // Create test user with organization using Better Auth Kit
    const auth = await createTestUserWithOrganization(testId);
    
    // Set authentication cookie in browser context
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: auth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(auth.session.expiresAt.getTime() / 1000),
      },
    ]);
    
    // Navigate to the app to establish session
    await page.goto('/');
    
    // Wait for authentication to be recognized
    await page.waitForLoadState('networkidle');
    
    // Verify we're authenticated by checking for user-specific elements
    try {
      // Look for elements that only appear when authenticated
      await page.waitForSelector('[data-testid="user-menu"], [data-testid="chat-interface"], .chat-container', {
        timeout: 10000,
      });
    } catch (authError) {
      throw new Error(`Authentication verification failed: ${authError instanceof Error ? authError.message : String(authError)}`);
    }
    
    return {
      testId,
      auth,
      page,
      context,
    };
  } catch (error) {
    throw new Error(`Failed to setup authenticated user: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clean up authenticated test context
 * Removes user, organization, and clears browser context
 */
export async function cleanupAuthenticatedUser(testContext: AuthenticatedTestContext): Promise<void> {
  try {
    // Clear browser context
    await testContext.context.clearCookies();
    
    // Clean up test data
    await cleanupTestUser(testContext.auth.user.id, testContext.auth.organization.id);
  } catch (error) {
    console.warn(`Cleanup warning for test ${testContext.testId}:`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Wait for organization setup to complete
 * Some tests may need to wait for organization-specific UI elements
 */
export async function waitForOrganizationSetup(page: Page, organizationName: string): Promise<void> {
  try {
    // Wait for organization name to appear in the UI
    await page.waitForSelector(`text=${organizationName}`, { timeout: 15000 });
  } catch (error) {
    console.warn(`Organization setup verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Navigate to specific app sections after authentication
 */
export const navigateToSection = {
  async agents(page: Page): Promise<void> {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
  },
  
  async prompts(page: Page): Promise<void> {
    await page.goto('/prompts');
    await page.waitForLoadState('networkidle');
  },
  
  async chat(page: Page): Promise<void> {
    await page.goto('/c/new');
    await page.waitForLoadState('networkidle');
  },
  
  async settings(page: Page): Promise<void> {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  },
};