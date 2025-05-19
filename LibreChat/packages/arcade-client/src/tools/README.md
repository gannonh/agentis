# Tools Module

This module provides toolkit-specific implementations and utilities for working with Arcade toolkits.

## Components

### Toolkit Integrations

The tools module includes specialized implementations for:

- GitHub toolkit
- Google toolkit
- Other available toolkits

### Tool Utilities

Common utilities for working with tools:

- Parameter validation
- Output formatting
- Error handling

### Usage

```typescript
import { createGitHubIssue, listGitHubRepositories } from './github';
import { searchGoogleDocs } from './google';
import { validateToolParameters } from './validation';

// Use toolkit-specific functions
const issue = await createGitHubIssue(client, {
  repo: 'user/repo',
  title: 'Bug report',
  body: 'Description of the bug'
});

// Validate parameters
const validParams = validateToolParameters('github.createIssue', params);
```

## Toolkit Structure

Each toolkit integration follows a common structure:

1. **Tool Definitions**: TypeScript interfaces for each tool's parameters and outputs
2. **Tool Implementations**: Functions that abstract the raw API calls
3. **Validation**: Parameter validation specific to each tool
4. **Utilities**: Helper functions for common operations

## Parameter Handling

The module provides robust parameter handling:

- Type validation using TypeScript and Zod
- Default values for optional parameters
- Parameter transformation for API compatibility

## Output Processing

Tool outputs are processed consistently:

- Type checking for responses
- Error handling for failed tool executions
- Data transformation for client-friendly formats

## Integration

This module integrates with:

- `ArcadeClient` for making API calls
- `types` module for type definitions
- Application-specific code for toolkit usage