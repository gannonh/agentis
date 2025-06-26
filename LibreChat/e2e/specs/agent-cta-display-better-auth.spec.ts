/**
 * @fileoverview E2E test for agent CTA display using Better Auth Kit
 * @module e2e/specs/agent-cta-display-better-auth
 */

import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser, cleanupAuthenticatedUser, navigateToSection } from '../utils/authSetup.js';
import { validateTestAuth } from '../utils/testAuth.js';

test.describe('Agent CTA Display - Better Auth Kit', () => {
  test.beforeAll(async () => {
    // Validate that Better Auth Kit is working before running tests
    const isValid = await validateTestAuth();
    if (!isValid) {
      throw new Error('Better Auth Kit test validation failed - cannot run tests');
    }
  });

  test('should display agent CTA for authenticated user', async ({ page, context }) => {
    // Setup authenticated user with organization
    const testContext = await setupAuthenticatedUser(page, context);
    
    try {
      // Navigate to agents section
      await navigateToSection.agents(page);
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      // Look for agent CTA elements
      const ctaButton = page.locator('[data-testid="create-agent-cta"], .create-agent-button, text="Create Agent"').first();
      
      // Verify CTA is visible
      await expect(ctaButton).toBeVisible({ timeout: 10000 });
      
      // Additional verification - check for agent-related UI elements
      const agentContainer = page.locator('[data-testid="agents-container"], .agents-page, .agent-list').first();
      await expect(agentContainer).toBeVisible({ timeout: 5000 });
      
      console.log(`✅ Agent CTA test passed for user: ${testContext.auth.user.email}`);
    } finally {
      // Clean up test data
      await cleanupAuthenticatedUser(testContext);
    }
  });

  test('should allow navigation to agent creation from CTA', async ({ page, context }) => {
    // Setup authenticated user with organization
    const testContext = await setupAuthenticatedUser(page, context);
    
    try {
      // Navigate to agents section
      await navigateToSection.agents(page);
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      // Click the create agent CTA
      const ctaButton = page.locator('[data-testid="create-agent-cta"], .create-agent-button, text="Create Agent"').first();
      await ctaButton.click();
      
      // Wait for navigation or modal to appear
      await page.waitForLoadState('networkidle');
      
      // Verify we're in agent creation flow
      // This could be a modal, new page, or inline form
      const creationForm = page.locator('[data-testid="agent-creation-form"], .agent-form, [placeholder*="agent name"], [placeholder*="Agent name"]').first();
      
      await expect(creationForm).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Agent creation navigation test passed for user: ${testContext.auth.user.email}`);
    } finally {
      // Clean up test data
      await cleanupAuthenticatedUser(testContext);
    }
  });

  test('should display organization context in agent CTA', async ({ page, context }) => {
    // Setup authenticated user with organization
    const testContext = await setupAuthenticatedUser(page, context);
    
    try {
      // Navigate to agents section
      await navigateToSection.agents(page);
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      // Check if organization name appears in the UI context
      const orgName = testContext.auth.organization.name;
      const orgElement = page.locator(`text=${orgName}`).first();
      
      // Organization name should be visible somewhere in the UI
      await expect(orgElement).toBeVisible({ timeout: 10000 });
      
      console.log(`✅ Organization context test passed for org: ${orgName}`);
    } finally {
      // Clean up test data
      await cleanupAuthenticatedUser(testContext);
    }
  });
});