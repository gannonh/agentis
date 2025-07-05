# Agentis E2E Testing Framework

## Overview

The Agentis E2E testing framework is a comprehensive Playwright-based test suite designed to ensure the reliability and functionality of the Agentis platform (a branded fork of LibreChat). The framework emphasizes modern testing practices with Better Auth integration, complete test isolation, and extensive coverage of agent creation, authentication flows, and MCP (Model Context Protocol) integrations.

## Table of Contents

- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Authentication System](#authentication-system)
- [Test Configurations](#test-configurations)
- [Running Tests](#running-tests)
- [Test Suites](#test-suites)
- [Writing New Tests](#writing-new-tests)
- [OAuth Integration Testing](#oauth-integration-testing)
- [MCP (Model Context Protocol) Testing](#mcp-model-context-protocol-testing)
- [Fixtures and Storage](#fixtures-and-storage)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Architecture

The testing framework is built on several key principles:

- **Test Isolation**: Each test suite creates unique users and organizations using timestamped IDs
- **Better Auth Integration**: Uses actual Better Auth HTTP APIs for authentication, providing production-like test environments
- **Multiple Configurations**: Separate configurations for different testing scenarios (CI, local development, Google OAuth, accessibility)
- **Real Browser Testing**: Uses Playwright for reliable browser automation with support for Chrome, Firefox, Safari, and mobile browsers
- **Aria Snapshot Testing**: Uses accessibility snapshots for reliable element interaction instead of screenshot-based testing

## Directory Structure

```
e2e/
├── playwright.config.ts            # Main configuration (port 3080, CI mode)
├── tsconfig.json                   # TypeScript configuration for ES modules
├── types.ts                        # Type definitions (User interface)
├── package.json                    # ES module configuration
├── jestSetup.js                    # Jest configuration for Playwright
├── CLAUDE.md                       # Claude Code guidance with @README.md import
├── README.md                       # This documentation
│
├── specs/                          # Test specifications
│   ├── agent-cta-display.spec.ts   # Agent discovery, featured agents, CTA tests
│   ├── basic.prompts.spec.ts       # Prompt creation, variables, commands
│   ├── google.mcp.calendar.spec.ts # Google Calendar MCP integration
│   ├── google.mcp.docs.spec.ts     # Google Docs MCP integration
│   ├── google.mcp.gmail.spec.ts    # Gmail MCP integration
│   ├── google.mcp.multi.spec.ts    # Multi-service Google MCP workflows
│   ├── google.mcp.sheets.spec.ts   # Google Sheets MCP integration
│   ├── notion.mcp.spec.ts          # Notion MCP integration
│   └── oauth.google.spec.ts        # Google OAuth authentication
│
├── utils/                          # Test utilities
│   ├── testAuth.ts                 # Better Auth API integration
│   ├── testLogger.ts               # Progress logging with timestamps
│   ├── cleanupUser.ts              # Database cleanup utilities
│   ├── fileAuthentication.ts       # Legacy file-based auth (deprecated)
│   └── oAuth.ts                    # OAuth popup handling helpers
│
├── data/                           # Test data and logs
│   ├── codegen-auth.json           # Generated auth data (gitignored)
│   ├── logs.json                   # Test execution logs
│   └── violations.json             # Security violation tracking
│
├── fixtures/                       # Browser state storage
│   └── storageState-test-*.json    # Session storage states (gitignored)
│
├── playwright-report/              # HTML test reports (gitignored)
└── login-logs.log                  # Detailed auth logs (gitignored)
```

## Authentication System

### Better Auth Integration

The framework uses Better Auth HTTP APIs for production-like authentication flow:

```typescript
// Core authentication workflow in testAuth.ts
export async function createTestUserWithOrganization(testId: string): Promise<TestAuthResult> {
  // 1. Test server connectivity
  const healthCheck = await fetch('http://localhost:3080/');
  
  // 2. Create user via Better Auth sign-up
  const signUpResponse = await fetch('http://localhost:3080/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${testId}@example.com`,
      password: `TestPass123!${testId}`,
      name: `Test User ${testId}`,
    }),
  });

  // 3. Sign in to get session token
  const signInResponse = await fetch('http://localhost:3080/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  // 4. Extract session token from Set-Cookie header
  const sessionToken = extractSessionToken(signInResponse);

  // 5. Create organization via Better Auth API
  const createOrgResponse = await fetch('http://localhost:3080/api/auth/organization/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `better-auth.session_token=${sessionToken}`
    },
    body: JSON.stringify({
      name: `Test Org ${testId}`,
      slug: `test-org-${testId}`,
      metadata: { testId, createdForE2E: true }
    }),
  });

  // 6. Accept terms of service to bypass modals
  await fetch('http://localhost:3080/api/user/terms/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `better-auth.session_token=${sessionToken}`
    }
  });

  return { user, organization, session, sessionCookie };
}
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Test as Test Suite
    participant BA as Better Auth API
    participant DB as MongoDB
    participant Browser as Playwright Browser
    
    Test->>Test: Generate unique testId (timestamp-random)
    Test->>BA: POST /api/auth/sign-up/email
    BA->>DB: Create user in users collection
    BA->>Test: User creation success
    
    Test->>BA: POST /api/auth/sign-in/email
    BA->>DB: Authenticate & create session
    BA->>Test: Session token in Set-Cookie header
    
    Test->>BA: POST /api/auth/organization/create
    BA->>DB: Create organization & membership
    BA->>Test: Organization created
    
    Test->>BA: POST /api/user/terms/accept
    BA->>DB: Update user terms acceptance
    BA->>Test: Terms accepted (bypasses modal)
    
    Test->>Browser: Inject session cookies
    Browser->>Test: Authenticated & ready for testing
    
    Note over Test: Run test scenarios
    
    Test->>DB: Direct cleanup (sessions, members, orgs, users)
```

### Test ID Generation

```typescript
export function generateTestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}
// Example: "1705952561531-t34lmtp"
```

## Test Configurations

### Playwright Configuration

Key configuration details from `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: 'specs/',
  outputDir: 'specs/.test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // Disabled for Google OAuth stability
  workers: process.env.CI ? 4 : 2, // Rate limiting consideration
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  
  use: {
    baseURL: 'http://localhost:3080',
    video: 'on-first-retry',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    headless: true,
    screenshot: 'only-on-failure',
  },
  
  timeout: 5 * 60 * 1000, // 5 minutes per test
  expect: { timeout: 10000 }, // 10 seconds for assertions
  
  // Multi-browser testing
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
    { name: 'Google Chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],

  // Auto-start test server with CI environment
  webServer: {
    command: `node ${absolutePath}`, // ../api/server/index.js
    port: 3080,
    timeout: 120_000, // 2 minutes for MCP initialization
    reuseExistingServer: false, // Ensure clean state
    env: {
      NODE_ENV: 'CI',
      ALLOW_REGISTRATION: 'true',
      SESSION_EXPIRY: '60000', // 1 minute sessions
      REFRESH_TOKEN_EXPIRY: '300000', // 5 minute refresh
      BETTER_AUTH_SECRET: 'test-secret-key-for-e2e-testing-only',
      MONGO_URI: 'mongodb://admin:password@localhost:27017/Agentis?authSource=admin',
      // Rate limiting disabled
      REGISTER_WINDOW: '1',
      REGISTER_MAX: '1000',
      REGISTRATION_VIOLATION_SCORE: '0',
      // Google test credentials
      GOOGLE_TEST_ACCOUNT_1_EMAIL: 'agentis.test@gmail.com',
      GOOGLE_TEST_ACCOUNT_1_PASSWORD: 'KJHkh97HKH87jjfU',
    },
  },
});
```

### Configuration Notes

1. **Port Usage**:
   - Tests: 3080 (Playwright web server)
   - Development: 3090 (frontend), 3080 (backend)
   - Tests use built application files, not live development server

2. **Worker Configuration**:
   - CI: 4 workers for parallel execution
   - Local: 2 workers to avoid rate limiting

3. **Environment Variables**:
   - `NODE_ENV=CI` triggers test mode configurations
   - Rate limiting completely disabled for tests
   - Short session expiry for faster cleanup

## Running Tests

### Prerequisites

1. **System Setup**:
   ```bash
   # From LibreChat directory (not e2e/)
   npm install
   
   # Ensure MongoDB and MailHog are running
   docker-compose -f docker-compose.dev.yml up -d mongodb mailhog
   
   # Set environment variables in .env
   GOOGLE_TEST_ACCOUNT_1_EMAIL="agentis.test@gmail.com"
   GOOGLE_TEST_ACCOUNT_1_PASSWORD="your-password"
   ```

2. **Database Connection**:
   ```bash
   # MongoDB with authentication
   MONGO_URI=mongodb://admin:password@localhost:27017/Agentis?authSource=admin
   ```

3. **Build Requirements**:
   ```bash
   # E2E tests require built application
   ./scripts/dev.sh --clean  # Clean rebuild
   npm run build:data-provider # Rebuild packages if changed
   ```

### Available Commands

```bash
# From LibreChat directory (NOT from e2e/)

# Basic test execution
npm run e2e                    # All tests headless
npm run e2e:headed            # All tests with browser visible
npm run e2e:ci                # CI mode (uses main config)

# Development and debugging
npm run e2e:debug            # Debug mode with Playwright Inspector
npm run e2e:codegen          # Interactive test generation
npm run e2e:report           # View HTML test report

# Specific test execution
npx playwright test e2e/specs/agent-cta-display.spec.ts
npx playwright test e2e/specs/basic.prompts.spec.ts --headed
npx playwright test -g "should create featured agent"

# Configuration-specific runs
npx playwright test --config=e2e/playwright.config.ts
```

### Important Notes

1. **Development vs Testing**:
   - **Development**: Use `./scripts/dev.sh --all` and access port 3090
   - **Testing**: Playwright auto-starts server on port 3080 with built files

2. **When to Rebuild**:
   - After changes to packages (`data-provider`, `data-schemas`, `mcp`)
   - After changes to client code
   - When tests fail due to "old code" being executed

3. **Typical Test Command**:
   ```bash
   # Stop dev servers, run clean test
   ../scripts/dev.sh --stop && npx playwright test --config=e2e/playwright.config.ts e2e/specs/agent-cta-display.spec.ts --headed
   ```

## Test Suites

### Agent CTA Display Tests

Tests the agent discovery and call-to-action functionality:

```typescript
test.describe('Agent CTA Display Tests', () => {
  // Test 1: No featured agents state
  test('should display no featured agents message when no agents are featured', async ({ browser }) => {
    // Verify "No featured agents available" message
    await expect(page.getByText('No featured agents available')).toBeVisible();
    // Verify "Discover Agents" section is hidden
    await expect(page.getByRole('heading', { name: 'Discover Agents' })).not.toBeVisible();
  });

  // Test 2: Create featured agents and verify CTAs
  test('should create featured agent and display in CTAs', async ({ browser }) => {
    // Create 4 featured agents (Sheets, Drive, Docs, Gmail, Calendar)
    // Verify "Discover Agents" section appears
    await expect(page.getByRole('heading', { name: 'Discover Agents' })).toBeVisible();
    // Verify CTA buttons for each agent
    await expect(page.getByRole('button', { name: 'Start chat with Google Docs' })).toBeVisible();
  });

  // Test 3: CTA navigation functionality
  test('should navigate correctly when clicking on CTAs', async ({ browser }) => {
    // Click CTA, verify agent selection and description
    await page.getByRole('button', { name: 'Start chat with Google Docs' }).click();
    await expect(page.getByLabel('Start chat with Google Docs').getByRole('heading')).toContainText('Google Docs Agent');
  });

  // Test 4: CTAs disappear after chat starts
  test('chat should dissapear CTAs', async ({ browser }) => {
    // Start chat with agent
    await page.getByTestId('text-input').fill('Do I have any appointments today?');
    await page.getByTestId('send-button').click();
    // Verify CTAs are hidden
    await expect(page.getByRole('heading', { name: 'Discover Agents' })).not.toBeVisible();
  });
});
```

### Prompt Tests

Tests prompt creation and management functionality:

```typescript
test('Create Prompts', async ({ browser }) => {
  // Navigate to prompts
  await page.getByRole('button', { name: 'Prompts' }).click();
  await page.getByRole('button', { name: 'Create Prompt' }).click();

  // Fill prompt details
  await page.getByRole('textbox', { name: 'Prompt Name*' }).fill('Code Review Assistant');
  await page.locator('textarea[name="prompt"]').fill(
    'You are an expert code reviewer. Please review the following {{language}} code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance considerations\n4. Security concerns\n\nCode to review:\n{{code}}\n\nContext: {{context}}\n\nPlease format your response with clear sections and actionable suggestions.'
  );
  await page.getByRole('textbox', { name: 'Optional: Enter a description' }).fill('Analyzes code snippets for quality, bugs, performance, and security issues');
  await page.getByRole('textbox', { name: 'Optional: Enter a command for' }).fill('review');

  // Save and verify
  await page.getByLabel('Create Prompt').click();
  await expect(page.getByRole('button', { name: 'Code Review Assistant prompt' }).first()).toBeVisible();

  // Verify prompt content
  await expect(page.getByText('You are an expert code reviewer')).toBeVisible();
  await expect(page.getByText('{{code}}')).toBeVisible();
  await expect(page.getByText('{{context}}')).toBeVisible();
});
```

### Google MCP Integration Tests

Each Google service has dedicated test files:

#### Google Multi MCP

```typescript
test('Create Google Multi Agent', async ({ browser }) => {
  // Create agent with multiple Google tools
  await page.getByRole('textbox', { name: 'Agent name' }).fill('Google Multi Agent');
  await page.getByRole('textbox', { name: 'Agent description' }).fill(
    "Seamlessly work across Google's core productivity tools..."
  );

  // Add multiple Google services
  await page.getByRole('button', { name: 'Add Google Drive' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  
  await page.getByRole('button', { name: 'Add Google Docs' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
  
  await page.getByRole('button', { name: 'Add Google Sheets' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();
});

test('Use Google Multi Agent', async ({ browser }) => {
  // Skip in CI mode to avoid rate limiting
  if (process.env.CI) {
    logProgress('⚠️ CI mode - Skipping Use Google Multi Agent test');
    return;
  }

  // Select agent and start chat
  await page.getByRole('button', { name: 'Select a model' }).click();
  await page.getByText('Agents', { exact: true }).first().click();
  await agentsContainer.getByText('Google Multi Agent').click();

  // Send message that triggers authentication
  await page.getByTestId('text-input').fill('Hello! What tools do you have? What are your capabilities?');
  await page.getByTestId('send-button').click();

  // Handle multi-service OAuth authentication
  const page1 = await handleInitialAuth(page, 'Google Drive');
  const page2 = await handleExistingAccountAuth(page, 'Google Docs');
  const page3 = await handleExistingAccountAuthSingle(page, 'Google Sheets');
});
```

## Email Testing with MailHog

### How MailHog Works

MailHog is an email testing tool that acts as a fake SMTP server. It captures all outgoing emails instead of actually sending them, making it perfect for testing.

### Current Configuration

Emails are routed to MailHog in the following environments:

```javascript
// From sendEmail.js
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'ci' || process.env.NODE_ENV === 'development' || process.env.USE_MAILHOG === 'true') {
  transporterOptions = {
    host: process.env.MAILHOG_HOST || 'localhost',
    port: process.env.MAILHOG_PORT || 1025,
    secure: false,
    auth: false,
    tls: {
      rejectUnauthorized: false,
    },
  };
}
```

### Environment Email Routing

- **Production** (`NODE_ENV=production`): Uses configured SMTP service
- **Development** (`NODE_ENV=development`): Routes to MailHog  
- **Testing** (`NODE_ENV=test` or `NODE_ENV=ci`): Routes to MailHog
- **Manual Control**: Set `USE_MAILHOG=true` to force MailHog usage

### MailHog Service

In `docker-compose.dev.yml`:

```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: agentis-mailhog
  ports:
    - "1025:1025"  # SMTP server
    - "8025:8025"  # Web UI
```

### How It Works in Tests

1. **Email Capture**: When tests run, all emails are sent to MailHog on port 1025
2. **API Access**: Tests use the MailHog API on port 8025 to retrieve emails
3. **Magic Link Extraction**: The `mailhog.js` utility extracts magic links from the HTML email body

### Email Testing Helper Functions

The e2e tests use MailHog to capture and verify emails:

```typescript
// Helper to capture magic link using MailHog
async function captureMagicLink(email: string): Promise<string | null> {
  const { createMailHog } = await import('../utils/mailhog.js');
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
```

### MailHog Utilities

The `mailhog.js` utility provides several methods:

- **`getMessages()`**: Retrieve all emails from MailHog
- **`getLatestMessage(email)`**: Get the most recent email for a specific address
- **`extractMagicLink(message)`**: Extract magic link URL from email HTML
- **`waitForMagicLink(email, timeout)`**: Wait for and extract magic link
- **`clearMessages()`**: Clear all emails from MailHog
- **`getMessageCount()`**: Get total number of emails

### Magic Link Extraction

The utility handles various email encoding formats:

```javascript
// Handles HTML entities and quoted-printable encoding
body = body
  .replace(/=\r\n/g, '') // Remove quoted-printable line breaks
  .replace(/&#x3D;/g, '=') // Decode &#x3D; to =
  .replace(/&amp;/g, '&') // Decode &amp; to &
  .replace(/&quot;/g, '"') // Decode &quot; to "
  .replace(/=3D/g, '=') // Decode quoted-printable =3D to =
  .replace(/\r\n/g, ' '); // Replace line breaks with spaces
```

### Benefits of MailHog in Development

1. **Safety**: No accidental emails sent to real users during development
2. **Easy Testing**: All emails visible in MailHog's web UI at http://localhost:8025
3. **Consistency**: Same email testing experience across development and test environments
4. **Debugging**: Full access to email headers, content, and attachments

### Accessing Emails in Development

```bash
# Ensure MailHog is running
docker-compose -f docker-compose.dev.yml up -d mailhog

# Access MailHog UI
open http://localhost:8025

# All emails sent by the application will appear here
```

## OAuth Integration Testing

### OAuth Helper Functions

The framework provides different OAuth authentication patterns:

```typescript
// Initial authentication (first-time service connection)
export async function handleInitialAuth(
  page: Page,
  serviceName: GoogleService,
  credentials = GOOGLE_CREDS
): Promise<Page> {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: `Connect ${serviceName}` }).click();
  const popup = await popupPromise;

  await popup.getByRole('textbox', { name: 'Email or phone' }).fill(credentials.email);
  await popup.getByRole('button', { name: 'Next' }).click();
  await popup.getByRole('textbox', { name: 'Enter your password' }).fill(credentials.password);
  await popup.getByRole('button', { name: 'Next' }).click();

  return popup;
}

// Existing account (already authenticated, 2 Continue buttons)
export async function handleExistingAccountAuth(
  page: Page,
  serviceName: GoogleService
): Promise<Page> {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: `Connect ${serviceName}` }).click();
  const popup = await popupPromise;

  await popup.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
  await popup.getByRole('button', { name: 'Continue' }).click();
  await popup.getByRole('button', { name: 'Continue' }).click(); // Second Continue

  return popup;
}

// Existing account (single Continue button pattern)
export async function handleExistingAccountAuthSingle(
  page: Page,
  serviceName: GoogleService
): Promise<Page> {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: `Connect ${serviceName}` }).click();
  const popup = await popupPromise;

  await popup.getByRole('link', { name: 'Agentis Hall agentis.test@' }).click();
  await popup.getByRole('button', { name: 'Continue' }).click(); // Only one Continue

  return popup;
}
```

### OAuth Test Patterns

Tests use aria snapshots to verify authentication states:

```typescript
// Verify authentication required state
await expect(page.getByRole('main')).toMatchAriaSnapshot(`
  - img
  - text: Authentication Required
  - paragraph: "This conversation uses tools that require authentication:"
  - button "Connect Google Drive"
  - button "Connect Google Docs"
  - button "Connect Google Sheets"
`);

// After successful authentication
await expect(page.getByRole('main')).toMatchAriaSnapshot(`
  - img
  - text: Authentication Required
  - paragraph: "This conversation uses tools that require authentication:"
  - button "✓ Connected" [disabled]
  - button "✓ Connected" [disabled]
  - button "✓ Connected" [disabled]
`);
```

## MCP (Model Context Protocol) Testing

### Service-Specific Testing

Each Google service follows a similar testing pattern:

1. **Agent Creation**: Create agent with specific service tools
2. **Authentication**: Handle OAuth popup flows
3. **Functionality**: Test service-specific operations
4. **Error Handling**: Verify graceful error handling

### Example: Google Calendar MCP Testing

```typescript
test('Create Google Calendar Agent', async ({ browser }) => {
  // Create agent with calendar-specific instructions
  await page.getByRole('textbox', { name: 'Agent instructions' }).fill(
    'You are a scheduling optimization expert who helps users make the most of their time. When creating events, include all relevant details (location, description, attendees) and provide calendar links. Proactively identify scheduling conflicts and suggest alternatives...'
  );

  // Add Google Calendar tools
  await page.getByRole('button', { name: 'Add Google Calendar' }).click();
  await page.getByRole('checkbox', { name: 'Select all tools' }).check();
  await page.getByRole('button', { name: 'Add Selected' }).click();

  // Set as featured agent
  await page.getByTestId('featured-toggle').click();
  await page.getByRole('button', { name: 'Save' }).click();
});
```

### Notion MCP Integration

Notion requires different authentication handling:

```typescript
export async function handleInitialNotionAuth(
  page: Page,
  serviceName: GoogleService,
  credentials = GOOGLE_CREDS
): Promise<Page> {
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: `Connect ${serviceName}` }).click();
  const popup = await popupPromise;

  // Notion uses Composio for OAuth, which has a Google integration
  const popup2Promise = popup.waitForEvent('popup');
  await popup.getByRole('button', { name: 'Continue with Google' }).click();
  const popup2 = await popup2Promise;

  await popup2.getByRole('textbox', { name: 'Email or phone' }).fill(credentials.email);
  await popup2.getByRole('button', { name: 'Next' }).click();
  await popup2.getByRole('textbox', { name: 'Enter your password' }).fill(credentials.password);
  await popup2.getByRole('button', { name: 'Next' }).click();
  
  // Notion-specific permissions
  await popup.getByRole('button', { name: 'Select pages' }).click();
  await popup.getByRole('button', { name: 'Allow access' }).click();

  return popup;
}
```

## Fixtures and Storage

### Browser Storage States

The `fixtures/` directory contains browser storage states for test sessions:

```
fixtures/
├── storageState-test-1750952561531-t34lmtp.json    # Test session data
├── storageState-test-1750952561549-9glg4ol.json    # Another test session
└── storageState-test-*.json                        # Additional sessions
```

Each storage state file contains:
- Session cookies
- localStorage data
- sessionStorage data
- IndexedDB state

### Data Directory

The `data/` directory contains test execution data:

```
data/
├── codegen-auth.json       # Generated authentication data
├── logs.json              # Test execution logs
└── violations.json        # Security violation tracking
```

### Log Management

Test logging uses structured output:

```typescript
// testLogger.ts
export function logProgress(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

// Usage in tests
logProgress('🚀 Starting basic prompt creation test...');
logProgress('✅ Prompt created successfully');
logProgress('⚠️ Cleanup failed for user');
```

## Writing New Tests

### Standard Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';
import { 
  createTestUserWithOrganization, 
  cleanupTestUser, 
  generateTestId, 
  type TestAuthResult 
} from '../utils/testAuth';

test.use({
  viewport: { width: 1600, height: 1700 } // Consistent large viewport
});

test.describe.configure({ mode: 'default' }); // Tests run in order

test.describe('My Feature Tests', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user: ${testAuth.user.email} with org: ${testAuth.organization.name}`);
  });

  test.afterAll(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Cleanup failed for user ${testAuth.user.email}: ${error}`);
        // Don't throw to avoid masking test failures
      }
    }
  });

  test('should perform specific action', async ({ browser }) => {
    logProgress('🚀 Starting feature test...');
    
    const context = await browser.newContext();
    await context.addCookies([{
      name: 'better-auth.session_token',
      value: testAuth.session.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    }]);
    
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3080/');
      await expect(page).toHaveURL(/.*\/c\/new/);
      logProgress('📱 Navigated to application and verified authentication');
      
      // Test implementation here
      
      logProgress('✅ Test completed successfully!');
    } finally {
      await context.close();
    }
  });
});
```

### Test Data Management

1. **Unique Test Data**: Always use `generateTestId()` for unique test data
2. **Sequential Cleanup**: Clean up in proper order (sessions → memberships → organizations → users)
3. **Error Handling**: Don't throw in cleanup to avoid masking test failures

### Best Practices for Element Interaction

1. **Use Test IDs**: Prefer `getByTestId()` for stable elements:
   ```typescript
   await page.getByTestId('text-input').fill('Hello world');
   await page.getByTestId('send-button').click();
   ```

2. **Role-based Selection**: Use semantic selectors when possible:
   ```typescript
   await page.getByRole('button', { name: 'Create Prompt' }).click();
   await page.getByRole('textbox', { name: 'Agent name' }).fill('My Agent');
   ```

3. **Wait for Elements**: Always wait for dynamic content:
   ```typescript
   await expect(page.getByText('Expected text')).toBeVisible({ timeout: 10000 });
   ```

4. **Aria Snapshots**: Use for complex page state verification:
   ```typescript
   await expect(page.getByRole('main')).toMatchAriaSnapshot(`
     - heading "Expected Heading"
     - button "Expected Button"
     - text: "Expected text content"
   `);
   ```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find and kill process using port 3080
lsof -ti:3080 | xargs kill -9

# Alternative: use netstat
netstat -tulpn | grep :3080
kill -9 <PID>
```

#### 2. MongoDB Connection Issues
```bash
# Check MongoDB is running
docker ps | grep mongo

# Check connection with proper auth
MONGO_URI=mongodb://admin:password@localhost:27017/Agentis?authSource=admin

# Test connection
mongo "mongodb://admin:password@localhost:27017/Agentis?authSource=admin"
```

#### 3. Better Auth Errors
```bash
# Check Better Auth server is responding
curl http://localhost:3080/api/auth/health

# Verify session creation
curl -X POST http://localhost:3080/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

#### 4. Test Timeouts
```typescript
// Increase specific test timeout
test.setTimeout(300000); // 5 minutes

// Increase assertion timeout
await expect(element).toBeVisible({ timeout: 30000 });

// Global timeout in config
timeout: 5 * 60 * 1000,
```

#### 5. Build Issues
```bash
# Clean rebuild required after changes
./scripts/dev.sh --clean

# Rebuild specific packages
npm run build:data-provider
npm run build:data-schemas
npm run build:mcp

# Verify build outputs
ls -la packages/*/dist/
```

### Debug Strategies

#### 1. Playwright Inspector
```bash
# Run with inspector
npm run e2e:debug

# Or specific test
npx playwright test --debug e2e/specs/agent-cta-display.spec.ts
```

#### 2. Verbose Logging
```bash
# Playwright API debugging
DEBUG=pw:api npm run e2e

# Browser debugging
DEBUG=pw:browser npm run e2e

# Full debugging
DEBUG=* npm run e2e 2>&1 | grep -E "(pw:|testAuth|logProgress)"
```

#### 3. Visual Debugging
```typescript
// Take screenshots at key points
await page.screenshot({ path: 'debug-step1.png' });

// Enable video recording
use: {
  video: 'on', // Always record
  trace: 'on', // Always trace
}

// Pause execution for manual inspection
await page.pause();
```

#### 4. Authentication Debugging
```typescript
// Log session details
console.log('Session token:', testAuth.session.sessionToken);
console.log('User ID:', testAuth.user.id);
console.log('Organization ID:', testAuth.organization.id);

// Verify API endpoints
const response = await fetch('http://localhost:3080/api/auth/organization/list', {
  headers: { Cookie: `better-auth.session_token=${sessionToken}` }
});
console.log('Org list response:', await response.json());
```

### Error Patterns and Solutions

#### Authentication Required Loop
```typescript
// Problem: Test gets stuck showing authentication required
// Solution: Verify session token and terms acceptance

// Check if terms are accepted
const termsResponse = await fetch('http://localhost:3080/api/user/terms/accept', {
  method: 'POST',
  headers: { Cookie: `better-auth.session_token=${sessionToken}` }
});

// Verify session is valid
const sessionCheck = await fetch('http://localhost:3080/api/auth/session', {
  headers: { Cookie: `better-auth.session_token=${sessionToken}` }
});
```

#### Element Not Found
```typescript
// Problem: Elements not found due to timing
// Solution: Use proper waits and error handling

try {
  await page.getByRole('button', { name: 'Create New Agent' }).click({ timeout: 5000 });
} catch (e) {
  console.log('Create New Agent button not found, continuing...');
  // Button might not exist in current state, continue with test
}
```

#### Google OAuth Failures
```typescript
// Problem: OAuth popup handling fails
// Solution: Add proper popup management

// Wait for popup with longer timeout
const popupPromise = page.waitForEvent('popup', { timeout: 30000 });
await page.getByRole('button', { name: 'Connect Google Drive' }).click();

try {
  const popup = await popupPromise;
  // Handle OAuth flow
} catch (error) {
  console.log('OAuth popup failed to appear:', error);
  // Handle gracefully - may be already authenticated
}
```

## Best Practices

### Test Design Principles

1. **Test Isolation**: Each test suite creates its own data
2. **Idempotency**: Tests can run multiple times with same results
3. **Cleanup**: Always clean up test data, even on failure
4. **Logging**: Use consistent progress logging with emojis for clarity

### Performance Optimization

1. **Parallel Execution**: Use workers when possible
2. **Targeted Testing**: Use test.only during development
3. **Smart Waits**: Prefer explicit waits over fixed timeouts
4. **Resource Management**: Always close contexts and cleanup data

### Code Quality

1. **TypeScript**: Use proper types for all test data
2. **Reusable Utilities**: Extract common operations to utils
3. **Error Handling**: Graceful failures with clear error messages
4. **Documentation**: Comment complex test logic and workarounds

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    # Start MongoDB
    docker-compose -f docker-compose.dev.yml up -d mongodb
    
    # Install dependencies and browsers
    npm ci
    npx playwright install chromium
    
    # Run tests
    npm run e2e:ci
  env:
    MONGO_URI: mongodb://admin:password@localhost:27017/Agentis?authSource=admin
    GOOGLE_TEST_ACCOUNT_1_EMAIL: ${{ secrets.GOOGLE_TEST_EMAIL }}
    GOOGLE_TEST_ACCOUNT_1_PASSWORD: ${{ secrets.GOOGLE_TEST_PASSWORD }}
    CI: true
```

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Better Auth Documentation](https://better-auth.com/)
- [Agentis Main README](../README.md)
- [LibreChat E2E Testing](https://docs.librechat.ai/dev/testing)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
- [Composio MCP Documentation](https://docs.composio.dev/)