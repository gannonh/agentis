# E2E Test Migration Guide: Using Unique Test Identifiers

## Overview

To enable parallel test execution with multiple workers, all e2e tests in the auth-ob directory have been updated to use unique test identifiers instead of Date.now() based identifiers. This prevents data cross-contamination when tests run concurrently.

## New Utilities

### 1. Test Identifier Generation (`testIdentifiers.ts`)

```typescript
import { 
  generateTestId,
  createTestContext,
  cleanTestData 
} from '../../utils/authOnboardingUtils';
```

### 2. Test Context Creation

The `createTestContext()` function generates all unique identifiers for a test:

```typescript
const testContext = createTestContext({
  emailPrefix: 'test',           // Optional: prefix for email (default: 'test')
  orgBase: 'Test Org',          // Optional: base org name (default: 'Test Org')
  corporateDomain: 'corp.com',  // Optional: corporate email domain
  includeSecondary: true        // Optional: include secondary email
});

// Returns:
{
  testId: '1750952561531-a3b4c5d6',
  emails: {
    primary: 'test-1750952561531-a3b4c5d6@example.com',
    secondary: 'test-secondary-1750952561531-a3b4c5d6@example.com',  // if includeSecondary
    corporate: 'test-1750952561531-a3b4c5d6@corp.com'              // if corporateDomain
  },
  organization: {
    name: 'Test Org 1750952561531-a3b4c5d6',
    slug: 'test-org-1750952561531-a3b4c5d6'
  }
}
```

## Migration Pattern

### Before (Using Date.now())

```typescript
test.describe('My Tests', () => {
  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test.afterEach(async () => {
    await cleanDatabase();
  });

  test('my test', async ({ browser }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const corporateEmail = `user-${Date.now()}@testcorp.com`;
    const orgName = 'TestCorp Engineering';
    // ... test implementation
  });
});
```

### After (Using Test Identifiers)

```typescript
test.describe('My Tests', () => {
  // Store test IDs for cleanup
  const testIds: string[] = [];

  test.beforeEach(async () => {
    await cleanDatabase();
  });

  test.afterEach(async () => {
    // Clean up test-specific data
    for (const testId of testIds) {
      await cleanTestData(testId).catch(err => 
        logProgress(`⚠️ Cleanup failed for testId ${testId}: ${err.message}`)
      );
    }
    testIds.length = 0; // Clear the array
  });

  test('my test', async ({ browser }) => {
    const testContext = createTestContext({
      emailPrefix: 'test',
      corporateDomain: 'testcorp.com',
      orgBase: 'TestCorp Engineering'
    });
    testIds.push(testContext.testId);
    
    const testEmail = testContext.emails.primary;
    const corporateEmail = testContext.emails.corporate!;
    const orgName = testContext.organization.name;
    // ... test implementation
  });
});
```

## Common Patterns

### 1. Simple Test User

```typescript
const testContext = createTestContext();
testIds.push(testContext.testId);
const email = testContext.emails.primary;  // test-[id]@example.com
```

### 2. Corporate Email User

```typescript
const testContext = createTestContext({
  corporateDomain: 'testcorp.com'
});
testIds.push(testContext.testId);
const corporateEmail = testContext.emails.corporate!;  // test-[id]@testcorp.com
```

### 3. Multiple Users in Same Test

```typescript
// User 1
const testContext1 = createTestContext({
  emailPrefix: 'user1',
  orgBase: 'First Org'
});
testIds.push(testContext1.testId);

// User 2
const testContext2 = createTestContext({
  emailPrefix: 'user2',
  orgBase: 'Second Org'
});
testIds.push(testContext2.testId);
```

### 4. Screenshot/Debug File Names

```typescript
// Before
await page.screenshot({ path: `debug-${Date.now()}.png` });

// After
await page.screenshot({ path: `debug-${testContext.testId}.png` });
```

## Cleanup Strategy

The new `cleanTestData()` function performs targeted cleanup based on testId:

```typescript
// Cleans only data created with this specific testId
await cleanTestData(testId);

// The function cleans:
// - Users with emails containing the testId
// - Organizations with names/slugs containing the testId
// - Sessions for users with the testId
// - Memberships for users/orgs with the testId
// - Account linkages for users with the testId
```

## Benefits

1. **Parallel Execution**: Tests can now run with multiple workers without data conflicts
2. **Targeted Cleanup**: Only test-specific data is cleaned up, not all test data
3. **Debugging**: Test IDs in data make it easy to trace which test created what data
4. **Consistency**: All test data uses the same identifier pattern

## Running Tests with Multiple Workers

```bash
# Run with 4 workers (CI default)
npx playwright test --workers=4

# Run with 8 workers for faster execution
npx playwright test --workers=8

# The tests will now execute in parallel without conflicts
```

## Troubleshooting

### Data Still Conflicting?

1. Ensure all `Date.now()` calls are replaced with test contexts
2. Check that `testIds.push(testContext.testId)` is called for each context
3. Verify the afterEach hook includes the cleanup loop

### Cleanup Failing?

1. The cleanup is wrapped in try-catch to prevent test failures
2. Check MongoDB logs for connection issues
3. Ensure the testId is being tracked in the testIds array

### Finding Test Data in Database

```javascript
// In MongoDB shell, find all data from a specific test run
db.users.find({ email: /1750952561531-a3b4c5d6/ })
db.organizations.find({ name: /1750952561531-a3b4c5d6/ })
```