# Arcade Client for Agentis

A TypeScript client for interacting with the Arcade API, designed for integration with the Agentis platform.

## Overview

This package provides a strongly-typed client for interacting with Arcade's API for agentic tools. It enables authentication, tool execution, and toolkit management using TypeScript.

## Features

- Full TypeScript support with strict type checking
- Modern ESM module system
- Authentication flow management
- Tool and toolkit discovery
- Tool execution with proper error handling
- UI components for integration
- Configuration management
- Caching and performance optimization

## Installation

```bash
npm install @gannonh/arcade-client
```

## Usage

### Basic Setup

```typescript
import { createArcadeClient } from '@gannonh/arcade-client';

// Configuration
const config = {
  enabled: true,
  api_key: process.env.ARCADE_API_KEY,
  callback_url: 'https://your-callback-url.com',
  hosting: 'cloud',
  toolkits: [
    {
      id: 'github',
      name: 'GitHub',
      category: 'Developer Tools',
      description: 'GitHub integration'
    }
  ]
};

// Create client
const client = createArcadeClient(config, 'user-123');
```

### Discovering Available Tools

```typescript
// Get all tools
const allTools = await client.getTools();

// Get only enabled tools from config
const enabledTools = await client.getEnabledTools();
```

### Executing Tools

```typescript
// Execute a GitHub tool
const result = await client.executeTool('github.createIssue', {
  repository: 'user/repo',
  title: 'New Issue',
  body: 'This is a test issue'
});

if (result.success) {
  console.log('Issue created:', result.output?.value);
} else {
  console.error('Error creating issue:', result.output?.error);
}
```

### Authentication Flow

```typescript
// Start authentication flow for GitHub
const authResponse = await client.authorizeToolkit('github.*');

// Redirect user to auth URL
if (authResponse.status === 'pending' && authResponse.url) {
  // Redirect user to authResponse.url
}

// Check auth status
const status = await client.getAuthStatus(authResponse.id);
if (status.status === 'completed') {
  console.log('Authentication successful');
}
```

### UI Integration

The library provides UI components for integrating Arcade toolkits into your application:

```typescript
import { 
  createToolkitSelector, 
  createAuthFlow, 
  createCallbackHandler,
  mapToolkitToUIComponent 
} from '@gannonh/arcade-client';

// Create toolkit selector
const selector = createToolkitSelector({
  toolkits: arcadeToolkits,
  authStatus: authStatusMap,
  onStartAuth: startAuthCallback,
  onCheckAuth: checkAuthCallback,
});

// Create auth flow
const authFlow = createAuthFlow({
  onAuthStart: handleAuthStart,
  onAuthError: handleAuthError,
  onAuthComplete: handleAuthComplete,
});

// Create callback handler
const callbackHandler = createCallbackHandler({
  client,
  authFlow,
  onSuccess: handleAuthSuccess,
  onError: handleAuthError,
  onCancel: handleAuthCancel,
});
```

See the [UI Integration Guide](./docs/UI_INTEGRATION.md) for detailed information.

### Configuration Management

The library includes utilities for loading and validating configuration:

```typescript
import { loadArcadeConfig, validateConfig, isArcadeEnabled } from '@gannonh/arcade-client';

// Load configuration from environment and YAML
const config = loadArcadeConfig(yamlConfig);

// Validate configuration
const validation = validateConfig(config);
if (!validation.success) {
  console.error('Invalid configuration:', validation.error);
}

// Check if Arcade is enabled
if (isArcadeEnabled(config)) {
  // Initialize Arcade integration
}
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Build the client
npm run build

# Run linting
npm run lint

# Run tests
npm test

# Generate documentation
npm run docs

# View documentation locally
npm run docs:serve
```

### Project Structure

- `/src/types`: TypeScript interfaces for the Arcade API
- `/src/api`: Core API client implementation
- `/src/auth`: Authentication utilities
- `/src/config`: Configuration management
- `/src/tools`: Toolkit-specific implementations
- `/src/ui`: UI components and utilities
- `/src/utils`: Utility functions

## Documentation

This project uses TypeDoc to generate API documentation from TSDoc/JSDoc comments.

```bash
# Generate documentation
npm run docs

# View documentation locally
npm run docs:serve
```

Documentation resources:

- [TSDoc Standards](./docs/TSDoc-Standards.md) - Documentation standards
- [UI Integration Guide](./docs/UI_INTEGRATION.md) - Guide for integrating UI components
- [Implementation Patterns](./docs/IMPLEMENTATION_PATTERNS.md) - Design patterns used in the library
- [API Reference](./docs/api/README.md) - Generated API documentation

## License

MIT