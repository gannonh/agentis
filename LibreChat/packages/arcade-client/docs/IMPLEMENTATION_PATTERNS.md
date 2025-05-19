# Arcade Client Implementation Patterns

This document explains the key implementation patterns used in the Arcade client library.

## Architectural Overview

The Arcade client library follows a modular architecture with several layers of abstraction:

1. **API Layer**: Handles communication with the Arcade API
2. **UI Layer**: Provides UI components and utilities for integration
3. **Configuration Layer**: Manages configuration loading and validation
4. **Authentication Layer**: Handles authentication flows and token management

### Directory Structure

```
src/
  ├── api/           # API client and endpoints
  ├── auth/          # Authentication utilities
  ├── config/        # Configuration loading and validation
  ├── tools/         # Toolkit-specific implementations
  ├── types/         # TypeScript type definitions
  ├── ui/            # UI components and utilities
  └── utils/         # Utility functions
```

## Key Design Patterns

### 1. Factory Functions Pattern

Instead of using classes with constructors, we use factory functions to create objects with methods.

```typescript
// Example: Creating a toolkit selector
export function createToolkitSelector(config: ToolkitSelectorConfig): ToolkitSelector {
  // ...implementation...
  
  return {
    getAvailableToolkits() { /* ... */ },
    getAuthenticatedToolkits() { /* ... */ },
    startAuthentication() { /* ... */ },
    // ...other methods...
  };
}
```

This approach provides several benefits:
- Simplifies object creation
- Provides clear encapsulation
- Makes testing easier
- Avoids `this` binding issues

### 2. Configuration Validation with Zod

We use Zod for runtime validation of configuration objects:

```typescript
// Example: Configuration validation
const configSchema = z.object({
  enabled: z.boolean(),
  api_key: z.string().min(1),
  callback_url: z.string().url(),
  hosting: z.enum(['cloud', 'hybrid', 'self_hosted']),
  // ...other fields...
});

export function validateConfig(config: unknown): z.SafeParseResult<ArcadeConfig> {
  return configSchema.safeParse(config);
}
```

Benefits:
- Runtime type safety
- Clear error messages for invalid configurations
- Self-documenting schemas

### 3. Mapper Functions for Data Transformation

We use mapper functions to transform data between different formats:

```typescript
// Example: Mapping Arcade toolkits to UI components
export function mapToolkitToUIComponent(toolkit: ArcadeToolkitConfig): ArcadeUIToolkitConfig {
  return {
    id: `arcade-${toolkit.id}`,
    name: toolkit.name,
    description: toolkit.description,
    category: toolkit.category,
    icon: toolkit.icon || 'default-icon.png',
    isArcade: true,
    arcadeToolkitId: toolkit.id,
    requiresAuth: true,
    authType: 'oauth',
    authProvider: 'arcade',
  };
}
```

Benefits:
- Clear separation of data structures
- Easy to adapt to changing APIs
- Isolates transformation logic

### 4. Callback-Based Event Handling

We use callback functions for event handling:

```typescript
// Example: Auth flow with callbacks
export function createAuthFlow({
  onAuthStart,
  onAuthError,
  onAuthComplete,
  // ...other config...
}) {
  // ...implementation...
  
  return {
    startAuth(toolkitId, response) {
      // ...logic...
      onAuthStart(toolkitId, response);
    },
    // ...other methods...
  };
}
```

Benefits:
- Decouples event generation from handling
- Allows for flexible integration with different UI frameworks
- Makes testing easier with mock callbacks

### 5. Environment-Aware Configuration

We load configuration from multiple sources with a priority order:

```typescript
// Example: Loading configuration
export function loadArcadeConfig(yamlConfig: Record<string, any> | null): ArcadeConfig {
  // Extract from YAML if available
  const yamlArcadeConfig = yamlConfig?.arcade || {};
  
  // Default configuration
  const defaultConfig = { /* defaults */ };
  
  // Environment variables take precedence
  const envEnabled = process.env.ARCADE_ENABLED === 'true' || undefined;
  const envApiKey = process.env.ARCADE_API_KEY;
  // ...other env vars...
  
  // Merge configurations with environment variables taking precedence
  const mergedConfig = {
    ...defaultConfig,
    ...yamlArcadeConfig,
    enabled: envEnabled !== undefined ? envEnabled : yamlArcadeConfig.enabled || defaultConfig.enabled,
    // ...other fields...
  };
  
  return mergedConfig;
}
```

Benefits:
- Flexible configuration from multiple sources
- Clear precedence rules
- Environment-specific overrides

### 6. Stateful Components with Persistence

We implement components that manage their own state and can persist it:

```typescript
// Example: Auth flow with state persistence
export function createAuthFlow(config) {
  // ...other implementation...
  
  // Active auth request with persistence
  let activeAuthRequest = null;
  
  // Try to restore from storage
  try {
    const storedAuth = localStorage.getItem(storageKey);
    if (storedAuth) {
      activeAuthRequest = JSON.parse(storedAuth);
      // ...process restored state...
    }
  } catch (error) {
    // ...handle errors...
  }
  
  // Save to storage
  const saveAuthRequest = () => {
    if (activeAuthRequest) {
      localStorage.setItem(storageKey, JSON.stringify(activeAuthRequest));
    } else {
      localStorage.removeItem(storageKey);
    }
  };
  
  return {
    // ...methods that update and persist state...
  };
}
```

Benefits:
- Maintains state across page refreshes
- Encapsulates persistence logic
- Clear boundaries for state management

## API Design Principles

### 1. Method Naming Conventions

- `get*`: Methods that retrieve data (e.g., `getTools`, `getAuthStatus`)
- `create*`: Factory functions that create objects (e.g., `createArcadeClient`, `createAuthFlow`)
- `map*`: Functions that transform data (e.g., `mapToolkitToUIComponent`)
- `execute*`: Methods that perform actions (e.g., `executeTool`)
- `start*`: Methods that initiate processes (e.g., `startAuth`)
- `check*`: Methods that verify status (e.g., `checkAuthStatus`)

### 2. Error Handling Strategy

- All API methods use try/catch blocks to handle errors
- Errors are logged for debugging
- User-friendly error messages are provided
- Error objects include contextual information
- Network errors are transformed into domain-specific errors

```typescript
// Example: Error handling in API calls
async function apiCall() {
  try {
    // ...API call logic...
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error(`Failed to perform API call: ${error.message}`);
  }
}
```

### 3. Validation Throughout the Stack

- Input validation at API boundaries
- Configuration validation with schemas
- Runtime type checking with TypeScript and Zod
- Defensive programming with null/undefined checks

## Testing Patterns

### 1. Component Testing

We test each component in isolation with mock dependencies:

```typescript
// Example: Testing a component
describe('Toolkit Selector', () => {
  // Mock dependencies
  const mockToolkits = [/* ...mock data... */];
  const mockAuthStatus = {/* ...mock data... */};
  const mockOnStartAuth = jest.fn();
  
  it('should filter toolkits by category', () => {
    const selector = createToolkitSelector({
      toolkits: mockToolkits,
      authStatus: mockAuthStatus,
      onStartAuth: mockOnStartAuth,
      // ...other config...
    });
    
    const filteredToolkits = selector.getAvailableToolkits('Developer Tools');
    expect(filteredToolkits).toHaveLength(1);
    expect(filteredToolkits[0].name).toBe('GitHub');
  });
});
```

### 2. Integration Testing

We test the integration between components:

```typescript
// Example: Testing integration between components
describe('Authentication Flow Integration', () => {
  // Setup components
  const client = createArcadeClient(mockConfig, 'user-123');
  const authFlow = createAuthFlow({/* ...config... */});
  const selector = createToolkitSelector({
    // ...config...
    authFlow: authFlow, // Components work together
  });
  
  it('should update auth status after successful authentication', async () => {
    // Simulate auth flow
    await selector.startAuthentication('github');
    // ...simulate auth completion...
    
    // Verify integration
    expect(selector.isAuthenticated('github')).toBe(true);
    expect(authFlow.getAuthStatus('github')).toBe(AuthFlowStatus.COMPLETED);
  });
});
```

### 3. Mock Implementations

We use Jest mock functions to test behavior:

```typescript
// Example: Testing with mocks
it('should call onAuthStart when authentication starts', () => {
  const mockOnAuthStart = jest.fn();
  const authFlow = createAuthFlow({
    onAuthStart: mockOnAuthStart,
    // ...other config...
  });
  
  authFlow.startAuth('github', mockResponse);
  
  expect(mockOnAuthStart).toHaveBeenCalledWith('github', mockResponse);
});
```

## Performance Optimization

### 1. Caching Strategies

- Toolkit definitions are cached to reduce API calls
- Authentication status is cached with TTL (Time To Live)
- Resource-intensive operations use memoization

### 2. Lazy Loading

- Components are loaded only when needed
- Expensive operations are deferred until required
- Configuration is loaded on demand

### 3. Batch Processing

- Multiple API calls are batched when possible
- State updates are batched to reduce rendering
- Authentication checks are throttled

## Security Best Practices

### 1. Token Handling

- Tokens are never exposed in URLs
- Tokens are stored securely (not in localStorage for sensitive tokens)
- Token refresh is handled automatically
- Token expiration is monitored

### 2. Input Validation

- All inputs are validated before use
- User-provided input is sanitized
- API parameters are checked for type and format

### 3. Error Message Security

- Sensitive information is stripped from error messages
- Different error messages for users vs. developers
- No stack traces in production error messages

## Conclusion

These implementation patterns provide a solid foundation for the Arcade client library. By following these patterns, we maintain a consistent, maintainable, and extendable codebase that can adapt to changing requirements and integrate with various frontend frameworks.

The focus on testability, type safety, and clear API design makes the library both robust and developer-friendly. As we continue to develop the library, these patterns help guide our decisions and ensure a consistent developer experience.