# LibreChat Packages

Core packages powering LibreChat/Agentis's modular architecture. These packages provide shared functionality between client and server applications, ensuring type safety and code reuse across the platform.

## Overview

| Package | Version | Purpose |
|---------|---------|---------|
| **@librechat/data-schemas** | v0.0.7 | Mongoose schemas and TypeScript types for MongoDB data models |
| **librechat-data-provider** | v0.7.83 | Data services layer providing API communication and state management |
| **librechat-mcp** | v1.2.2 | Model Context Protocol (MCP) integration services with Composio authentication |
| **@gannonh/arcade-client** | v0.0.1 | TypeScript client for Arcade API tool integration |

## Quick Start

```bash
# Install all dependencies
npm ci

# Build all packages
npm run build:all

# Start development
npm run frontend:dev  # Frontend on http://localhost:3090
npm run backend:dev   # Backend on http://localhost:3080
```

## Architecture

### Dependency Flow

```
data-schemas → data-provider → mcp
                    ↑
              arcade-client
```

### Integration

- **Client (React)**: Uses data-provider, mcp, and arcade-client
- **Server (Express)**: Uses data-schemas, data-provider, and mcp

## Development

### Building Packages

Use the development helper script:

```bash
./scripts/dev.sh --help              # Show options
./scripts/dev.sh --build             # Rebuild all
./scripts/dev.sh --provider --frontend  # Rebuild specific package + restart
```

Or build manually:

```bash
npm run build:data-schemas
npm run build:data-provider
npm run build:mcp
npm run build:arcade-client
```

### Package Guide

#### @librechat/data-schemas

Mongoose schemas and TypeScript types.

```typescript
import { userSchema, messageSchema } from '@librechat/data-schemas';
import type { TUser, TMessage } from '@librechat/data-schemas';

const User = mongoose.model('User', userSchema);
```

#### librechat-data-provider

API communication and React Query integration.

```typescript
// Direct API
import { DataService } from 'librechat-data-provider';
const dataService = new DataService();

// React hooks
import { useGetConversations } from 'librechat-data-provider/react-query';
const { data } = useGetConversations();
```

#### librechat-mcp

Model Context Protocol server management with Composio authentication support.

```typescript
import { MCPManager } from 'librechat-mcp';

const manager = new MCPManager({ userId, keyv });
await manager.initialize();
const tools = await manager.getTools();

// With Composio connected account resolution
const connectedAccountResolver = async (userId, service) => {
  return await composioService.getConnectedAccountId(userId, service);
};
await manager.initializeMCP(mcpServers, processMCPEnv, connectedAccountResolver);
```

#### @gannonh/arcade-client

External tool integration.

```typescript
import { createArcadeClient } from '@gannonh/arcade-client';

const client = createArcadeClient(config, userId);
const result = await client.executeTool('github.createIssue', params);
```

## Common Tasks

### Add a Schema

1. Create: `packages/data-schemas/src/schema/newEntity.ts`
2. Export: Update `packages/data-schemas/src/index.ts`
3. Rebuild: `npm run build:data-schemas`

### Add an API Endpoint

1. Create: `packages/data-provider/src/newEndpoint.ts`
2. Add hook: `packages/data-provider/src/react-query/useNewEndpoint.ts`
3. Rebuild: `npm run build:data-provider`

### Add MCP Server

1. Update: `packages/mcp/src/servers.ts`
2. Rebuild: `npm run build:mcp`

## Troubleshooting

**Module not found**
```bash
# Rebuild in order
npm run build:data-schemas
npm run build:data-provider
npm run build:mcp
```

**Changes not reflected**
```bash
# Check build output
ls packages/[package-name]/dist/

# Clean rebuild
rm -rf packages/[package-name]/dist/
npm run build:[package-name]
```

**Port conflicts**
```bash
./scripts/dev.sh --stop
```

## Testing

```bash
# All packages
npm run test:packages

# Specific package
cd packages/[package-name] && npm test
```

## Contributing

1. Follow existing patterns
2. Add tests for new features
3. Update TypeScript types
4. Document public APIs
5. Run `npm run check:packages` before committing

## Resources

- [Arcade Client Docs](./arcade-client/docs/README.md)
- [MCP Protocol](https://modelcontextprotocol.org)
- [LibreChat Docs](https://www.librechat.ai/docs)

## License

MIT