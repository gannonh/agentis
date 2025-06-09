# Playwright per-worker authentication solves the parallel testing challenge

When Playwright tests scale from 1 worker to multiple parallel workers, authentication becomes a critical bottleneck because the built-in setup project runs globally only once, creating a single storage state that all workers attempt to share. The solution is worker-scoped fixtures that create isolated authentication states for each parallel worker, enabling true parallel test execution without conflicts.

## The core problem: global setup creates a single shared state

Playwright's setup project architecture is designed for efficiency but creates a fundamental limitation for parallel testing. When the setup runs, it creates a single `storageState.json` file containing cookies, localStorage, and sessionStorage. With multiple workers, this leads to several critical failures:

- **Worker N expects** `storageState-worker-N.json` but finds only `storageState-worker-0.json`
- **Session conflicts** occur when multiple workers access the same authenticated session
- **Race conditions** emerge as workers invalidate each other's authentication tokens
- **Tests hang indefinitely** waiting for storage state files that will never exist

The root cause is architectural: setup projects execute once globally before any tests run, with no mechanism for per-worker execution. This design works perfectly for shared resources like database migrations but fails for user-specific authentication states.

## Worker-scoped fixtures provide true isolation

The official Playwright solution leverages **worker-scoped fixtures** that execute once per worker process, creating isolated authentication states. This pattern uses `test.info().parallelIndex` as a unique identifier ranging from 0 to workers-1 that remains consistent across test runs:

```typescript
// fixtures.ts
import { test as baseTest } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export const test = baseTest.extend<{}, { workerStorageState: string }>({
  // Override the global storageState to use worker-specific state
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
  
  // Create authentication state once per worker
  workerStorageState: [async ({ browser }, use) => {
    // Unique identifier for this worker (0 to workers-1)
    const id = test.info().parallelIndex;
    const fileName = path.resolve(test.info().project.outputDir, `.auth/${id}.json`);
    
    // Reuse existing authentication if available
    if (fs.existsSync(fileName)) {
      await use(fileName);
      return;
    }
    
    // Create new authentication in clean environment
    const page = await browser.newPage({ storageState: undefined });
    
    // Acquire unique account for this worker
    const account = await acquireAccount(id);
    
    // Perform authentication
    await page.goto('https://example.com/login');
    await page.fill('#username', account.username);
    await page.fill('#password', account.password);
    await page.click('[type="submit"]');
    await page.waitForURL('https://example.com/dashboard');
    
    // Save authentication state
    await page.context().storageState({ path: fileName });
    await page.close();
    
    // Provide state to all tests in this worker
    await use(fileName);
  }, { scope: 'worker' }],
});
```

The **`{ scope: 'worker' }`** configuration is crucial - it ensures the fixture runs once when the worker process starts and persists across all tests in that worker. Each worker receives its own isolated browser storage state, eliminating conflicts entirely.

## Account management strategies scale with your needs

The `acquireAccount()` function requires different implementations based on team size and infrastructure:

**For small teams**, use environment variables with pre-created accounts:
```typescript
async function acquireAccount(id: number) {
  const accounts = [
    { username: process.env.USER0_NAME, password: process.env.USER0_PASS },
    { username: process.env.USER1_NAME, password: process.env.USER1_PASS },
    { username: process.env.USER2_NAME, password: process.env.USER2_PASS }
  ];
  return accounts[id % accounts.length];
}
```

**For larger teams**, implement dynamic account generation:
```typescript
async function acquireAccount(id: number) {
  // Generate unique test account
  const timestamp = Date.now();
  const username = `test_user_${id}_${timestamp}`;
  
  // Create account via API
  await createTestAccount({ username, role: 'tester' });
  
  return { username, password: 'generated_password' };
}
```

**For enterprise environments**, integrate with identity providers:
```typescript
async function acquireAccount(id: number) {
  // Request temporary credentials from identity service
  const credentials = await identityService.requestTestCredentials({
    workerId: id,
    purpose: 'automated-testing',
    ttl: '2h'
  });
  
  return credentials;
}
```

## API authentication accelerates parallel execution

UI-based authentication creates unnecessary overhead in parallel environments. API authentication reduces setup time from seconds to milliseconds:

```typescript
workerStorageState: [async ({ request }, use) => {
  const id = test.info().parallelIndex;
  const fileName = `.auth/worker-${id}.json`;
  
  if (fs.existsSync(fileName)) {
    await use(fileName);
    return;
  }
  
  // Create API context
  const context = await request.newContext();
  
  // Authenticate via API
  const response = await context.post('/api/auth/login', {
    data: {
      username: `worker${id}@test.com`,
      password: 'secure_password'
    }
  });
  
  // Extract authentication cookies/tokens
  await context.storageState({ path: fileName });
  await context.dispose();
  
  await use(fileName);
}, { scope: 'worker' }],
```

This approach is particularly effective in CI/CD environments where network latency affects UI interactions but API calls remain fast.

## Advanced patterns handle complex authentication scenarios

**Multiple user roles** require separate worker fixtures:
```typescript
export const test = baseTest.extend<{}, { 
  adminAuth: string;
  userAuth: string;
}>({
  adminAuth: [async ({ browser }, use) => {
    const id = test.info().parallelIndex;
    await authenticateAs('admin', id, browser);
    await use(`./auth/admin-${id}.json`);
  }, { scope: 'worker' }],
  
  userAuth: [async ({ browser }, use) => {
    const id = test.info().parallelIndex;
    await authenticateAs('user', id, browser);
    await use(`./auth/user-${id}.json`);
  }, { scope: 'worker' }],
});
```

**Database isolation** prevents data conflicts between parallel tests:
```typescript
export const test = baseTest.extend<{}, { testDatabase: string }>({
  testDatabase: [async ({}, use) => {
    const dbName = `test_db_worker_${test.info().workerIndex}`;
    
    // Create isolated database
    await createDatabase(dbName);
    await seedTestData(dbName);
    
    await use(dbName);
    
    // Cleanup
    await dropDatabase(dbName);
  }, { scope: 'worker' }],
});
```

**Session refresh** handles token expiration in long-running suites:
```typescript
workerStorageState: [async ({ browser }, use) => {
  const id = test.info().parallelIndex;
  const fileName = `.auth/${id}.json`;
  
  // Refresh helper
  const refreshAuth = async () => {
    const state = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    if (isExpired(state)) {
      await reauthenticate(browser, id, fileName);
    }
  };
  
  // Initial authentication
  await authenticate(browser, id, fileName);
  
  // Set up periodic refresh
  const interval = setInterval(refreshAuth, 15 * 60 * 1000); // 15 minutes
  
  await use(fileName);
  
  clearInterval(interval);
}, { scope: 'worker' }],
```

## Best practices ensure reliable parallel execution

**File organization** keeps authentication states manageable:
```
playwright/
├── .auth/          # Git-ignored directory
│   ├── 0.json      # Worker 0 storage state
│   ├── 1.json      # Worker 1 storage state
│   └── 2.json      # Worker 2 storage state
├── fixtures.ts     # Worker-scoped fixtures
└── tests/          # Test files using fixtures
```

**Error handling** prevents cascading failures:
```typescript
workerStorageState: [async ({ browser }, use) => {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await authenticateWorker(browser, test.info().parallelIndex);
      await use(authFile);
      return;
    } catch (error) {
      lastError = error;
      console.log(`Auth attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error(`Authentication failed after ${maxRetries} attempts: ${lastError}`);
}, { scope: 'worker', timeout: 60000 }],
```

**Resource cleanup** prevents memory leaks in CI environments:
```typescript
// Clean up storage states after test run
test.afterAll(async () => {
  const authDir = path.join(test.info().project.outputDir, '.auth');
  if (fs.existsSync(authDir)) {
    await fs.promises.rm(authDir, { recursive: true, force: true });
  }
});
```

## Configuration optimizes parallel performance

Playwright configuration directly impacts parallel execution efficiency:

```typescript
// playwright.config.ts
export default defineConfig({
  // Optimize worker count for your environment
  workers: process.env.CI ? 4 : '50%', // 4 in CI, 50% of CPUs locally
  
  // Enable full parallelization
  fullyParallel: true,
  
  // Prevent worker reuse after failures
  forbidForbiddenWorkerReuse: true,
  
  // Set appropriate timeouts
  use: {
    // Extend timeout for authentication
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  // Configure output directory for auth files
  outputDir: './test-results',
});
```

## Common pitfalls lead to test failures

**Shared storage states** cause authentication conflicts when multiple workers access the same session. Each worker must have its own unique storage state file.

**Hardcoded credentials** break when scaling beyond available accounts. Always use dynamic account assignment based on `parallelIndex`.

**Missing cleanup** leads to storage state accumulation. Implement proper cleanup in CI/CD pipelines to prevent disk space issues.

**Race conditions** occur when workers attempt simultaneous authentication. Use mutex patterns or staggered authentication for services with rate limits.

**Insufficient accounts** limit parallelization. Ensure you have at least as many test accounts as potential workers to avoid bottlenecks.

## Conclusion

Worker-scoped fixtures transform Playwright from a single-worker testing tool into a massively parallel testing platform. By creating isolated authentication states for each worker using `parallelIndex`, tests achieve true isolation and can scale linearly with available resources. The pattern is flexible enough to handle simple environment variable accounts or complex enterprise authentication systems while maintaining the same core principle: each worker owns its authentication lifecycle completely. This approach has become the standard solution in the Playwright community, proven across thousands of test suites running millions of parallel tests daily.