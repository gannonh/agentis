# UI Components for Arcade Integration

This directory contains UI components and utilities for integrating Arcade toolkits into a web application.

## Overview

The UI module provides components for:

1. **Toolkit Mapping**: Convert Arcade API responses to UI-friendly formats
2. **Toolkit Selection**: Display and filter available toolkits
3. **Authentication Flow**: Manage OAuth authentication flows
4. **Event Handling**: Handle authentication events and callbacks

## Components

### Toolkit Mapper

The toolkit mapper converts Arcade API responses to formats suitable for UI components.

```typescript
import { mapToolkitToUIComponent, mapToolkitsToAgentisTool } from './toolkitMapper';

// Map a toolkit config to UI format
const uiConfig = mapToolkitToUIComponent(toolkitConfig);

// Map toolkit with tools to Agentis tool format
const agentisTool = mapToolkitsToAgentisTool(toolkitConfig, toolsList);
```

### Toolkit Selector

The toolkit selector provides methods for displaying and filtering available toolkits.

```typescript
import { createToolkitSelector } from './ToolkitSelector';

// Create a toolkit selector
const selector = createToolkitSelector({
  toolkits: uiToolkits,
  authStatus: authStatusMap,
  onStartAuth: startAuthCallback,
  onCheckAuth: checkAuthCallback,
});

// Get available toolkits
const allToolkits = selector.getAvailableToolkits();
const developerTools = selector.getAvailableToolkits('Developer Tools');

// Get authenticated toolkits
const authenticatedToolkits = selector.getAuthenticatedToolkits();

// Check if a toolkit is authenticated
const isGithubAuthenticated = selector.isAuthenticated('github');

// Start authentication
selector.startAuthentication('github');
```

### Authentication Flow

The authentication flow manages the OAuth flow for toolkit authentication.

```typescript
import { createAuthFlow, AuthFlowStatus } from './AuthFlow';

// Create an auth flow manager
const authFlow = createAuthFlow({
  onAuthStart: (toolkitId, response) => {
    // Handle auth start
  },
  onAuthError: (toolkitId, response) => {
    // Handle auth error
  },
  onAuthComplete: (toolkitId, response) => {
    // Handle auth completion
  },
});

// Start authentication for a toolkit
authFlow.startAuth('github', authResponse);

// Check auth status
authFlow.checkAuthStatus(authStatusResponse);

// Cancel authentication
authFlow.cancelAuth();

// Get active auth request
const activeRequest = authFlow.getActiveAuthRequest();

// Get auth status for a toolkit
const githubStatus = authFlow.getAuthStatus('github');
```

## Types

The `types.ts` file contains TypeScript types for UI components:

- `ArcadeUIToolkitConfig`: UI representation of a toolkit
- `ArcadeUIToolParameter`: Parameter definition for a tool
- `ArcadeUITool`: UI representation of a tool within a toolkit
- `ArcadeAgentisTool`: Full Agentis tool definition with Arcade toolkit

## Integration

These components are designed to be framework-agnostic and can be integrated with React, Vue, Angular, or other frontend frameworks.

For a complete guide on integrating these components into a web application, see the [UI Integration Guide](../../docs/UI_INTEGRATION.md).

## Testing

Tests for UI components are located in the `__tests__` directory. Each component has its own test file:

- `toolkitMapper.test.ts`: Tests for toolkit mapping functions
- `ToolkitSelector.test.ts`: Tests for the toolkit selector
- `AuthFlow.test.ts`: Tests for the authentication flow

Run the tests with:

```bash
npm test
```

## Implementation Patterns

For more information on the implementation patterns used in these components, see the [Implementation Patterns](../../docs/IMPLEMENTATION_PATTERNS.md) documentation.