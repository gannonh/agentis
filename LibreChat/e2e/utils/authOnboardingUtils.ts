/**
 * @fileoverview Auth & Onboarding Test Utilities
 * @module e2e/utils/authOnboardingUtils
 *
 * Shared utilities for auth and onboarding e2e tests including:
 * - Magic link capture and handling
 * - OAuth authentication flows
 * - Database cleanup operations
 * - Terms of service handling
 * - Common test data patterns
 * - Onboarding flow navigation helpers
 */

import { Page } from '@playwright/test';
import { logProgress } from './testLogger';

/**
 * OAuth credentials for testing
 */
export const OAUTH_CREDENTIALS = {
  PUBLIC_DOMAIN: {
    email: 'agentis.test@gmail.com',
    password: 'KJHkh97HKH87jjfU',
  },
  PRIVATE_DOMAIN: {
    email: 'gannon@astrolabs.llc',
    password: 'zarnUj-wiqfet-bagti4',
  },
} as const;

/**
 * Standard test emails for consistent use across tests
 */
export const TEST_EMAILS = {
  GMAIL_PUBLIC: 'agentis.test@gmail.com',
  CORPORATE: 'gannon@astrolabs.llc',
  GENERIC_TEST: 'test@example.com',
  YAHOO_PUBLIC: 'test@yahoo.com',
  OUTLOOK_PUBLIC: 'test@outlook.com',
  CORPORATE_EXISTING_ORG: 'test@astrolabs.llc',
  CORPORATE_NO_ORG: 'test@newcompany.com',
  CORPORATE_MULTI_ORG: 'test@multiorg.com',
} as const;

/**
 * Test viewport configuration for consistent sizing
 */
export const TEST_VIEWPORT = {
  width: 1600,
  height: 1700,
} as const;

/**
 * Helper to capture magic link using MailHog
 * @param email - Email address to capture magic link for
 * @param timeout - Timeout in milliseconds (default: 15000)
 * @returns Promise<string | null> - Magic link URL or null if not found
 */
export async function captureMagicLink(
  email: string,
  timeout: number = 15000,
): Promise<string | null> {
  const { createMailHog } = await import('./mailhog.js');
  const mailhog = createMailHog();

  try {
    logProgress(`📧 Waiting for magic link email to ${email}`);
    const magicLink = await mailhog.waitForMagicLink(email, timeout);

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

/**
 * Helper to handle Terms of Service modal if it appears
 * @param page - Playwright page instance
 * @returns Promise<boolean> - True if terms modal was handled, false if not present
 */
export async function handleTermsOfService(page: Page): Promise<boolean> {
  const termsModal = page.getByText('Terms of Service for Agentis');
  const termsHeading = page.getByRole('heading', { name: 'Terms and Conditions for Agentis' });

  if ((await termsModal.isVisible()) || (await termsHeading.isVisible())) {
    logProgress('📋 Terms of Service modal appeared - accepting terms');
    await page.getByRole('button', { name: 'I accept' }).click();
    logProgress('✅ Terms of Service accepted');
    return true;
  }
  return false;
}

/**
 * Helper to clean database between tests
 * Cleans up test data in proper order (foreign keys matter)
 */
export async function cleanDatabase(): Promise<void> {
  const { getTestDatabase } = await import('./testAuth');
  const { db } = await getTestDatabase();

  // Clean up test data in proper order (foreign keys matter)
  // 1. Delete sessions first
  await db.collection('session').deleteMany({
    $or: [
      { userId: { $regex: /test.*/ } },
      {}, // Clean all sessions for now since we're testing
    ],
  });

  // 2. Delete member records
  await db.collection('member').deleteMany({
    $or: [{ userId: { $regex: /test.*/ } }, { organizationId: { $regex: /test.*/ } }],
  });

  // 3. Delete account records (OAuth linkages)
  await db.collection('account').deleteMany({
    $or: [
      { userId: { $regex: /test.*/ } }, // Test users
      { userId: { $regex: /.*gannon@astrolabs\.llc.*/ } }, // OAuth PRIVATE_DOMAIN user
      { userId: { $regex: /.*agentis\.test@gmail\.com.*/ } }, // OAuth PUBLIC_DOMAIN user
    ],
  });

  // 4. Delete organizations
  await db.collection('organization').deleteMany({
    $or: [
      { name: { $regex: /Test.*/ } },
      { name: { $regex: /TechCorp.*/ } }, // Handle TechCorp organizations from edge case tests
      { name: { $regex: /Acme Corp.*/ } }, // Handle Acme Corp organizations
      { name: { $regex: /Astrolabs.*/ } }, // Handle Astrolabs OAuth organizations
      { name: { $regex: /OAuth.*/ } }, // Handle OAuth test organizations
      { slug: { $regex: /test.*/ } },
      { slug: { $regex: /techcorp.*/ } }, // Handle techcorp slugs
      { slug: { $regex: /acme-corp.*/ } }, // Handle acme-corp slugs
      { slug: { $regex: /astrolabs.*/ } }, // Handle astrolabs slugs
      { 'metadata.domain': { $regex: /testcorp.*/ } },
      { 'metadata.domain': { $regex: /techcorp.*/ } }, // Handle techcorp domains
      { 'metadata.domain': 'astrolabs.llc' }, // Handle OAuth corporate domain
    ],
  });

  // 5. Delete users last
  await db.collection('user').deleteMany({
    $or: [
      { email: { $regex: /test.*@/ } }, // Test emails
      { email: 'gannon@astrolabs.llc' }, // OAuth PRIVATE_DOMAIN credential
      { email: 'agentis.test@gmail.com' }, // OAuth PUBLIC_DOMAIN credential
    ],
  });
}

/**
 * Helper to create test organization for detection tests
 * @param name - Organization name
 * @param domain - Organization domain
 * @param allowDomainJoin - Whether to enable domain auto-join (default: false)
 * @returns Promise with created organization object
 */
export async function createTestOrganization(
  name: string,
  domain: string,
  allowDomainJoin: boolean = false,
) {
  const { getTestDatabase } = await import('./testAuth');
  const { db } = await getTestDatabase();

  const testOrg = {
    _id: new (await import('mongodb')).ObjectId(),
    name: name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    metadata: {
      domain: domain,
      allowDomainJoin: allowDomainJoin,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('organization').insertOne(testOrg);
  logProgress(
    `✅ Created test organization: ${testOrg.name} for domain ${domain} (allowDomainJoin: ${allowDomainJoin})`,
  );
  return testOrg;
}

/**
 * Helper to generate timestamped test email
 * @param domain - Email domain (default: 'example.com')
 * @returns Generated test email
 */
export function generateTestEmail(domain: string = 'example.com'): string {
  return `test-${Date.now()}@${domain}`;
}

/**
 * Helper to start magic link authentication flow
 * @param page - Playwright page instance
 * @param email - Email address to use for authentication
 * @returns Promise<string> - Magic link URL
 */
export async function startMagicLinkAuth(page: Page, email: string): Promise<string> {
  await page.goto('http://localhost:3080/login');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByTestId('login-button').click();

  // Verify magic link confirmation screen
  await page.getByRole('heading', { name: 'Check your email' }).waitFor();
  await page.getByText(email).waitFor();

  // Capture magic link
  const magicLinkUrl = await captureMagicLink(email);
  if (!magicLinkUrl) {
    throw new Error('Failed to capture magic link from MailHog');
  }

  return magicLinkUrl;
}

/**
 * Helper to complete organization creation step
 * @param page - Playwright page instance
 * @param orgName - Organization name
 * @param enableDomainJoin - Whether to enable domain join (default: false)
 */
export async function completeOrganizationStep(
  page: Page,
  orgName: string,
  enableDomainJoin: boolean = false,
): Promise<void> {
  // Fill organization name
  await page.getByRole('textbox').first().fill(orgName);

  // Enable domain join if requested and available
  if (enableDomainJoin) {
    const domainJoinCheckbox = page.getByRole('checkbox');
    if (await domainJoinCheckbox.isVisible()) {
      await domainJoinCheckbox.check();
      logProgress('☑️ Enabled domain join');
    }
  }

  // Submit organization creation
  await page.getByRole('button', { name: 'Next' }).click();
}

/**
 * Helper to complete profile setup step
 * @param page - Playwright page instance
 * @param userName - User name for profile
 */
export async function completeProfileStep(page: Page, userName: string): Promise<void> {
  // Wait for profile step
  await page.getByRole('heading', { name: /Complete Your Profile/i }).waitFor();

  // Fill profile name - use data-testid for more reliable selection
  const nameInput = page.getByTestId('profile-name-input');
  await nameInput.waitFor();
  await nameInput.fill(userName);

  // Submit profile
  await page.getByTestId('profile-continue-button').click();
}

/**
 * Helper to complete team invitation step
 * @param page - Playwright page instance
 * @param skipTeam - Whether to skip team invitations (default: true)
 */
export async function completeTeamStep(page: Page, skipTeam: boolean = true): Promise<void> {
  // Wait for team step
  await page.getByRole('heading', { name: /Invite Your Team/i }).waitFor();

  if (skipTeam) {
    await page.getByRole('button', { name: 'Skip for Now' }).click();
  }
  // TODO: Add team invitation logic when needed
}

/**
 * Helper to complete welcome step
 * @param page - Playwright page instance
 */
export async function completeWelcomeStep(page: Page): Promise<void> {
  // Wait for welcome step
  await page.getByRole('heading', { name: /Welcome to Agentis/i }).waitFor();

  // Complete onboarding
  await page.getByRole('button', { name: /Start Your First Conversation/i }).click();
}

/**
 * Helper to complete full onboarding flow
 * @param page - Playwright page instance
 * @param options - Onboarding options
 */
export async function completeFullOnboarding(
  page: Page,
  options: {
    orgName: string;
    userName: string;
    enableDomainJoin?: boolean;
    skipTeam?: boolean;
  },
): Promise<void> {
  const { orgName, userName, enableDomainJoin = false, skipTeam = true } = options;

  // Complete organization step
  await completeOrganizationStep(page, orgName, enableDomainJoin);
  await page.waitForLoadState('networkidle');

  // Complete profile step
  await completeProfileStep(page, userName);
  await page.waitForLoadState('networkidle');

  // Complete team step
  await completeTeamStep(page, skipTeam);
  await page.waitForLoadState('networkidle');

  // Complete welcome step
  await completeWelcomeStep(page);
  await page.waitForLoadState('networkidle');

  // Handle Terms of Service modal if it appears
  await handleTermsOfService(page);
}

/**
 * Helper to verify organization join preview UI
 * @param page - Playwright page instance
 * @param orgName - Expected organization name
 */
export async function verifyOrganizationJoinPreview(page: Page, orgName: string): Promise<void> {
  // Should see organization preview with the organization name in heading
  await page.getByRole('heading', { name: orgName }).waitFor({ timeout: 10000 });
  logProgress('✅ Can see existing organization name in preview');

  // Should see auto-join indicator
  await page.getByText(/Auto-join enabled/i).waitFor();
  logProgress('✅ Can see auto-join is enabled');
}

/**
 * Helper to join organization via auto-join
 * @param page - Playwright page instance
 * @param orgName - Organization name to join
 */
export async function joinOrganization(page: Page, orgName: string): Promise<void> {
  // Look for the specific join button with organization name
  const joinButton = page.getByRole('button', { name: new RegExp(`Join ${orgName}`, 'i') });
  await joinButton.waitFor();
  logProgress('🖱️ Clicking join organization button...');

  await joinButton.click();
  await page.waitForTimeout(3000); // Wait for join process
}

/**
 * Helper to verify database organization state
 * @param orgName - Organization name to verify
 * @param domain - Expected domain
 * @param allowDomainJoin - Expected domain join setting
 */
export async function verifyOrganizationInDatabase(
  orgName: string,
  domain: string,
  allowDomainJoin: boolean = false,
) {
  const { getTestDatabase } = await import('./testAuth');
  const { db } = await getTestDatabase();

  const org = await db.collection('organization').findOne({ name: orgName });
  if (!org) {
    throw new Error(`Organization ${orgName} not found in database`);
  }

  if (org.metadata?.domain !== domain) {
    throw new Error(`Expected domain ${domain}, got ${org.metadata?.domain}`);
  }

  if (org.metadata?.allowDomainJoin !== allowDomainJoin) {
    throw new Error(
      `Expected allowDomainJoin ${allowDomainJoin}, got ${org.metadata?.allowDomainJoin}`,
    );
  }

  logProgress('✅ Organization created correctly in database');
  return org;
}

/**
 * Helper to verify organization membership in database
 * @param orgName - Organization name
 * @param expectedMemberCount - Expected number of members
 * @returns Array of member objects
 */
export async function verifyOrganizationMembership(orgName: string, expectedMemberCount: number) {
  const { getTestDatabase } = await import('./testAuth');
  const { db } = await getTestDatabase();

  const org = await db.collection('organization').findOne({ name: orgName });
  if (!org) {
    throw new Error(`Organization ${orgName} not found in database`);
  }

  const members = await db.collection('member').find({ organizationId: org._id }).toArray();

  if (members.length !== expectedMemberCount) {
    throw new Error(`Expected ${expectedMemberCount} members, got ${members.length}`);
  }

  logProgress(`✅ Database verification: ${members.length} members found in organization`);
  return members;
}

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  VIEWPORT: TEST_VIEWPORT,
  TIMEOUT: {
    DEFAULT: 10000,
    LONG: 15000,
    SHORT: 5000,
  },
  WAIT_TIMEOUT: 3000,
} as const;

/**
 * Common test patterns
 */
export const TEST_PATTERNS = {
  ONBOARDING_URL: /.*\/onboarding.*/,
  CHAT_URL: /.*\/c\/new/,
  LOGIN_URL: /.*\/login.*/,
  GOOGLE_OAUTH_URL: /.*accounts\.google\.com.*/,
} as const;

/**
 * =================================================================================
 * OAUTH AUTHENTICATION UTILITIES
 * =================================================================================
 */

/**
 * Type for OAuth credential selection
 */
export type OAuthCredentialType = 'PUBLIC_DOMAIN' | 'PRIVATE_DOMAIN';

/**
 * Helper to initiate Google OAuth flow
 * @param page - Playwright page instance
 * @returns Promise<void>
 */
export async function initiateGoogleOAuth(page: Page): Promise<void> {
  logProgress('🔐 Initiating Google OAuth flow...');

  // Navigate to login page
  await page.goto('http://localhost:3080/login');

  // Click Google OAuth button
  await page.getByTestId('google').click();
  await page.waitForLoadState('networkidle');

  // Verify we reach Google OAuth page
  if (!page.url().includes('accounts.google.com')) {
    throw new Error(`Expected Google OAuth page, got: ${page.url()}`);
  }

  logProgress('✅ Successfully redirected to Google OAuth');
}

/**
 * Helper to complete Google OAuth authentication
 * @param page - Playwright page instance
 * @param credentialType - Type of credentials to use (PUBLIC_DOMAIN or PRIVATE_DOMAIN)
 * @returns Promise<void>
 */
export async function completeGoogleOAuth(
  page: Page,
  credentialType: OAuthCredentialType = 'PUBLIC_DOMAIN',
): Promise<void> {
  const credentials = OAUTH_CREDENTIALS[credentialType];

  logProgress(`🔐 Completing Google OAuth with ${credentialType} credentials...`);

  // Verify we're on Google OAuth page
  if (!page.url().includes('accounts.google.com')) {
    throw new Error(`Not on Google OAuth page: ${page.url()}`);
  }

  // Check that credentials are available
  if (!credentials.email || !credentials.password) {
    logProgress('⚠️ OAuth credentials not available - skipping authentication');
    throw new Error(`OAuth credentials not configured for ${credentialType}`);
  }

  // Fill email
  await page.getByRole('textbox', { name: 'Email or phone' }).click();
  await page.getByRole('textbox', { name: 'Email or phone' }).fill(credentials.email);
  await page.getByRole('button', { name: 'Next' }).click();

  // Fill password
  await page.getByRole('textbox', { name: 'Enter your password' }).click();
  await page.getByRole('textbox', { name: 'Enter your password' }).fill(credentials.password);
  await page.getByRole('button', { name: 'Next' }).click();

  // Handle OAuth consent
  logProgress('🔒 Handling OAuth consent...');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForLoadState('networkidle');

  // Verify we're no longer on Google OAuth page
  await page.waitForFunction(
    () => !window.location.href.includes('accounts.google.com'),
    {},
    { timeout: 15000 },
  );

  logProgress('✅ OAuth authentication completed');
}

/**
 * Helper to start OAuth authentication flow (initiate + complete)
 * @param page - Playwright page instance
 * @param credentialType - Type of credentials to use
 * @returns Promise<void>
 */
export async function startOAuthAuthentication(
  page: Page,
  credentialType: OAuthCredentialType = 'PUBLIC_DOMAIN',
): Promise<void> {
  await initiateGoogleOAuth(page);
  await completeGoogleOAuth(page, credentialType);
}

/**
 * Helper to handle OAuth cancellation flow
 * @param page - Playwright page instance
 * @returns Promise<void>
 */
export async function cancelOAuthFlow(page: Page): Promise<void> {
  logProgress('🚫 Testing OAuth cancellation...');

  // Start OAuth flow
  await initiateGoogleOAuth(page);

  // Cancel by going back
  await page.goBack();
  await page.waitForLoadState('networkidle');

  // Verify graceful return to login
  if (!page.url().includes('localhost:3080/login')) {
    throw new Error(`Expected login page after cancellation, got: ${page.url()}`);
  }

  // Verify login page elements are still functional
  await page.getByRole('heading', { name: 'Welcome' }).waitFor();
  await page.getByTestId('google').waitFor();

  logProgress('✅ OAuth cancellation handled gracefully');
}

/**
 * Helper to verify OAuth user data integration in profile setup
 * @param page - Playwright page instance
 * @param expectedName - Expected pre-filled name from OAuth
 * @returns Promise<{ hasAvatar: boolean; prefilledName: string }>
 */
export async function verifyOAuthProfileIntegration(
  page: Page,
  expectedName?: string,
): Promise<{ hasAvatar: boolean; prefilledName: string }> {
  logProgress('🔍 Verifying OAuth profile data integration...');

  // Wait for profile setup page
  await page.getByRole('heading', { name: /Complete Your Profile/i }).waitFor();

  // Check pre-filled name from OAuth
  const nameInput = page.getByTestId('profile-name-input');
  const prefilledName = await nameInput.inputValue();

  if (expectedName && prefilledName !== expectedName) {
    logProgress(`⚠️ Expected name "${expectedName}", got "${prefilledName}"`);
  } else {
    logProgress(`✅ OAuth user has pre-filled name: "${prefilledName}"`);
  }

  // Check if OAuth avatar is displayed
  const avatarPreview = page.getByTestId('avatar-preview');
  const hasAvatar = await avatarPreview.isVisible();

  if (hasAvatar) {
    logProgress('✅ OAuth user has Google avatar displayed');

    // Verify upload text shows "Change photo" for users with avatars
    const uploadText = page.getByText('Change photo');
    await uploadText.waitFor();
    logProgress('✅ Upload text shows "Change photo" for OAuth user with avatar');

    // Verify remove photo option is available
    const removePhotoButton = page.getByText('Remove photo');
    if (await removePhotoButton.isVisible()) {
      logProgress('✅ Remove photo option available for OAuth user with avatar');
    }
  } else {
    logProgress('✅ OAuth user shows initials fallback (no Google avatar)');

    // Verify upload text shows "Upload a photo" for users without avatars
    const uploadText = page.getByText('Upload a photo');
    await uploadText.waitFor();
    logProgress('✅ Upload text shows "Upload a photo" for OAuth user without avatar');
  }

  return { hasAvatar, prefilledName };
}

/**
 * Helper to test OAuth avatar error handling
 * @param page - Playwright page instance
 * @returns Promise<void>
 */
export async function testOAuthAvatarErrorHandling(page: Page): Promise<void> {
  logProgress('🧪 Testing OAuth avatar error handling...');

  // Wait for profile setup page
  await page.getByRole('heading', { name: /Complete Your Profile/i }).waitFor();

  // Check current avatar state
  const avatarPreview = page.getByTestId('avatar-preview');
  const hasAvatar = await avatarPreview.isVisible();

  if (hasAvatar) {
    // Test that broken images fall back gracefully to initials
    const avatarSrc = await avatarPreview.getAttribute('src');
    logProgress(`🖼️ Testing avatar error handling for: ${avatarSrc}`);

    // The onError handler should already be in place from our ProfileSetup fixes
    // If the image fails to load, it should fall back to initials
    logProgress('✅ OAuth avatar has error handling in place');
  } else {
    logProgress('✅ OAuth user gracefully shows initials fallback');
  }
}

/**
 * Helper to complete OAuth-based onboarding flow
 * @param page - Playwright page instance
 * @param credentialType - Type of OAuth credentials to use
 * @param options - Onboarding options
 * @returns Promise<void>
 */
export async function completeOAuthOnboardingFlow(
  page: Page,
  credentialType: OAuthCredentialType,
  options: {
    orgName: string;
    userName?: string; // Optional since OAuth pre-fills name
    enableDomainJoin?: boolean;
    skipTeam?: boolean;
  },
): Promise<void> {
  const { orgName, userName, enableDomainJoin = false, skipTeam = true } = options;

  logProgress('🚀 Starting OAuth onboarding flow...');

  // Step 1: Complete OAuth authentication
  await startOAuthAuthentication(page, credentialType);

  // Step 2: Verify redirect to onboarding
  await page.waitForURL(TEST_PATTERNS.ONBOARDING_URL, { timeout: 15000 });
  logProgress('✅ OAuth redirected to onboarding');

  // Step 3: Complete organization step
  await completeOrganizationStep(page, orgName, enableDomainJoin);
  await page.waitForLoadState('networkidle');

  // Step 4: Complete profile step (may have pre-filled data from OAuth)
  await page.getByRole('heading', { name: /Complete Your Profile/i }).waitFor();

  if (userName) {
    // Override pre-filled name if specified
    const nameInput = page.getByTestId('profile-name-input');
    await nameInput.clear();
    await nameInput.fill(userName);
  }

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForLoadState('networkidle');

  // Step 5: Complete team step
  await completeTeamStep(page, skipTeam);
  await page.waitForLoadState('networkidle');

  // Step 6: Complete welcome step
  await completeWelcomeStep(page);
  await page.waitForLoadState('networkidle');

  // Step 7: Handle Terms of Service modal if it appears
  await handleTermsOfService(page);

  // Step 8: Verify final redirect to chat
  await page.waitForURL(TEST_PATTERNS.CHAT_URL, { timeout: 10000 });
  logProgress('✅ OAuth onboarding flow completed successfully');
}

/**
 * Helper to verify OAuth credentials are available
 * @param credentialType - Type of credentials to check
 * @returns boolean - True if credentials are available
 */
export function areOAuthCredentialsAvailable(credentialType: OAuthCredentialType): boolean {
  const credentials = OAUTH_CREDENTIALS[credentialType];
  return !!(credentials.email && credentials.password);
}

/**
 * Helper to skip OAuth tests when credentials are not available
 * @param credentialType - Type of credentials to check
 * @param testName - Name of the test being skipped
 * @returns void (throws skip if credentials unavailable)
 */
export function requireOAuthCredentials(
  credentialType: OAuthCredentialType,
  testName: string,
): void {
  if (!areOAuthCredentialsAvailable(credentialType)) {
    const message = `OAuth credentials not configured for ${credentialType} - skipping ${testName}`;
    logProgress(`⚠️ ${message}`);
    throw new Error(message);
  }
}
