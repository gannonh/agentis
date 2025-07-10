import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import {
  TEST_EMAILS,
  TEST_VIEWPORT,
  captureMagicLink,
  cleanDatabase,
  generateTestEmail,
  createTestOrganization,
  TEST_PATTERNS,
} from '../../utils/authOnboardingUtils';

test.use({
  viewport: TEST_VIEWPORT,
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Organization Detection Tests - Issue #102', () => {
  // Test data for consistent use across tests
  const TEST_EMAILS = {
    GMAIL_PUBLIC: 'test-user@gmail.com',
    CORPORATE_EXISTING_ORG: 'test@astrolabs.llc', // Domain with existing org
    CORPORATE_NO_ORG: 'test@newcompany.com', // Domain without existing org
    CORPORATE_MULTI_ORG: 'test@multiorg.com', // Domain with multiple orgs
  };

  // Helper to capture magic link using MailHog
  async function captureMagicLink(email: string): Promise<string | null> {
    const { createMailHog } = await import('../../utils/mailhog.js');
    const mailhog = createMailHog();

    try {
      logProgress(`📧 Waiting for magic link email to ${email}`);
      const magicLink = await mailhog.waitForMagicLink(email, 15000);

      if (magicLink) {
        logProgress(`✅ Found magic link: ${magicLink}`);
        return magicLink;
      } else {
        logProgress(`❌ No magic link found for ${email}`);
        return null;
      }
    } catch (error) {
      logProgress(`❌ Error getting magic link from MailHog: ${error}`);
      return null;
    }
  }

  // Helper to clean database between tests
  async function cleanDatabase() {
    const { getTestDatabase } = await import('../../utils/testAuth');
    const { db } = await getTestDatabase();

    // Clean up test data in proper order
    await db.collection('session').deleteMany({
      $or: [{ userId: { $regex: /test.*/ } }, {}],
    });
    await db.collection('member').deleteMany({
      $or: [{ userId: { $regex: /test.*/ } }, { organizationId: { $regex: /test.*/ } }],
    });
    await db.collection('account').deleteMany({
      userId: { $regex: /test.*/ },
    });
    await db.collection('organization').deleteMany({
      $or: [{ name: { $regex: /Test.*/ } }, { slug: { $regex: /test.*/ } }],
    });
    await db.collection('user').deleteMany({
      email: { $regex: /test.*@/ },
    });
  }

  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test.afterEach(async () => {
    await cleanDatabase();
  });

  /**
   * =================================================================================
   * ORGANIZATION DETECTION TESTS - ISSUE #102 SCOPE
   * =================================================================================
   * These tests focus on detection logic only - determining what UI to show.
   * Actual create/join actions are handled in issues #103/#104.
   * Invitation creation/management is handled in issue #106.
   */

  // Helper to create test organization for detection tests
  async function createTestOrganization(name: string, domain: string) {
    const { getTestDatabase } = await import('../../utils/testAuth');
    const { db } = await getTestDatabase();

    const testOrg = {
      _id: new (await import('mongodb')).ObjectId(),
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      metadata: { domain: domain },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('organization').insertOne(testOrg);
    logProgress(`✅ Created test organization: ${testOrg.name} for domain ${domain}`);
    return testOrg;
  }

  test('Corporate domain without existing organization shows create UI', async ({ browser }) => {
    logProgress('🚀 Testing corporate domain detection without existing organization...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Use corporate domain with no existing organization
      const corporateEmail = `test-${Date.now()}@newcompany.com`;
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(corporateEmail);
      await page.getByTestId('login-button').click();

      // Step 2: Follow magic link
      const magicLinkUrl = await captureMagicLink(corporateEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Step 3: Verify we reach onboarding (MUST happen)
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      logProgress('✅ Successfully redirected to onboarding');

      // Step 4: Verify organization creation UI is shown
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify domain auto-join option is available for corporate domain
      await expect(page.getByText(/let anyone with an @newcompany.com email join/i)).toBeVisible();
      logProgress('✅ Domain auto-join option shown for corporate domain');

      logProgress('✅ Journey 8 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });

  test('Public domain detection accuracy', async ({ browser }) => {
    logProgress('🚀 Testing public domain detection accuracy...');

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Test with Gmail (should be detected as public)
      const gmailEmail = `test-${Date.now()}@gmail.com`;
      await page.goto('http://localhost:3080/login');
      await page.getByRole('textbox', { name: 'Email address' }).fill(gmailEmail);
      await page.getByTestId('login-button').click();

      // Step 2: Follow magic link
      const magicLinkUrl = await captureMagicLink(gmailEmail);
      if (!magicLinkUrl) {
        throw new Error('Failed to capture magic link');
      }

      await page.goto(magicLinkUrl);
      await page.waitForLoadState('networkidle');

      // Step 3: Verify we reach onboarding (MUST happen)
      await expect(page).toHaveURL(/.*\/onboarding.*/, { timeout: 10000 });
      logProgress('✅ Successfully redirected to onboarding');

      // Step 4: Verify organization creation form is shown for public domain
      await expect(page.getByRole('heading', { name: /What's the name of your/ })).toBeVisible({
        timeout: 10000,
      });
      logProgress('✅ Organization creation heading displayed');

      // Step 5: Verify the organization name input field
      await expect(page.getByRole('textbox').first()).toBeVisible();
      logProgress('✅ Organization name input field displayed');

      // Step 6: Verify NO domain join option for public domains
      await expect(page.getByText(/let anyone with an @gmail.com email join/i)).not.toBeVisible();
      logProgress('✅ Public domain correctly detected - no domain join option shown');

      logProgress('✅ Journey 13 completed - all assertions passed');
    } finally {
      await context.close();
    }
  });
});
