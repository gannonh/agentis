/**
 * Script to update all e2e test files to use unique identifiers
 * This script helps migrate from Date.now() based identifiers to the new testId system
 */

// Common patterns to replace
export const UPDATE_PATTERNS = [
  // Email generation patterns
  {
    pattern: /`test-\$\{Date\.now\(\)\}@([^`]+)`/g,
    replacement: (domain: string) => {
      if (domain === 'example.com') {
        return 'testContext.emails.primary';
      } else {
        return `testContext.emails.corporate!`;
      }
    }
  },
  {
    pattern: /`([^-]+)-\$\{Date\.now\(\)\}@([^`]+)`/g,
    replacement: (prefix: string, domain: string) => {
      return 'testContext.emails.primary';
    }
  },
  
  // Organization name patterns
  {
    pattern: /const orgName = '([^']+)'/g,
    replacement: (name: string) => {
      return 'const orgName = testContext.organization.name';
    }
  },
  
  // Test context creation patterns
  {
    pattern: /const (corporateEmail|testEmail|userEmail|[a-zA-Z]+Email) = `[^`]+`/g,
    needsContext: true,
    contextSetup: (varName: string, domain?: string) => {
      const contextOptions: any = {};
      
      if (varName.includes('corporate')) {
        contextOptions.corporateDomain = domain || 'testcorp.com';
      }
      if (varName.includes('first')) {
        contextOptions.emailPrefix = 'first';
      }
      if (varName.includes('second')) {
        contextOptions.emailPrefix = 'second';
      }
      if (varName.includes('user1')) {
        contextOptions.emailPrefix = 'user1';
      }
      if (varName.includes('user2')) {
        contextOptions.emailPrefix = 'user2';
      }
      
      return `const testContext = createTestContext(${JSON.stringify(contextOptions)});
      testIds.push(testContext.testId);
      const ${varName} = testContext.emails.${varName.includes('corporate') ? 'corporate!' : 'primary'};`;
    }
  }
];

// Test file update instructions
export const TEST_FILE_UPDATES = {
  'auth-ob.basic.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.creation.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.org-detection.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.profile-setup.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.join.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.join-invitations.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.invitation-acceptance.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.join-approval.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.join-edge-cases.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  },
  'auth-ob.team-invitation.spec.ts': {
    imports: ['cleanTestData', 'generateTestId', 'createTestContext'],
    setupTestIds: true,
    cleanupPattern: 'targeted'
  }
};