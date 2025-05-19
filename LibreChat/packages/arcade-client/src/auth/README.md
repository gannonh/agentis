# Auth Module

This module handles authentication and authorization flows for the Arcade API.

## Components

### Auth Utilities

The auth module provides utilities for:

- Initiating OAuth authorization flows
- Checking authorization status
- Managing authorization tokens
- Handling authorization redirects

### Usage

```typescript
import { initiateAuthFlow, checkAuthStatus } from './auth';

// Initiate authentication flow
const authResponse = await initiateAuthFlow(client, 'github.*', redirectUri);

// Check authentication status
const status = await checkAuthStatus(client, authResponse.id);
```

## Authorization Flows

The module supports multiple authorization flows:

1. **OAuth 2.0**: Standard OAuth flow with authorization code
2. **Device Flow**: For devices with limited input capabilities
3. **Client Credentials**: For server-to-server authentication

## Token Management

Authorization tokens are managed securely:

- Tokens are never exposed to the client-side code
- Token refresh is handled automatically
- Token validation is performed before use

## Integration

This module integrates with:

- `ArcadeClient` for making API calls
- External OAuth providers (GitHub, Google, etc.)
- Browser redirect flows

## Security Considerations

The auth module implements several security best practices:

1. **CSRF Protection**: Uses state parameters to prevent cross-site request forgery
2. **Token Storage**: Recommends secure token storage practices
3. **Scope Limitation**: Requests minimal scopes needed for functionality

## Error Handling

Authentication errors are handled with specific error types:

- `AuthorizationPendingError`: When authorization is still in progress
- `AuthorizationExpiredError`: When the authorization request has expired
- `AuthorizationFailedError`: When authorization fails due to an error