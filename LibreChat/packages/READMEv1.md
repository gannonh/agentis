# LibreChat Packages

This directory contains the core packages that power LibreChat's modular architecture. These packages provide shared functionality between the client and server applications, ensuring type safety and code reuse across the entire platform.

## Overview

The packages directory is organized into four main modules:

1. **arcade-client** - TypeScript client for integrating with the Arcade API for agentic tools
2. **data-provider** - Data services layer providing API communication and state management
3. **data-schemas** - Mongoose schemas and TypeScript types for MongoDB data models
4. **mcp** - Model Context Protocol (MCP) integration services

## Package Architecture

```
packages/
├── arcade-client/    # Arcade API integration
├── data-provider/    # API communication layer
├── data-schemas/     # Data models and schemas
└── mcp/              # MCP server management
```

### Dependency Graph

```
┌─────────────┐     ┌───────────────┐     ┌─────┐
│data-schemas │ ──> │ data-provider │ ──> │ mcp │
└─────────────┘     └───────────────┘     └─────┘
                            ↑
                    ┌───────────────┐
                    │ arcade-client │
                    └───────────────┘
```

## Packages

### @librechat/data-schemas (v0.0.7)

**Purpose**: Provides Mongoose schemas and TypeScript types for all data models used in LibreChat.

**Key Features**:
- Comprehensive Mongoose schemas for all entities
- TypeScript interfaces for type safety
- Modular schema organization
- Built-in timestamps and indexing

**Installation**:
```bash
npm install @librechat/data-schemas
```

**Usage**:
```typescript
import { userSchema, messageSchema } from '@librechat/data-schemas';
import mongoose from 'mongoose';

const UserModel = mongoose.model('User', userSchema);
const MessageModel = mongoose.model('Message', messageSchema);
```

### librechat-data-provider (v0.7.83)

**Purpose**: Data services layer that handles all API communication and state management for LibreChat applications.

**Key Features**:
- React Query integration for efficient data fetching
- Type-safe API requests with full TypeScript support
- Configuration management for various AI providers
- RBAC (Role-Based Access Control) support
- File handling and OCR capabilities
- MCP integration

**Installation**:
```bash
npm install librechat-data-provider
```

**Usage**:
```typescript
import { DataService } from 'librechat-data-provider';
import { useGetConversations } from 'librechat-data-provider/react-query';

// Direct API usage
const dataService = new DataService();
const conversations = await dataService.getConversations();

// React Query hooks
const { data, isLoading } = useGetConversations();
```

### librechat-mcp (v1.2.2)

**Purpose**: Model Context Protocol (MCP) integration services that enable communication with MCP-compatible servers.

**Key Features**:
- MCP server discovery and management
- Connection handling for app-level and user-specific servers
- Tool calling and result formatting
- Flow management for complex operations
- Built-in diagnostics utilities

**Installation**:
```bash
npm install librechat-mcp
```

**Usage**:
```typescript
import { MCPManager } from 'librechat-mcp';

const manager = new MCPManager({
  userId: 'user-123',
  keyv: keyvInstance
});

// Initialize connection
await manager.initialize();

// Get available tools
const tools = await manager.getTools();
```

### @gannonh/arcade-client (v0.0.1)

**Purpose**: TypeScript client for integrating with the Arcade API, providing access to external agentic tools.

**Key Features**:
- Full TypeScript support with strict typing
- Authentication flow management
- Tool discovery and execution
- UI components for integration
- Configuration management
- Caching and performance optimization

**Installation**:
```bash
npm install @gannonh/arcade-client
```

**Usage**:
```typescript
import { createArcadeClient } from '@gannonh/arcade-client';

const client = createArcadeClient({
  enabled: true,
  api_key: process.env.ARCADE_API_KEY,
  callback_url: 'https://your-callback-url.com',
  hosting: 'cloud'
}, 'user-123');

// Execute a tool
const result = await client.executeTool('github.createIssue', {
  repository: 'user/repo',
  title: 'New Issue'
});
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB (for data-schemas testing)

### Building Packages

Each package can be built independently:

```bash
# Build all packages
npm run build:packages

# Build individual packages
npm run build:data-schemas
npm run build:data-provider
npm run build:mcp
npm run build:arcade-client
```

### Development Workflow

1. **Making Changes to Packages**:
   - Edit the source files in the package's `src` directory
   - Run the package's build command
   - Test changes in the consuming application

2. **Watch Mode**:
   ```bash
   # In the package directory
   npm run build:watch
   ```

3. **Testing**:
   ```bash
   # Run tests for all packages
   npm test

   # Run tests for a specific package
   cd packages/[package-name]
   npm test
   ```

### Dependency Management

When updating dependencies:

1. **data-schemas**: Changes require rebuilding all dependent packages
2. **data-provider**: Changes affect mcp and client applications
3. **mcp**: Changes affect client applications
4. **arcade-client**: Independent package, changes only affect its consumers

### Publishing

Packages are published to npm when changes are merged to main. Version bumps follow semantic versioning:

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

## Common Issues

### Build Issues

If packages fail to build:

1. Ensure all dependencies are installed: `npm ci`
2. Clean build directories: `npm run clean`
3. Rebuild in dependency order:
   ```bash
   npm run build:data-schemas
   npm run build:data-provider
   npm run build:mcp
   ```

### Type Errors

If TypeScript complains about missing types:

1. Rebuild the affected package
2. Restart TypeScript service in your IDE
3. Check that the package is properly exported in `package.json`

### Module Resolution

If imports fail:

1. Check that the package is built (`dist` directory exists)
2. Verify the import path matches the package exports
3. Ensure peer dependencies are installed

## Contributing

When contributing to packages:

1. Follow the existing code style
2. Add tests for new functionality
3. Update documentation
4. Ensure all tests pass
5. Build the package before committing

## License

All packages are MIT licensed.