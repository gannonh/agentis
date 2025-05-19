# API Module

This module contains the core client implementation for interacting with the Arcade API.

## Components

### ArcadeClient

The main client class that handles all interactions with the Arcade API, including:

- Authentication and authorization
- Tool discovery and execution
- Toolkit management
- Health checks
- Error handling

### Usage

```typescript
import { createArcadeClient } from './client';
import type { ArcadeConfig } from '../types';

// Create configuration
const config: ArcadeConfig = {
  enabled: true,
  api_key: 'your-api-key',
  callback_url: 'https://example.com/callback',
  hosting: 'cloud',
  toolkits: [{ id: 'github', name: 'GitHub', category: 'Developer Tools', description: 'GitHub integration' }]
};

// Create client
const client = createArcadeClient(config, 'user-123');

// Make API calls
await client.health();
await client.getTools();
await client.executeTool('github.createIssue', { repo: 'user/repo', title: 'New issue' });
```

## Key Features

1. **Request Handling**: Manages all HTTP requests to the Arcade API with proper error handling
2. **Configuration Validation**: Validates client configuration using Zod schemas
3. **Authentication**: Handles OAuth flows and token management
4. **Tool Execution**: Provides methods for discovering and executing tools

## Architecture

The client follows a layered architecture:

1. **HTTP Layer**: Handles raw API requests using Axios
2. **Validation Layer**: Ensures data integrity with Zod schemas
3. **Error Handling Layer**: Provides consistent error responses
4. **Business Logic Layer**: Implements core functionality

## Error Handling

All API errors are handled consistently with informative error messages. The client will:

1. Log errors to the console for debugging
2. Provide user-friendly error messages based on status codes
3. Throw appropriate exceptions for client code to handle

## Integration

This module is designed to be integrated with other components:

- Used by the `auth` module for OAuth flows
- Provides data to the `tools` module for tool-specific functionality
- Works with the utility functions in the `utils` module