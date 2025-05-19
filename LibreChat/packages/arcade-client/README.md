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

# Run tests (once implemented)
npm test
```

### Project Structure

- `/src/types`: TypeScript interfaces for the Arcade API
- `/src/api`: Core API client implementation
- `/src/auth`: Authentication utilities
- `/src/tools`: Toolkit-specific implementations
- `/src/utils`: Utility functions

## License

MIT