# LibreChat End-to-End Testing Framework

Comprehensive End-to-End (E2E) testing framework for LibreChat, built with [Playwright](https://playwright.dev/). The framework provides modular testing configurations for different authentication methods, accessibility compliance, and thorough UI/UX validation.

## Table of Contents
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Test Configurations](#test-configurations)
- [Running Tests](#running-tests)
- [Test Suites](#test-suites)
- [Writing New Tests](#writing-new-tests)
- [Setup and Teardown](#setup-and-teardown)
- [Environment Configuration](#environment-configuration)
- [Test Artifacts](#test-artifacts)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Quick Start

```bash
# From the LibreChat directory (not e2e/)

# 1. Install dependencies
npm install

# 2. Ensure MongoDB is running
docker-compose -f docker-compose.dev.yml up -d mongodb

# 3. Set up local test user (for local tests)
cp e2e/config.local.example.ts e2e/config.local.ts
# Edit e2e/config.local.ts with test credentials

# 4. Run tests
npm run e2e:headed  # Run with visible browser
npm run e2e         # Run headless
```

## Architecture Overview

The E2E testing framework follows a modular architecture where:
- Each authentication method has dedicated configuration files
- Tests are isolated to prevent cross-contamination
- Setup/teardown processes ensure clean test environments
- Multiple test configurations support different scenarios (local dev, CI, auth-specific)

### Key Components

1. **Playwright Test Runner**: Core testing framework
2. **Test Configurations**: Modular configs for different scenarios
3. **Setup/Teardown Utilities**: Automated user management and cleanup
4. **Test Specifications**: Organized test suites by functionality
5. **Authentication System**: Shared auth utilities with provider-specific implementations

## Directory Structure

```
e2e/
├── config.local.example.ts         # Example local user configuration template (deprecated)
├── config.local.ts                 # Local user configuration (gitignored, deprecated)
├── jestSetup.js                    # Jest configuration for Playwright tests
├── login-logs.log                  # Authentication logs (gitignored)
├── storageState.json              # Browser storage state for test sessions (gitignored)
├── storageStateGoogle.json        # Google-specific browser storage (gitignored)
│
├── playwright.config.ts            # Main Playwright configuration
├── playwright.config.a11y.ts       # Accessibility testing configuration
├── playwright.config.google.ts     # Google OAuth testing configuration
├── playwright.config.local.ts      # Local development testing configuration
│
├── utils/                          # Test utilities
│   ├── testAuth.ts                # Better Auth authentication utilities
│   └── testLogger.ts              # Test logging utilities
│
├── specs/                         # Test specifications
│   ├── agent-cta-display.spec.ts # Agent discovery and CTA display tests
│   ├── basic-database-test.spec.ts # Basic authentication database test
│   ├── google.mcp.calendar.spec.ts # Google Calendar MCP integration tests
│   ├── google.mcp.docs.spec.ts   # Google Docs MCP integration tests
│   ├── google.mcp.gmail.spec.ts  # Gmail MCP integration tests
│   ├── google.mcp.multi.spec.ts  # Multi-service Google MCP tests
│   └── google.mcp.sheets.spec.ts # Google Sheets MCP integration tests
│
├── playwright-report/             # HTML test reports (gitignored)
├── playwright-report-google/      # Google-specific test reports (gitignored)
└── types.ts                      # TypeScript type definitions
```

## Test Configurations

### Configuration Hierarchy

```
playwright.config.ts (base)
├── playwright.config.local.ts (extends base, local dev)
├── playwright.config.google.ts (extends base, Google OAuth)
└── playwright.config.a11y.ts (extends base, accessibility)
```

### Main Configuration (`playwright.config.ts`)
- **Purpose**: Default configuration for CI and general testing
- **Port**: 3080 (same as development API)
- **Features**:
  - Automatic server startup
  - Chrome/Chromium browser
  - Video recording on retry
  - Trace collection on failure
  - HTML report generation

### Local Configuration (`playwright.config.local.ts`)
- **Purpose**: Local development and debugging
- **Port**: 3081 (avoids conflict with dev server)
- **Features**:
  - Disabled rate limiting
  - Extended timeouts
  - Local user credentials from `config.local.ts`
  - All security restrictions disabled for easier testing

### Google Configuration (`playwright.config.google.ts`)
- **Purpose**: Google OAuth authentication and Agent Builder testing
- **Port**: 3080
- **Features**:
  - Google-specific setup/teardown
  - Environment variable based credentials
  - MCP (Model Context Protocol) integration testing
  - Agent Builder workflow testing
  - Dedicated storage state file

### Accessibility Configuration (`playwright.config.a11y.ts`)
- **Purpose**: WCAG compliance testing
- **Port**: 3080
- **Features**:
  - axe-core integration
  - Focused test matching (`testMatch: /a11y/`)
  - Automated accessibility scanning

## Running Tests

### Prerequisites

1. **System Requirements**:
   - Node.js 18+ 
   - MongoDB running (local or Docker)
   - Chrome/Chromium browser

2. **Environment Setup**:
   ```bash
   # For Google OAuth tests
   echo 'GOOGLE_TEST_ACCOUNT_1_EMAIL="test@gmail.com"' >> .env
   echo 'GOOGLE_TEST_ACCOUNT_1_PASSWORD="secure-password"' >> .env
   
   # For local tests
   cp e2e/config.local.example.ts e2e/config.local.ts
   ```

3. **Database Setup**:
   ```bash
   # Using Docker
   docker-compose -f docker-compose.dev.yml up -d mongodb
   
   # Or ensure local MongoDB is running
   ```

### Available Commands

```bash
# Basic Testing
npm run e2e                    # Run all tests (headless)
npm run e2e:headed            # Run all tests (with browser visible)
npm run e2e:ci                # Run in CI mode (uses main config)

# Specific Test Suites
npm run e2e:google-mcp        # Google OAuth + Agent Builder tests (debug mode)
npm run e2e:a11y             # Accessibility tests

# Development Tools
npm run e2e:debug            # Debug mode with Playwright Inspector
npm run e2e:codegen          # Generate test code interactively
npm run e2e:report           # View HTML test report
npm run e2e:record-large     # Record with large viewport (1600x1700)

# Utility Commands
npm run e2e:login            # Record auth session manually
npm run e2e:update           # Update visual snapshots
```

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test e2e/specs/messages.spec.ts

# Run tests matching a pattern
npx playwright test -g "navigation"

# Run with specific configuration
npx playwright test --config=e2e/playwright.config.local.ts
```

## Getting started with Playwright MCP test generation

- You are a playwright test generator.
- You are given a scenario and you need to generate a playwright test for it.
- DO NOT generate test code based on the scenario alone. 
- DO run steps one by one using the tools provided by the Playwright MCP.
- Only after all steps are completed, emit a Playwright TypeScript test that uses @playwright/test based on message history
- Save generated test file in the e2e specs directory: `./LibreChat/e2e/specs`
- Execute the test file and iterate until the test passes

**Best Practices for Playwright MCP Usage:**

1. **Always Use Accessibility Snapshots Over Screenshots**
   - Use `mcp__playwright__browser_snapshot` to get structured page content
   - Avoid `mcp__playwright__browser_take_screenshot` unless specifically requested
   - Accessibility snapshots provide semantic element references (e.g., `ref=e26`) for reliable interactions

2. **Element Interaction Pattern**
   - First capture snapshot to see page structure
   - Use element descriptions and ref IDs for precise targeting
   - Example: `mcp__playwright__browser_click` with `element="Sign up link"` and `ref="e35"`

3. **Form Testing Workflow**
   - Fill forms systematically: `mcp__playwright__browser_type` with element description and ref
   - Capture snapshots between interactions to verify state changes
   - Test form validation by attempting submission with incomplete data

4. **Navigation and State Management**
   - Use `mcp__playwright__browser_navigate` for direct URLs
   - Use `mcp__playwright__browser_navigate_back`/`forward` for browser navigation
   - Tab management: `browser_tab_new`, `browser_tab_select`, `browser_tab_close`
   - Window resizing: `browser_resize` for responsive testing

5. **Debugging and Monitoring**
   - Use `mcp__playwright__browser_console_messages` to check for errors/logs
   - Network requests available but may be large - use carefully
   - Hover effects: `mcp__playwright__browser_hover` for UI state testing

6. **Key Benefits Over Traditional Automation**
   - No visual processing delays
   - Semantic element targeting (more reliable than CSS selectors)
   - Real-time state capture in structured format
   - Built-in accessibility compliance checking

**Common Use Cases:**
- E2E testing of web applications
- Form validation testing
- Theme/UI state verification
- Multi-tab workflow testing
- Responsive design testing



## CRITICAL: Before Debugging Tests

**ALWAYS read the complete test file first** before attempting any debugging or manual testing:

1. **Read the entire test file** - Understand all tests, their sequence, and what each expects
2. **Identify data dependencies** - Map which tests create data and which tests consume it
3. **Understand the data contract** - What specific data does each test expect to exist?
4. **Check test sequence** - Tests often have dependencies (Test 1 creates data, Tests 2-N use it, Last test cleans up)
5. **Never manually create test data** - The tests themselves should create the data they need

Common test patterns:
- Test 1: Verify clean state (no data)
- Test 2: Create test data (specific entities with specific names/properties)
- Tests 3-N: Use the data created in Test 2
- Last test: Clean up all test data

**Manual testing through the UI is NOT equivalent to what automated tests expect.**

## Things to remember

  - Playwright tests **run** on port 3080 because Playwright uses its own webserver (config in `./LibreChat/e2e/playwright.config.ts`)
  - This also means that e2e tests **will NOT** pick up changes to client app without building first. To ensure changes are picked up, do a full **clean rebuild when testing e2e** after making changes to packages or client: `./scripts/dev.sh --clean`.
  - However, when using `playwright:browser_navigate (MCP)` to access the app to run through user flows, make sure the dev servers are running (`./scripts/dev.sh --all`), and access on **PORT 3090 (not 3080!)**.
  - Here is a typical run command from package.json: `../scripts/dev.sh --stop && cross-env PWDEBUG=0 npx playwright test --config=e2e/playwright.config.ts e2e/specs/agent-cta-display.spec.ts --headed0`
  - Typically in a test suite, we set up the data in the first test and then cleanup in the last test. This allows the data to persist through all tests in the suite:
    ```js
    // Cleanup
    const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
    await cleanupAgents(testUserEmail);
    await cleanupChats(testUserEmail);
    logProgress('✅ Cleaned up test data');
    ```

### Setup & Teardown

- Setup is automatically handled by the `fileStorageState` fixture in `fixtures/fixtures.ts`
- Each test file gets a unique user with UUID-based isolation
- Teardown is handled automatically by the fixture cleanup system

### Auth Accounts

- Create a new user when you need a fresh account, otherwise use an existing agentis test account:
  - Test Account 1 (populated with several custom agents)
    - gannonhall@gmail.com
    - 999999999
  - Test Account 2 (populated with some though fewer content)
    - gannon@astro-labs.app
    - 111111111
  - Test Account 3 (best to use for destructive tests)
    - test@test111.com
    - 111111111
  - Google Auth Accounts (use the follow to authenticate for Google service; these are also .env vars)
    - GOOGLE_TEST_ACCOUNT_1_EMAIL="agentis.test@gmail.com"
    - GOOGLE_TEST_ACCOUNT_1_PASSWORD="KJHkh97HKH87jjfU"


## Test Authentication System

### Better Auth Integration (Current)

**CURRENT APPROACH**: Tests now use Better Auth HTTP APIs for authentication, providing more reliable and production-like test environments.

Each test suite creates its own unique user and organization using Better Auth's registration and organization creation APIs, ensuring complete test isolation.

```mermaid
graph TD
    A[Test Suite: agent-cta-display.spec.ts] --> B[Generate Test ID: abc123ef]
    B --> C[User: test-abc123ef@example.com]
    C --> D[Better Auth Sign-up API]
    D --> E[Better Auth Sign-in API]
    E --> F[Get Session Token]
    F --> G[Create Organization via API]
    G --> H[Accept Terms of Service]
    H --> I[Test 1: No Featured Agents]
    I --> J[Test 2: Create Featured Agents]
    J --> K[Test 3: CTA Navigation]
    K --> L[Cleanup User & Organization]
    
    style A fill:#e1f5fe
    style C fill:#fff3e0
    style F fill:#f3e5f5
    style G fill:#f3e5f5
```

### Better Auth Flow

```mermaid
sequenceDiagram
    participant TS as Test Suite
    participant BA as Better Auth API
    participant DB as Database
    participant B as Browser
    participant App as LibreChat App
    
    TS->>TS: Generate unique test ID
    TS->>BA: POST /api/auth/sign-up/email
    BA->>DB: Create user account
    BA->>TS: User created
    
    TS->>BA: POST /api/auth/sign-in/email
    BA->>DB: Authenticate user
    BA->>TS: Session token + cookies
    
    TS->>BA: POST /api/auth/organization/create
    BA->>DB: Create organization
    BA->>TS: Organization created
    
    TS->>BA: POST /api/user/terms/accept
    BA->>DB: Update terms acceptance
    BA->>TS: Terms accepted
    
    Note over TS: Authentication complete
    
    TS->>B: Create context with session cookies
    TS->>App: Navigate to app (authenticated)
    TS->>TS: Run test scenarios
    
    Note over TS: After all tests
    TS->>DB: Cleanup user & organization
```

### Key Principles

1. **Better Auth Integration**: Uses actual Better Auth APIs for user creation and authentication
2. **Unique Test Data**: Each test suite gets a unique user, organization, and session
3. **Complete Onboarding Bypass**: Registration → Sign-in → Organization → Terms → Ready
4. **Session Token Authentication**: Tests use real Better Auth session tokens for authentication
5. **Complete Isolation**: Test suites cannot see each other's data
6. **Automatic Cleanup**: Test data is cleaned up after test completion

### Implementation

The new implementation uses the `testAuth.ts` utility for Better Auth integration:

```typescript
// testAuth.ts - Better Auth API integration
export async function createTestUserWithOrganization(testId: string): Promise<TestAuthResult> {
  // 1. Create user via Better Auth sign-up API
  const signUpResponse = await fetch('http://localhost:3080/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${testId}@example.com`,
      password: `TestPass123!${testId}`,
      name: `Test User ${testId}`,
    }),
  });

  // 2. Sign in to get session token
  const signInResponse = await fetch('http://localhost:3080/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  // 3. Create organization via Better Auth API
  const createOrgResponse = await fetch('http://localhost:3080/api/auth/organization/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `better-auth.session_token=${sessionToken}`
    },
    body: JSON.stringify({
      name: `Test Org ${testId}`,
      slug: `test-org-${testId}`,
    }),
  });

  // 4. Accept terms of service
  await fetch('http://localhost:3080/api/user/terms/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `better-auth.session_token=${sessionToken}`
    }
  });

  return { user, organization, session, sessionCookie };
}
```

**This approach ensures**:
- Production-like authentication flow
- Valid session tokens that work with the frontend
- Proper organization setup for multi-tenant features
- Terms of service acceptance for complete onboarding bypass
- Easy cleanup with `cleanupTestUser()` function

## Writing New Tests

### Test Structure (Better Auth)

```typescript
import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { createTestUserWithOrganization, cleanupTestUser, generateTestId, type TestAuthResult } from '../utils/testAuth';

// Configure viewport for consistent testing
test.use({
  viewport: { width: 1600, height: 1700 }
});

// Tests run in order within the file
test.describe.configure({ mode: 'default' });

test.describe('My Test Suite', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    // Generate unique test ID and create authenticated user
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user: ${testAuth.user.email}`);
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testAuth) {
      await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
      logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
    }
  });

  test('should perform specific action', async ({ browser }) => {
    logProgress('Starting test');
    
    // Create browser context with authentication cookies
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: testAuth.session.sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);
    
    const page = await context.newPage();

    try {
      // Navigate to app (already authenticated)
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);
      
      // Perform test actions
      const message = 'Test message';
      await page.getByTestId('text-input').fill(message);
      await page.getByTestId('send-button').click();
      
      // Verify results
      await expect(page.getByText(message)).toBeVisible();
      logProgress('✅ Test completed successfully');
    } finally {
      await context.close();
    }
  });
});
```

### Common Patterns

#### Waiting for API Responses
```typescript
const responsePromise = page.waitForResponse(
  response => response.url().includes('/api/ask/') && response.status() === 200
);
await page.locator('button').click();
const response = await responsePromise;
```

#### Handling Dynamic Content
```typescript
// Wait for element to appear
await page.waitForSelector('[data-testid="chat-message"]');

// Wait for specific text
await page.waitForFunction(
  text => document.body.innerText.includes(text),
  'Expected text'
);
```

#### Testing Authentication Flows
```typescript
// Example: Adding a new OAuth provider
async function authenticateProvider(page: Page, provider: string) {
  await page.goto('/login');
  await page.getByRole('button', { name: `Sign in with ${provider}` }).click();
  
  // Handle provider-specific login flow
  await page.waitForURL(/.*\/c\/new/);
}
```

## Setup and Teardown

### Authentication Flow (Better Auth)

The authentication flow is now handled by the `testAuth.ts` utility using Better Auth APIs:

1. **Test ID Generation**: 
   - Generate unique test ID with timestamp and random string
   - Create user: `test-{testId}@example.com`

2. **Better Auth Registration**:
   - Call Better Auth sign-up API with user credentials
   - Create new user account in database via Better Auth

3. **Better Auth Sign-in**:
   - Call Better Auth sign-in API to get session token
   - Extract session token from response cookies
   - Validate session token works with Better Auth

4. **Organization Creation**:
   - Call Better Auth organization API to create test organization
   - Link user to organization as owner
   - Ensure organization is visible in list API

5. **Terms Acceptance**:
   - Call terms acceptance API to bypass T&C modal
   - User is now fully onboarded and ready for testing

6. **Test Execution**:
   - Inject session cookies into browser context
   - All tests in suite share same authenticated user
   - Complete isolation between different test suites

### Database Cleanup Process

The cleanup utility performs thorough database cleaning:
```javascript
// From testAuth.ts cleanupTestUser()
- Delete user sessions (Better Auth and direct DB)
- Delete organization memberships
- Delete organization by ID
- Delete user account by ID
- Delete OAuth account linkages
- Handle both ObjectId and string ID formats
```

## Environment Configuration

### Port Allocation

| Service             | Port | Usage                   |
| ------------------- | ---- | ----------------------- |
| Dev API             | 3080 | Development backend     |
| Dev Client          | 3090 | Development frontend    |
| Test Server (main)  | 3080 | CI/main tests           |
| Test Server (local) | 3081 | Local development tests |

### Test Environment Variables

```bash
# Core Settings
NODE_ENV=CI                          # Marks as test environment
ALLOW_REGISTRATION=true              # Enable user registration
SESSION_EXPIRY=60000                # 1-minute sessions
REFRESH_TOKEN_EXPIRY=300000         # 5-minute refresh tokens

# Rate Limiting (disabled for tests)
LOGIN_VIOLATION_SCORE=0
REGISTRATION_VIOLATION_SCORE=0
CONCURRENT_VIOLATION_SCORE=0
MESSAGE_VIOLATION_SCORE=0

# Message Limits (relaxed for tests)
LIMIT_CONCURRENT_MESSAGES=false
MESSAGE_USER_MAX=100
```

## Test Artifacts

### Generated Files

1. **Storage State Files**:
   - `storageState.json`: Default browser state
   - `storageStateGoogle.json`: Google auth state
   - Contains cookies, localStorage, sessionStorage

2. **Reports**:
   - `playwright-report/`: HTML test results
   - `playwright-report-google/`: Google-specific results
   - Includes test traces, videos, screenshots

3. **Logs**:
   - `login-logs.log`: Authentication debugging
   - Console output from test runs

### Viewing Results

```bash
# Open HTML report
npm run e2e:report

# View specific report
npx playwright show-report e2e/playwright-report-google
```

## Troubleshooting

### Common Issues and Solutions

#### Port Already in Use
```bash
# Find and kill process
lsof -ti:3080 | xargs kill -9

# Or use different port in config
# Edit playwright.config.local.ts
webServer: { port: 3082 }
```

#### MongoDB Connection Issues
```bash
# Check MongoDB is running
docker ps | grep mongo

# Check connection string in .env
MONGO_URI=mongodb://localhost:27017/librechat

# With authentication
MONGO_URI=mongodb://admin:password@localhost:27017/librechat?authSource=admin
```

#### User Already Exists
```bash
# The setup automatically handles this, but if needed:
# Connect to MongoDB and remove test user
mongo librechat --eval "db.users.deleteOne({email: 'test@example.com'})"
```

#### Test Timeouts
```typescript
// Increase test timeout
test.setTimeout(120000); // 2 minutes

// Or in config
use: {
  timeout: 60000, // Global timeout
}
```

#### Terms of Service Modal
The modal appears only in test environment. Tests handle it automatically:
```typescript
try {
  await page.getByRole('button', { name: 'I accept' }).click({ timeout: 5000 });
} catch (e) {
  // Modal not present, continue
}
```

### Debug Strategies

1. **Use Debug Mode**:
   ```bash
   npm run e2e:debug
   # Or for specific tests like Google MCP (already in debug mode)
   npm run e2e:google-mcp
   ```

2. **Enable Verbose Logging**:
   ```bash
   DEBUG=pw:api npm run e2e
   ```

3. **Capture More Artifacts**:
   ```typescript
   use: {
     screenshot: 'on',  // Always capture
     video: 'on',       // Always record
     trace: 'on',       // Always trace
   }
   ```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
# Example workflow
- name: Run E2E Tests
  run: |
    npm ci
    npx playwright install chromium
    npm run e2e:ci
  env:
    MONGO_URI: ${{ secrets.MONGO_URI }}
    CI: true
```

### CI Optimizations

- **Retries**: 2 attempts for flaky tests
- **Parallelization**: Disabled for stability
- **Artifacts**: Automatic upload of reports
- **Caching**: Dependencies and browser binaries

## Best Practices

### Test Design

1. **Independence**: Each test should run in isolation
2. **Idempotency**: Tests should produce same results on repeated runs
3. **Clarity**: Use descriptive test names and assertions
4. **Speed**: Minimize waits, use explicit conditions

### Code Quality

1. **Page Object Model**: Consider for complex pages
2. **Reusable Utilities**: Extract common operations
3. **Type Safety**: Use TypeScript types consistently
4. **Error Handling**: Graceful failures with clear messages

### Performance

1. **Selective Testing**: Use `test.only` during development
2. **Parallel Execution**: Enable on Unix systems
3. **Resource Cleanup**: Always clean up test data
4. **Smart Waits**: Use `waitForSelector` over `waitForTimeout`

## Future Enhancements

1. **Authentication Providers**:
   - Facebook OAuth
   - GitHub OAuth  
   - Microsoft OAuth
   - LDAP/SAML

2. **Advanced Testing**:
   - Visual regression testing
   - Performance benchmarking
   - Load testing scenarios
   - API endpoint testing

3. **Infrastructure**:
   - Docker-based test environment
   - Cloud testing services
   - Cross-browser testing
   - Mobile responsive testing

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [LibreChat Documentation](../README.md)
- [Authentication Configuration](../docs/configuration/authentication)
- [MCP Integration](../docs/configuration/mcp)
- [axe-core Documentation](https://www.deque.com/axe/)