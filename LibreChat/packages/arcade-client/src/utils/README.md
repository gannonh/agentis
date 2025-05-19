# Utils Module

This module provides utility functions and helpers used throughout the Arcade client.

## Components

### API Utilities

Helper functions for API operations:

- Request formatting
- Response parsing
- Error handling

### Authentication Utilities

Utilities for authentication operations:

- Token management
- Authorization helpers
- Secure storage

### Common Utilities

General-purpose utilities:

- Object manipulation
- Type conversion
- Data validation

### Usage

```typescript
import {
  formatToolInput,
  parseToolOutput,
  createAuthorizationHeader,
  deepMerge
} from './index';

// Format tool input parameters
const formattedParams = formatToolInput('github.createIssue', params);

// Parse and process tool output
const result = parseToolOutput(response);

// Create authorization header
const headers = createAuthorizationHeader(apiKey);

// Deep merge objects
const merged = deepMerge(defaultConfig, userConfig);
```

## Key Features

1. **Type Safety**: All utilities are fully typed
2. **Error Handling**: Consistent error handling patterns
3. **Performance**: Optimized for performance
4. **Testability**: Designed for easy unit testing

## Helper Categories

The utilities are organized into categories:

1. **String Utilities**: String manipulation and formatting
2. **Object Utilities**: Object manipulation and transformation
3. **Network Utilities**: Network request and response helpers
4. **Validation Utilities**: Data validation functions
5. **Security Utilities**: Security-related helpers

## Error Handling

Utilities handle errors consistently:

- Clear error messages
- Error categorization
- Stack trace preservation

## Integration

These utilities are used throughout the codebase:

- By the `api` module for request handling
- By the `auth` module for authentication
- By the `tools` module for parameter processing