# Types Module

This module contains TypeScript type definitions for the Arcade API client.

## Components

### API Types

Type definitions for the Arcade API:

- Request and response types
- Configuration interfaces
- Error types

### Common Types

Common type definitions used throughout the client:

- Pagination types
- Authentication types
- Toolkit and tool types

### Usage

```typescript
import type {
  ArcadeConfig,
  ArcadeToolResponse,
  ArcadeExecuteToolRequest,
  ArcadeAuthResponse
} from './index';

// Use in function signatures
function executeToolWithParams(
  client: ArcadeClient,
  request: ArcadeExecuteToolRequest
): Promise<ArcadeToolResponse> {
  // Implementation
}
```

## Type Categories

The types are organized into categories:

1. **Configuration Types**: For client initialization
2. **Request Types**: For API requests
3. **Response Types**: For API responses
4. **Error Types**: For API and client errors
5. **Utility Types**: Helper types for common patterns

## Type Safety

The type definitions ensure type safety throughout the client:

- Strict null checking
- Required vs optional properties
- Union types for enums and options
- Generic types for collections

## Integration

These types are used throughout the codebase:

- By the `api` module for client implementation
- By the `auth` module for authentication flows
- By the `tools` module for tool-specific implementations
- By consuming applications for type safety

## Documentation

Each type is extensively documented using TSDoc:

- Purpose and usage
- Property descriptions
- Examples
- Related types

## Schema Validation

Many types have corresponding Zod schemas in the codebase for runtime validation.