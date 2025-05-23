# LibreChat End-to-End Testing Framework

This directory contains the End-to-End (E2E) testing framework for LibreChat, built with [Playwright](https://playwright.dev/). The framework supports modular testing configurations for different authentication methods, accessibility testing, and comprehensive UI testing.

## Overview

The E2E testing framework is designed with modularity and isolation in mind. Each authentication method and test scenario has its own dedicated configuration, setup, and teardown processes. This ensures reliable testing across different user flows without test interference.

## Directory Structure

```
e2e/
├── config.local.example.ts         # Example local user configuration
├── config.local.ts                 # Local user configuration (gitignored)
├── jestSetup.js                    # Jest configuration for Playwright tests
├── playwright.config.ts            # Main Playwright configuration
├── playwright.config.a11y.ts       # Accessibility testing configuration
├── playwright.config.google.ts     # Google authentication testing configuration
├── playwright.config.local.ts      # Local testing configuration
├── setup/                          # Setup and teardown utilities
│   ├── authenticate.ts             # Shared authentication utility
│   ├── cleanupUser.ts             # Shared user cleanup utility
│   ├── global-setup.ts            # Global setup for main tests
│   ├── global-setup.local.ts      # Global setup for local tests
│   ├── global-teardown.ts         # Global teardown for main tests
│   ├── global-teardown.local.ts   # Global teardown for local tests
│   ├── google-setup.ts            # Google-specific setup
│   └── google-teardown.ts         # Google-specific teardown
├── specs/                         # Test specifications
│   ├── a11y.spec.ts              # Accessibility tests
│   ├── google.mcp.spec.ts        # Google auth + MCP tests
│   ├── keys.spec.ts              # API key management tests
│   ├── landing.spec.ts           # Landing page tests
│   ├── messages.spec.ts          # Message functionality tests
│   ├── nav.spec.ts               # Navigation tests
│   ├── popup.spec.ts             # Popup/modal tests
│   └── settings.spec.ts          # Settings page tests
└── types.ts                      # TypeScript type definitions
```

## Test Configurations

### Main Configuration (`playwright.config.ts`)
- Default configuration for running all E2E tests
- Uses port 3080 for the test server
- Supports Chrome/Chromium browser
- Includes automatic server startup with specific CI environment settings

### Local Configuration (`playwright.config.local.ts`)
- For local development testing
- Uses port 3081 to avoid conflicts with development servers
- Disabled rate limiting and security restrictions for easier testing
- Uses local user credentials from `config.local.ts`

### Google Configuration (`playwright.config.google.ts`)
- Dedicated configuration for Google OAuth authentication testing
- Uses Google test account credentials from environment variables
- Port 3080 for consistency with main configuration
- Includes Google-specific setup and teardown processes

### Accessibility Configuration (`playwright.config.a11y.ts`)
- Configuration for accessibility (a11y) testing
- Uses axe-core for automated accessibility scanning
- Tests various UI components for WCAG compliance

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (for Google tests):
```bash
# .env file
GOOGLE_TEST_ACCOUNT_1_EMAIL="your-google-test@gmail.com"
GOOGLE_TEST_ACCOUNT_1_PASSWORD="your-secure-password"
```

3. Create local user configuration (for local tests):
```bash
cp e2e/config.local.example.ts e2e/config.local.ts
# Edit config.local.ts with your test user details
```

### Available Commands

```bash
# Run all E2E tests
npm run e2e

# Run tests with visible browser
npm run e2e:headed

# Run Google MCP tests
npm run e2e:google-mcp

# Run accessibility tests
npm run e2e:a11y

# Run tests in CI mode
npm run e2e:ci

# Debug tests
npm run e2e:debug

# Generate test code with Playwright codegen
npm run e2e:codegen

# View test report
npm run e2e:report
```

## Test Suites

### Authentication Tests
- **Google MCP Tests** (`google.mcp.spec.ts`): Tests Google OAuth authentication flow and Model Context Protocol (MCP) functionality
- Future: Support for Facebook, GitHub, and other OAuth providers

### Core Functionality Tests
- **Messages** (`messages.spec.ts`): Tests message creation, editing, streaming, stopping, and continuing
- **Navigation** (`nav.spec.ts`): Tests navigation between conversations and pages
- **Settings** (`settings.spec.ts`): Tests user settings and preferences
- **Landing Page** (`landing.spec.ts`): Tests initial page load and user experience

### UI/UX Tests
- **Popups** (`popup.spec.ts`): Tests modal dialogs and popup interactions
- **API Keys** (`keys.spec.ts`): Tests API key management functionality
- **Accessibility** (`a11y.spec.ts`): Automated accessibility testing using axe-core

## Setup and Teardown Process

### Authentication Flow
1. **Setup Phase**:
   - Reads test user credentials (from env vars or config)
   - Registers/authenticates the test user
   - Saves authentication state for test reuse
   - Sets localStorage values (e.g., nav visibility)

2. **Test Execution**:
   - Uses saved authentication state
   - Handles Terms of Service modal if present
   - Executes test scenarios

3. **Teardown Phase**:
   - Deletes test user from database
   - Cleans up conversations and messages
   - Clears browser storage and cookies
   - Ensures clean state for next test run

### User Cleanup
The `cleanupUser` utility handles comprehensive cleanup:
- Deletes all user conversations and messages
- Removes user sessions
- Deletes user account, balance, and transaction records
- Gracefully handles missing data (e.g., new users with no conversations)

## Environment Configuration

### Port Configuration
- **Development API**: 3080
- **Development Client**: 3090  
- **Test Server (main)**: 3080
- **Test Server (local)**: 3081

### Environment Variables
The test server runs with specific environment variables to ensure consistent testing:
- `NODE_ENV=CI`: Marks environment as CI/testing
- `ALLOW_REGISTRATION=true`: Enables user registration
- `SESSION_EXPIRY=60000`: Short session for testing
- Various rate limiting settings disabled for testing

## Adding New Test Scenarios

### Adding a New Authentication Provider
1. Create test specification: `e2e/specs/[provider].auth.spec.ts`
2. Create setup script: `e2e/setup/[provider]-setup.ts`
3. Create teardown script: `e2e/setup/[provider]-teardown.ts`
4. Create configuration: `e2e/playwright.config.[provider].ts`
5. Add environment variables for test account
6. Add npm script to package.json

### Example Template
```typescript
// facebook-setup.ts
import authenticate from './authenticate';
import type { FullConfig } from '@playwright/test';

async function facebookSetup(config: FullConfig) {
  const user = {
    name: 'Facebook Test User',
    email: String(process.env.FACEBOOK_TEST_ACCOUNT_EMAIL),
    password: String(process.env.FACEBOOK_TEST_ACCOUNT_PASSWORD),
  };
  await authenticate(config, user);
}

export default facebookSetup;
```

## Best Practices

### Test Isolation
- Each test should be independent and not rely on state from other tests
- Use dedicated test users for different authentication methods
- Clean up all test data after each test run

### Error Handling
- Gracefully handle optional UI elements (e.g., TOS modal)
- Include try-catch blocks for non-critical operations
- Log helpful error messages for debugging

### Performance
- Use `fullyParallel: false` on Windows to avoid issues
- Consider enabling parallel execution on macOS/Linux for faster tests
- Use `waitForTimeout` sparingly - prefer explicit waits

### Debugging
- Use `npm run e2e:debug` for step-by-step debugging
- Enable video recording and traces for failed tests
- Check `playwright-report` for detailed test results

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process using port
lsof -ti:3080 | xargs kill -9
lsof -ti:3081 | xargs kill -9
```

**User Already Exists**
- The setup process handles existing users by deleting and recreating them
- If issues persist, manually clear the database

**Terms of Service Modal**
- Tests automatically handle the TOS modal
- Modal only appears in test environment, not in development

**Authentication Failures**
- Verify environment variables are set correctly
- Check that test accounts have proper permissions
- Ensure authentication endpoints are accessible

**Timeout Errors**
- Increase timeout values in test configuration
- Check server startup logs for errors
- Verify database connection is established

## CI/CD Integration

The E2E tests are designed to run in CI environments:
- Automatic retries on failure (2 retries in CI)
- Headless browser execution
- Single worker to ensure stability
- HTML reports generated for test results

## Future Enhancements

1. **Additional Auth Providers**: Facebook, GitHub, Discord, etc.
2. **Performance Testing**: Page load times, response times
3. **Visual Regression Testing**: Screenshot comparison
4. **Mobile Testing**: Responsive design validation
5. **API Testing**: Direct API endpoint testing
6. **Load Testing**: Multi-user scenarios
7. **Cross-browser Testing**: Safari, Firefox support

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [LibreChat Main Documentation](../README.md)
- [Authentication Setup Guide](../docs/configuration/authentication)
- [MCP Integration Guide](../docs/configuration/mcp)