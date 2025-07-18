/**
 * @fileoverview Test Identifier Generation Utilities
 * @module e2e/utils/testIdentifiers
 *
 * Generates unique identifiers for tests to prevent data cross-contamination
 * when running tests in parallel with multiple workers.
 */

import { randomBytes } from 'crypto';

/**
 * Generates a unique test identifier using timestamp and random string
 * Format: timestamp-randomString (e.g., "1750952561531-t34lmtp")
 */
export function generateTestId(): string {
  const timestamp = Date.now();
  const random = randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Generates a unique test email address
 * @param prefix - Optional prefix for the email (default: 'test')
 * @param testId - Optional test ID (will generate one if not provided)
 * @returns Unique email address
 */
export function generateTestEmail(prefix: string = 'test', testId?: string): string {
  const id = testId || generateTestId();
  return `${prefix}-${id}@example.com`;
}

/**
 * Generates a unique corporate test email address with unique domain
 * @param baseDomain - Base corporate domain (e.g., 'testcorp.com')
 * @param testId - Optional test ID (will generate one if not provided)
 * @returns Unique corporate email address with unique domain
 */
export function generateCorporateEmail(baseDomain: string, testId?: string): string {
  const id = testId || generateTestId();
  // Make the domain unique by adding the test ID
  const [name, extension] = baseDomain.split('.');
  const uniqueDomain = `${name}-${id}.${extension}`;
  return `test-${id}@${uniqueDomain}`;
}

/**
 * Generates a unique organization name
 * @param base - Base name for the organization
 * @param testId - Optional test ID (will generate one if not provided)
 * @returns Unique organization name
 */
export function generateOrgName(base: string, testId?: string): string {
  const id = testId || generateTestId();
  return `${base} ${id}`;
}

/**
 * Generates a unique organization slug
 * @param base - Base slug for the organization
 * @param testId - Optional test ID (will generate one if not provided)
 * @returns Unique organization slug
 */
export function generateOrgSlug(base: string, testId?: string): string {
  const id = testId || generateTestId();
  return `${base}-${id}`.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Test context containing all unique identifiers for a test run
 */
export interface TestContext {
  testId: string;
  emails: {
    primary: string;
    secondary?: string;
    corporate?: string;
  };
  organization: {
    name: string;
    slug: string;
  };
}

/**
 * Creates a complete test context with all necessary unique identifiers
 * @param options - Configuration options for the test context
 * @returns TestContext with all unique identifiers
 */
export function createTestContext(options?: {
  emailPrefix?: string;
  orgBase?: string;
  corporateDomain?: string;
  includeSecondary?: boolean;
}): TestContext {
  const testId = generateTestId();
  const { 
    emailPrefix = 'test', 
    orgBase = 'Test Org',
    corporateDomain,
    includeSecondary = false
  } = options || {};

  const context: TestContext = {
    testId,
    emails: {
      primary: generateTestEmail(emailPrefix, testId),
    },
    organization: {
      name: generateOrgName(orgBase, testId),
      slug: generateOrgSlug(orgBase, testId),
    },
  };

  if (includeSecondary) {
    context.emails.secondary = generateTestEmail(`${emailPrefix}-secondary`, testId);
  }

  if (corporateDomain) {
    context.emails.corporate = generateCorporateEmail(corporateDomain, testId);
  }

  return context;
}

/**
 * Cleanup configuration for test data
 */
export interface CleanupConfig {
  testId: string;
  additionalEmails?: string[];
  additionalOrgNames?: string[];
  additionalOrgSlugs?: string[];
}

/**
 * Creates cleanup patterns specific to a test run
 * @param config - Cleanup configuration
 * @returns MongoDB query patterns for cleanup
 */
export function createCleanupPatterns(config: CleanupConfig) {
  const { testId, additionalEmails = [], additionalOrgNames = [], additionalOrgSlugs = [] } = config;
  
  return {
    users: {
      $or: [
        { email: { $regex: new RegExp(`.*-${testId}@.*`) } },
        ...additionalEmails.map(email => ({ email })),
      ],
    },
    organizations: {
      $or: [
        { name: { $regex: new RegExp(`.*${testId}.*`) } },
        { slug: { $regex: new RegExp(`.*${testId}.*`) } },
        ...additionalOrgNames.map(name => ({ name })),
        ...additionalOrgSlugs.map(slug => ({ slug })),
      ],
    },
    sessions: {
      // Clean sessions for users with testId in their email
      userId: { $regex: new RegExp(`.*-${testId}.*`) },
    },
    members: {
      $or: [
        { userId: { $regex: new RegExp(`.*-${testId}.*`) } },
        { organizationId: { $regex: new RegExp(`.*${testId}.*`) } },
      ],
    },
  };
}