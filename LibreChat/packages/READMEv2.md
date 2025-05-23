# LibreChat Packages

This directory contains the core packages that power LibreChat/Agentis's modular architecture. These packages provide shared functionality between the client and server applications, ensuring type safety and code reuse across the entire platform.

## Overview

The packages directory is organized as a monorepo workspace containing four main modules:

| Package | Version | Purpose |
|---------|---------|---------|
| **@librechat/data-schemas** | v0.0.7 | Mongoose schemas and TypeScript types for MongoDB data models |
| **librechat-data-provider** | v0.7.83 | Data services layer providing API communication and state management |
| **librechat-mcp** | v1.2.2 | Model Context Protocol (MCP) integration services |
| **@gannonh/arcade-client** | v0.0.1 | TypeScript client for Arcade API tool integration |

## Architecture

### Package Dependency Flow

```
┌─────────────────┐
│  data-schemas   │ ← Core data models (Mongoose schemas)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ data-provider   │ ← API communication layer
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│      mcp        │ ← MCP server integration
└─────────────────┘

┌─────────────────┐
│ arcade-client   │ ← Independent tool integration
└─────────────────┘
```

### Integration with LibreChat

```
client (React App) → uses → data-provider, mcp, arcade-client
                          ↓
api (Express Server) → uses → data-schemas, data-provider, mcp
```

## Quick Start

### Installation

From the root of the LibreChat project:

```bash
# Install all dependencies including workspaces
npm ci

# Build all packages in dependency order
npm run build:all
```

### Development Workflow

Use the development helper script for efficient package rebuilding:

```bash
# Show all available options
./scripts/dev.sh --help

# Rebuild all packages
./scripts/dev.sh --build

# Rebuild specific package and restart frontend
./scripts/dev.sh --provider --frontend

# Stop all running dev servers
./scripts/dev.sh --stop
```

## Package Details

### @librechat/data-schemas

**Purpose**: Provides the foundational data models used throughout LibreChat.

**Key Exports**:
- Mongoose schemas: `userSchema`, `messageSchema`, `conversationSchema`, etc.
- TypeScript types: Full type definitions for all models
- Model defaults and enums

**Usage Example**:
```typescript
import { userSchema, messageSchema, ConversationSchema } from '@librechat/data-schemas';
import mongoose from 'mongoose';

// Create Mongoose models
const User = mongoose.model('User', userSchema);
const Message = mongoose.model('Message', messageSchema);

// Use TypeScript types
import type { TUser, TMessage, TConversation } from '@librechat/data-schemas';
```

**Build Command**: `npm run build:data-schemas`

### librechat-data-provider

**Purpose**: Handles all API communication between the client and server, with built-in React Query integration.

**Key Features**:
- Type-safe API client with full TypeScript support
- React Query hooks for data fetching and mutations
- Configuration management for AI providers (OpenAI, Anthropic, etc.)
- File handling and OCR capabilities
- Role-based access control (RBAC)

**Usage Example**:
```typescript
// Direct API usage
import { DataService } from 'librechat-data-provider';
const dataService = new DataService();
const conversations = await dataService.getConversations();

// React Query hooks
import { useGetConversations, useCreateMessage } from 'librechat-data-provider/react-query';

function ChatComponent() {
  const { data: conversations, isLoading } = useGetConversations();
  const createMessage = useCreateMessage();
  
  const sendMessage = async (text: string) => {
    await createMessage.mutateAsync({ conversationId, text });
  };
}
```

**Build Command**: `npm run build:data-provider`

### librechat-mcp

**Purpose**: Enables integration with Model Context Protocol (MCP) servers for enhanced AI capabilities.

**Key Features**:
- MCP server discovery and lifecycle management
- Connection handling for app-level and user-specific servers
- Tool calling with proper error handling
- Flow management for complex operations
- Built-in diagnostics and debugging utilities

**Usage Example**:
```typescript
import { MCPManager } from 'librechat-mcp';
import Keyv from 'keyv';

// Initialize MCP manager
const manager = new MCPManager({
  userId: 'user-123',
  keyv: new Keyv({ store: keyvStore })
});

// Connect to MCP servers
await manager.initialize();

// Get available tools
const tools = await manager.getTools();

// Execute a tool
const result = await manager.callTool('filesystem', 'readFile', {
  path: '/tmp/data.json'
});
```

**Build Command**: `npm run build:mcp`

### @gannonh/arcade-client

**Purpose**: Provides integration with Arcade API for external tool capabilities.

**Key Features**:
- Full TypeScript support with strict typing
- OAuth-based authentication flow management
- Tool discovery and execution
- UI components for toolkit selection
- Built-in caching and performance optimization

**Usage Example**:
```typescript
import { createArcadeClient } from '@gannonh/arcade-client';

// Initialize client
const client = createArcadeClient({
  enabled: true,
  api_key: process.env.ARCADE_API_KEY,
  callback_url: 'https://your-app.com/arcade/callback',
  hosting: 'cloud',
  toolkits: [
    { id: 'github', name: 'GitHub', category: 'Developer Tools' }
  ]
}, 'user-123');

// Execute a tool
const result = await client.executeTool('github.createIssue', {
  repository: 'user/repo',
  title: 'Bug Report',
  body: 'Description of the issue'
});

// Handle authentication
const authResponse = await client.authorizeToolkit('github.*');
if (authResponse.status === 'pending' && authResponse.url) {
  // Redirect user to authResponse.url
}
```

**Build Command**: `npm run build:arcade-client`

## Development

### Prerequisites

- Node.js 18+ (required)
- npm 8+ (for workspaces support)
- MongoDB (for testing data-schemas)

### Building Packages

Packages must be built in dependency order:

```bash
# Build in correct order (handled automatically by build:all)
npm run build:data-schemas    # First (no dependencies)
npm run build:data-provider   # Second (depends on data-schemas)
npm run build:mcp             # Third (depends on data-provider)
npm run build:arcade-client   # Independent

# Or build all at once
npm run build:all
```

### Development Tips

1. **Watch Mode**: For active development, run watch mode in the package directory:
   ```bash
   cd packages/data-provider
   npm run build:watch
   ```

2. **Testing Changes**: After making changes to a package:
   - Rebuild the package
   - Restart the consuming application (frontend/backend)
   - Clear any caches if necessary

3. **Type Checking**: Ensure TypeScript compilation works:
   ```bash
   npm run typecheck:packages
   ```

### Common Tasks

#### Adding a New Schema (data-schemas)

1. Create the schema file in `packages/data-schemas/src/schema/`
2. Export it from `packages/data-schemas/src/index.ts`
3. Rebuild: `npm run build:data-schemas`
4. Rebuild dependent packages

#### Adding a New API Endpoint (data-provider)

1. Add the endpoint function in `packages/data-provider/src/`
2. Add React Query hook if needed in `packages/data-provider/src/react-query/`
3. Export from appropriate index files
4. Rebuild: `npm run build:data-provider`

#### Adding MCP Server Support

1. Update server configurations in `packages/mcp/src/`
2. Add connection handling logic
3. Rebuild: `npm run build:mcp`

## Troubleshooting

### Build Failures

**Issue**: "Cannot find module" errors
```bash
# Solution: Rebuild in dependency order
npm run build:data-schemas
npm run build:data-provider
npm run build:mcp
```

**Issue**: TypeScript errors after changes
```bash
# Solution: Clean and rebuild
cd packages/[package-name]
rm -rf dist/
npm run build
```

### Runtime Issues

**Issue**: Changes not reflected in application
- Ensure the package is rebuilt
- Check that the `dist/` directory exists and contains fresh files
- Restart the consuming application
- Clear any build caches

**Issue**: Module resolution failures
```bash
# Check package.json exports
cat packages/[package-name]/package.json | grep -A 10 '"exports"'

# Verify dist structure
ls -la packages/[package-name]/dist/
```

### Development Server Issues

**Issue**: Port conflicts or stale processes
```bash
# Stop all servers
./scripts/dev.sh --stop

# Nuclear option - kill all node processes
./scripts/dev.sh --kill-all-node
```

**Issue**: Logs not visible
```bash
# Monitor development logs
tail -f logs/frontend.log
tail -f logs/backend.log
```

## Best Practices

1. **Always rebuild dependent packages**: When changing data-schemas, rebuild data-provider and mcp
2. **Use the dev script**: `./scripts/dev.sh` handles rebuilding and restarting efficiently
3. **Commit built files**: Do NOT commit `dist/` directories - they're git-ignored
4. **Version carefully**: Follow semantic versioning when publishing packages
5. **Test thoroughly**: Each package has its own test suite - run before committing

## Contributing

When contributing to packages:

1. **Follow existing patterns**: Match the code style and structure
2. **Add tests**: New features should include test coverage
3. **Update types**: Ensure TypeScript definitions are complete
4. **Document exports**: Use JSDoc comments for public APIs
5. **Run checks**: Use `npm run check:packages` before committing

### Running Tests

```bash
# Test all packages
npm run test:packages

# Test specific package
cd packages/[package-name]
npm test

# Run with coverage
npm run test:coverage
```

## Additional Resources

- [Arcade Client Documentation](./arcade-client/docs/README.md)
- [MCP Protocol Specification](https://modelcontextprotocol.org)
- [LibreChat Documentation](https://www.librechat.ai/docs)

## License

All packages are MIT licensed as part of the LibreChat project.