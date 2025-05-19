# TSDoc/JSDoc Documentation Standards

This document outlines the documentation standards for the Arcade Client codebase, using TSDoc/JSDoc format.

## General Guidelines

1. **Every file** should begin with a file-level comment describing its purpose
2. **Every exported function/class/interface** should be documented
3. **Use complete sentences** with proper punctuation
4. **Be concise but descriptive**
5. **Use present tense** (e.g., "Returns a value" not "Will return a value")
6. **Use imperative mood for actions** (e.g., "Get the tools" not "Gets the tools")

## File Headers

Every file should have a header comment explaining its purpose:

```typescript
/**
 * Module for interacting with the Arcade API.
 * Provides methods for authentication, tool execution, and toolkit management.
 * 
 * @module api/client
 */
```

## Class Documentation

Classes should be documented with a description and any relevant tags:

```typescript
/**
 * Main Arcade API client for interacting with the Arcade API service.
 * Handles authentication, tool execution, and toolkit management.
 * 
 * @class
 * @example
 * ```typescript
 * const client = createArcadeClient(config, userId);
 * const health = await client.health();
 * ```
 */
export class ArcadeClient {
```

## Method Documentation

Methods should include a description, parameter documentation, return type, and examples if helpful:

```typescript
/**
 * Executes a tool against the Arcade API.
 * 
 * @param toolName - Tool name in the format "toolkit.tool"
 * @param params - Input parameters for the tool execution
 * @param options - Additional execution options
 * @returns Promise resolving to the tool execution response
 * @throws Error if the tool execution fails
 * 
 * @example
 * ```typescript
 * const result = await client.executeTool(
 *   'github.createIssue',
 *   { repo: 'user/repo', title: 'Bug report' }
 * );
 * ```
 */
```

## Interface/Type Documentation

Interfaces and types should be documented with a description and property documentation:

```typescript
/**
 * Configuration options for the Arcade client.
 * 
 * @interface
 */
export interface ArcadeConfig {
  /** Whether Arcade integration is enabled */
  enabled: boolean;
  
  /** API key for authenticating with the Arcade service */
  api_key: string;
  
  /** Callback URL used for OAuth flows and redirects */
  callback_url: string;
  
  // ...other properties
}
```

## Parameter Formats

Parameters should be documented using the dash format:

```typescript
/**
 * @param name - Description of the parameter
 */
```

## Return Type Documentation

Return values should be documented with a description:

```typescript
/**
 * @returns Promise resolving to the health status response
 */
```

## Exception Documentation

Document potential exceptions that may be thrown:

```typescript
/**
 * @throws Error if the configuration is invalid
 * @throws Error if the API request fails
 */
```

## Example Documentation

Include examples for complex methods or functionality:

```typescript
/**
 * @example
 * ```typescript
 * // Example code showing how to use the method
 * const health = await client.health();
 * console.log(`API is healthy: ${health.healthy}`);
 * ```
 */
```

## Optional/Required Parameters

Clearly document which parameters are optional:

```typescript
/**
 * @param options - Optional configuration settings for the request
 */
```

## Type Parameter Documentation

When using generics, document type parameters:

```typescript
/**
 * @template T - The type of items in the paginated response
 */
```

## Special Tags

Use special tags when applicable:

- `@deprecated` - For marking deprecated functionality
- `@beta` or `@alpha` - For experimental features
- `@internal` - For internal features not intended for public use
- `@ignore` - To exclude items from documentation generation

## Multiline Descriptions

For longer descriptions, use multiple lines:

```typescript
/**
 * This is a long description that spans multiple lines.
 * It continues on this line.
 * 
 * This is a new paragraph in the description.
 */
```

## Documentation Tooling

We use [TypeDoc](https://typedoc.org/) for generating documentation from TSDoc comments. 
Configure TypeDoc in a separate typedoc.json file.

## Implementation Requirements

1. All new code must follow these documentation standards
2. Existing code should be updated to comply with these standards when modified
3. Documentation should be reviewed as part of the code review process
4. Generated documentation should be updated when releasing new versions

## Reference

For more detailed information, refer to:
- [TSDoc Specification](https://tsdoc.org/)
- [JSDoc Documentation](https://jsdoc.app/)
- [TypeDoc Documentation](https://typedoc.org/guides/doccomments/)