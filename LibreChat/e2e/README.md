# E2E Testing Foundation

This document describes the modular E2E testing architecture for LibreChat, designed to support multiple authentication methods and specialized testing scenarios.

## Architecture Overview

The E2E testing framework uses a modular approach where each authentication method has its own dedicated configuration, setup, and teardown processes. This allows for isolated, reliable testing of different user flows without interference.

## Directory Structure

```
e2e/
├── specs/                          # Test specifications
│   ├── google.mcp.spec.ts          # Google auth + MCP functionality tests
│   └── [future: facebook.auth.spec.ts, github.auth.spec.ts, etc.]
├── setup/                          # Setup and teardown utilities
│   ├── google-setup.ts             # Google account registration/login
│   ├── google-teardown.ts          # Google user cleanup
│   ├── cleanupUser.ts              # Shared user cleanup utility
│   └── authenticate.ts             # Shared authentication utility
├── playwright.config.google.ts     # Google-specific test configuration
└── README.md                       # This documentation
```

## Test Types

### Google MCP Tests (`google.mcp.spec.ts`)

**Purpose**: Tests Google authentication flow and MCP (Model Context Protocol) functionality

**Environment Variables Required**:
- `GOOGLE_TEST_ACCOUNT_1_EMAIL` - Google test account email
- `GOOGLE_TEST_ACCOUNT_1_PASSWORD` - Google test account password

**Test Flow**:
1. Google setup handles user registration/login
2. Test verifies successful authentication and landing page
3. Additional MCP-specific tests can be added
4. Google teardown cleans up test user and browser state

**Command**: `npm run e2e:google-mcp`

## Configuration Files

### `playwright.config.google.ts`

Dedicated configuration for Google authentication tests with:
- Test server on port 3081 (avoids conflicts with dev servers)
- Google-specific setup (`google-setup.ts`)
- Google-specific teardown (`google-teardown.ts`)
- Test environment variables and security settings

## Setup and Teardown Process

### Setup Phase (`google-setup.ts`)
1. Reads Google test credentials from environment variables
2. Registers/authenticates the Google test user
3. Saves authentication state for test reuse

### Test Phase (`google.mcp.spec.ts`)
1. Navigates to the application
2. Handles Terms of Service modal if present
3. Verifies successful authentication
4. Runs MCP-specific functionality tests

### Teardown Phase (`google-teardown.ts`)
1. Deletes the Google test user from database
2. Cleans up conversations and messages (with graceful error handling)
3. Clears browser storage and cookies
4. Ensures clean state for subsequent test runs

## Environment Configuration

### Required Environment Variables

```bash
# Google Test Account (for Google auth tests)
GOOGLE_TEST_ACCOUNT_1_EMAIL="your-google-test@gmail.com"
GOOGLE_TEST_ACCOUNT_1_PASSWORD="your-secure-password"
```

### Port Configuration

- **Dev Client**: port 3090 (`npm run frontend:dev`)
- **Dev API**: port 3080 (`npm run backend:dev`)
- **Test Server**: port 3081 (spawned by test configuration)

## Running Tests

### Google MCP Tests
```bash
npm run e2e:google-mcp
```

### All E2E Tests
```bash
npm run e2e
```

### Debug Mode
```bash
npm run e2e:debug
```

## Adding New Authentication Types

To add a new authentication method (e.g., Facebook, GitHub):

1. **Create test file**: `e2e/specs/facebook.auth.spec.ts`
2. **Create setup**: `e2e/setup/facebook-setup.ts`
3. **Create teardown**: `e2e/setup/facebook-teardown.ts`
4. **Create config**: `e2e/playwright.config.facebook.ts`
5. **Add environment variables** for Facebook test account
6. **Add npm script**: `"e2e:facebook": "playwright test --config=e2e/playwright.config.facebook.ts e2e/specs/facebook.auth.spec.ts --headed"`

### Template Structure

```typescript
// facebook-setup.ts
async function facebookSetup(config: FullConfig) {
  const user = {
    name: 'Facebook Test User',
    email: String(process.env.FACEBOOK_TEST_ACCOUNT_EMAIL),
    password: String(process.env.FACEBOOK_TEST_ACCOUNT_PASSWORD),
  };
  await authenticate(config, user);
}

// facebook-teardown.ts
async function facebookTeardown() {
  const facebookTestUser = {
    email: process.env.FACEBOOK_TEST_ACCOUNT_EMAIL,
    password: process.env.FACEBOOK_TEST_ACCOUNT_PASSWORD
  };
  await cleanupUser(facebookTestUser);
  // Clear browser state...
}
```

## Best Practices

### Test Isolation
- Each authentication method uses its own test user
- Dedicated setup/teardown prevents cross-test contamination
- Separate configurations avoid port conflicts

### Error Handling
- Graceful handling of "no conversations to delete" during teardown
- Try-catch blocks for optional UI elements (TOS modal)
- Robust user cleanup that handles missing data

### Environment Management
- Use specific environment variable names for each auth type
- Document required variables for each test suite
- Fail fast if required environment variables are missing

### Port Management
- Dev servers: 3080 (API), 3090 (Client)
- Test servers: 3081+ (avoid conflicts)
- Each test type can use its own port if needed

## Troubleshooting

### Common Issues

**Port Conflicts**
```bash
# Kill processes using conflicting ports
lsof -ti:3080 | xargs kill -9
lsof -ti:3081 | xargs kill -9
```

**User Already Exists**
- Teardown process automatically handles user cleanup
- If tests fail mid-run, manually run teardown or clear database

**Terms of Service Modal**
- Test includes automatic TOS handling
- Modal only appears in test environment, not dev environment

**API Fetch Errors**
- 401 errors for Mistral/Portkey APIs are normal in test environment
- These don't affect authentication testing

## Future Enhancements

1. **Parallel Test Execution**: Run different auth types simultaneously
2. **Cross-Auth Testing**: Test switching between authentication methods
3. **Social Login Testing**: Direct OAuth flow testing
4. **Mobile Testing**: Responsive design validation
5. **Performance Testing**: Authentication flow timing validation

## Related Documentation

- [LibreChat Configuration](../README.md)
- [Authentication Setup](../docs/authentication.md)
- [MCP Integration](../docs/mcp.md)
- [Playwright Documentation](https://playwright.dev/)