# Testing Documentation

## Overview

The LibreChat API has transitioned from Jest to Vitest for a modern, ESM-native testing experience. This change supports our ESM conversion and provides better performance and developer experience.

## Test Structure

### Current Testing Approach

**New Tests (ESM + Vitest)**

- Located alongside source files or in dedicated test directories
- Written with ESM imports and Vitest APIs
- Use .vitest.js for new tests: `**/*.vitest.{js,mjs,ts}`

**Legacy Tests (CommonJS + Jest)**

- Existing test files using Jest and CommonJS `require()`
- Currently excluded from test runs via Vitest configuration
- Will be converted to ESM/Vitest as we refactor related code
- Located in:
  - `app/clients/specs/`
  - `models/__tests__/`
  - `server/services/`
  - etc.

## Running Tests

### Commands

```bash
# Run tests in watch mode (only new ESM tests)
npm test

# Run tests once (only new ESM tests)
npm run test:run

# Run tests with UI interface
npm run test:ui

# Run tests for CI with verbose output
npm run test:ci

# Run tests with coverage report
npm run test:coverage
```

**Note**: All test commands only run new ESM tests. Legacy CommonJS tests are excluded via Vitest configuration to avoid mixing test frameworks during development.

### Configuration

Tests are configured via `vitest.config.js`:

- **Include**: Only new ESM test files
- **Exclude**: Legacy CommonJS test files
- **Path aliases**: Supports our `#` import system
- **Environment**: Node.js environment
- **Coverage**: V8 provider with HTML reports

## Writing New Tests

### Basic Structure

```javascript
import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('Component Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should do something', () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

### Mocking

Use Vitest's `vi` object for mocking:

```javascript
// Mock a module
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock function
const mockFunction = vi.fn();
mockFunction.mockReturnValue('test');
```

### Path Aliases

Use the configured path aliases in tests:

```javascript
import { logger } from '#config/index.js';
import { User } from '#models/User.js';
import { validateRequest } from '#server/middleware/index.js';
```

## Migration Strategy

### For New Features

- Write tests using Vitest and ESM
- Follow the patterns established in existing new tests
- Use modern testing practices and APIs

### For Existing Code

- Convert tests to Vitest/ESM when refactoring related code
- Don't spend time converting tests for code that isn't being modified
- Focus testing effort on new and modified functionality

## Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain expected behavior
- Keep tests focused and atomic

### Mocking

- Mock external dependencies consistently
- Clear mocks between tests with `vi.clearAllMocks()`
- Use `vi.resetModules()` when testing module imports

### Coverage

- Focus on testing business logic and integration points
- Aim for meaningful coverage rather than 100% line coverage
- Include edge cases and error scenarios

## Examples

### Unit Test Example

```javascript
import { describe, test, expect, vi } from 'vitest';
import { validateEmail } from '#utils/validation.js';

describe('validateEmail', () => {
  test('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  test('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### Integration Test Example

```javascript
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('#config/index.js', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

describe('Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should handle successful operation', async () => {
    // Test implementation
  });
});
```

## Future Improvements

1. **Parallel Test Execution**: Optimize test configuration for better performance
2. **Test Utilities**: Create shared test utilities for common patterns
3. **E2E Integration**: Consider adding API-level integration tests
4. **Coverage Reporting**: Implement coverage thresholds and reporting
5. **Legacy Migration**: Gradually convert legacy tests as code is refactored
