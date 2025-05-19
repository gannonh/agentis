# Arcade UI Integration Guide

This document provides guidance on integrating the Arcade client into your application's user interface.

## Overview

The Arcade client provides a set of UI components and utilities for integrating Arcade toolkits into your application. These components handle:

1. Displaying available toolkits
2. Managing authentication flows
3. Executing toolkit tools
4. Handling errors and success states

## Components

### Toolkit Selector

The Toolkit Selector provides a way to display and filter available toolkits in your UI.

```typescript
import { createToolkitSelector } from '@gannonh/arcade-client';

// Create a toolkit selector
const selector = createToolkitSelector({
  toolkits: arcadeToolkits,
  authStatus: {
    'github': { isAuthenticated: true },
    'google': { isAuthenticated: false },
  },
  onStartAuth: (toolkitId) => {
    // Handle authentication initiation
    startAuth(toolkitId);
  },
  onCheckAuth: (toolkitId) => {
    // Check authentication status
    checkAuthStatus(toolkitId);
  },
});

// Get all available toolkits
const allToolkits = selector.getAvailableToolkits();

// Get toolkits by category
const devTools = selector.getAvailableToolkits('Developer Tools');

// Get authenticated toolkits
const authenticatedToolkits = selector.getAuthenticatedToolkits();

// Check if a toolkit is authenticated
const isGithubAuthenticated = selector.isAuthenticated('github');

// Start authentication for a toolkit
selector.startAuthentication('google');
```

### Authentication Flow

The Authentication Flow component manages the OAuth flow for Arcade toolkits.

```typescript
import { createAuthFlow, AuthFlowStatus } from '@gannonh/arcade-client';

// Create an auth flow
const authFlow = createAuthFlow({
  onAuthStart: (toolkitId, response) => {
    // Handle auth start
    console.log(`Starting auth for ${toolkitId}`);
  },
  onAuthError: (toolkitId, response) => {
    // Handle auth error
    console.error(`Auth error for ${toolkitId}`);
  },
  onAuthComplete: (toolkitId, response) => {
    // Handle auth complete
    console.log(`Auth completed for ${toolkitId}`);
  },
  pollingInterval: 2000, // Poll every 2 seconds
});

// Start authentication
authFlow.startAuth('github', authResponse);

// Check authentication status
authFlow.checkAuthStatus(authResponse);

// Cancel authentication
authFlow.cancelAuth();

// Get active authentication request
const activeRequest = authFlow.getActiveAuthRequest();

// Get authentication status for a toolkit
const githubStatus = authFlow.getAuthStatus('github');
```

### Authentication Callback Handler

The Authentication Callback Handler manages the callback from the OAuth provider.

```typescript
import { createCallbackHandler } from '@gannonh/arcade-client';

// Create a callback handler
const callbackHandler = createCallbackHandler({
  client: arcadeClient,
  authFlow: authFlow,
  onSuccess: (result) => {
    // Handle successful authentication
    console.log(`Authentication successful for ${result.toolkitId}`);
  },
  onError: (result) => {
    // Handle authentication error
    console.error(`Authentication failed for ${result.toolkitId}: ${result.error}`);
  },
  onCancel: () => {
    // Handle authentication cancellation
    console.log('Authentication cancelled');
  },
  resultPath: '/auth-result', // Path to redirect to after auth
  pollInterval: 2000, // Poll every 2 seconds
});

// Handle callback from OAuth provider
callbackHandler.handleCallback(new URL(window.location.href));

// Handle result page loading
callbackHandler.handleResultPage(new URL(window.location.href));
```

## Integration with React

Here's an example of how to integrate the Arcade client with a React application:

```tsx
import React, { useEffect, useState } from 'react';
import { 
  createArcadeClient, 
  createToolkitSelector, 
  createAuthFlow, 
  createCallbackHandler,
  ArcadeAgentisTool
} from '@gannonh/arcade-client';

// Arcade Client Integration Component
const ArcadeIntegration = ({ userId, config }) => {
  const [toolkits, setToolkits] = useState<ArcadeAgentisTool[]>([]);
  const [selectedToolkit, setSelectedToolkit] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Create client
  const client = useMemo(() => createArcadeClient(config, userId), [config, userId]);
  
  // Create auth flow
  const authFlow = useMemo(() => createAuthFlow({
    onAuthStart: (toolkitId) => {
      setIsAuthenticating(true);
    },
    onAuthError: (toolkitId, response) => {
      setIsAuthenticating(false);
      // Show error message
    },
    onAuthComplete: (toolkitId, response) => {
      setIsAuthenticating(false);
      // Update auth status
    },
  }), []);
  
  // Create toolkit selector
  const selector = useMemo(() => createToolkitSelector({
    toolkits: toolkits,
    authStatus: {}, // Get from state or context
    onStartAuth: (toolkitId) => {
      startAuth(toolkitId);
    },
    onCheckAuth: (toolkitId) => {
      // Check auth status
    },
  }), [toolkits]);
  
  // Load toolkits
  useEffect(() => {
    const loadToolkits = async () => {
      const enabledTools = await client.getEnabledTools();
      // Map to UI format
      const uiToolkits = enabledTools.items.map(tool => 
        mapToolkitToUIComponent({
          id: tool.toolkit.name,
          name: tool.toolkit.name,
          category: 'Developer Tools', // You would get this from your config
          description: tool.toolkit.description || '',
        })
      );
      setToolkits(uiToolkits);
    };
    
    loadToolkits();
  }, [client]);
  
  // Start authentication
  const startAuth = async (toolkitId: string) => {
    setSelectedToolkit(toolkitId);
    try {
      const response = await client.authorizeToolkit(toolkitId);
      authFlow.startAuth(toolkitId, response);
    } catch (error) {
      console.error('Auth error:', error);
    }
  };
  
  // Render toolkit selection
  return (
    <div className="arcade-integration">
      <h2>Available Toolkits</h2>
      <div className="toolkit-list">
        {selector.getAvailableToolkits().map(toolkit => (
          <ToolkitCard 
            key={toolkit.id}
            toolkit={toolkit}
            isAuthenticated={selector.isAuthenticated(toolkit.arcadeToolkitId)}
            onAuth={() => startAuth(toolkit.arcadeToolkitId)}
          />
        ))}
      </div>
      
      {isAuthenticating && (
        <div className="auth-overlay">
          <p>Authentication in progress...</p>
        </div>
      )}
    </div>
  );
};

// Toolkit Card Component
const ToolkitCard = ({ toolkit, isAuthenticated, onAuth }) => {
  return (
    <div className="toolkit-card">
      <img src={toolkit.icon} alt={toolkit.name} />
      <h3>{toolkit.name}</h3>
      <p>{toolkit.description}</p>
      {isAuthenticated ? (
        <span className="auth-status authenticated">Authenticated</span>
      ) : (
        <button onClick={onAuth}>Authenticate</button>
      )}
    </div>
  );
};
```

## Authentication Callback Route

You'll need to create a route to handle the authentication callback:

```tsx
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createCallbackHandler } from '@gannonh/arcade-client';

// Authentication Callback Component
const AuthCallback = ({ client, authFlow }) => {
  const location = useLocation();
  
  useEffect(() => {
    const handler = createCallbackHandler({
      client,
      authFlow,
      onSuccess: (result) => {
        // Navigate to success page or show success message
        console.log('Authentication successful:', result);
      },
      onError: (result) => {
        // Navigate to error page or show error message
        console.error('Authentication failed:', result.error);
      },
      onCancel: () => {
        // Handle cancellation
      },
    });
    
    // Handle the callback
    handler.handleCallback(new URL(window.location.href));
  }, [client, authFlow, location]);
  
  return (
    <div className="auth-callback">
      <h2>Completing Authentication</h2>
      <p>Please wait while we complete the authentication process...</p>
    </div>
  );
};
```

## Authentication Result Route

You'll also need a route to handle the authentication result:

```tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createCallbackHandler } from '@gannonh/arcade-client';

// Authentication Result Component
const AuthResult = ({ client, authFlow }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const handler = createCallbackHandler({
      client,
      authFlow,
      onSuccess: (result) => {
        // Show success message and redirect
        navigate('/dashboard', { 
          state: { success: true, message: `Successfully authenticated with ${result.provider}` } 
        });
      },
      onError: (result) => {
        // Show error message and redirect
        navigate('/dashboard', { 
          state: { error: true, message: result.error } 
        });
      },
      onCancel: () => {
        // Handle cancellation
        navigate('/dashboard');
      },
    });
    
    // Handle the result page
    handler.handleResultPage(new URL(window.location.href));
  }, [client, authFlow, location, navigate]);
  
  return (
    <div className="auth-result">
      <h2>Authentication in Progress</h2>
      <p>Please wait while we verify your authentication...</p>
      <div className="loading-spinner"></div>
    </div>
  );
};
```

## Tool Execution

After authentication, you can execute tools from the authenticated toolkits:

```typescript
// Execute a tool
const executeGitHubTool = async () => {
  try {
    const result = await client.executeTool('github.createIssue', {
      repository: 'user/repo',
      title: 'New Issue',
      body: 'This is a test issue',
    });
    
    if (result.success) {
      console.log('Tool executed successfully:', result.output?.value);
    } else {
      console.error('Tool execution failed:', result.output?.error);
    }
  } catch (error) {
    console.error('Error executing tool:', error);
  }
};
```

## Configuration

The UI components read their configuration from the Arcade client configuration:

```typescript
// Load configuration
const config = loadArcadeConfig(yamlConfig);

// Create client with configuration
const client = createArcadeClient(config, userId);
```

Make sure to set up your configuration in the `.env` file or in the YAML configuration file:

```
# .env
ARCADE_ENABLED=true
ARCADE_API_KEY=your_api_key
ARCADE_CALLBACK_URL=https://your-app.com/api/arcade/callback
ARCADE_HOSTING=cloud
```

## Best Practices

1. **Error Handling**: Always handle authentication and execution errors properly and display user-friendly error messages.

2. **Loading States**: Show loading indicators during authentication and tool execution to provide feedback to the user.

3. **Authentication Status**: Clearly indicate which toolkits are authenticated and which still require authentication.

4. **Toolkit Grouping**: Group toolkits by category to make it easier for users to find the tools they need.

5. **Toolkit Documentation**: Provide clear documentation about what each toolkit does and what permissions it requires.

6. **Caching**: Cache toolkit information and authentication status to improve performance and reduce API calls.

7. **Responsive Design**: Ensure that the toolkit UI works well on both desktop and mobile devices.

8. **Accessibility**: Make sure that all UI components are accessible and can be used with keyboard navigation and screen readers.

## Troubleshooting

### Authentication Issues

1. **Callback URL Mismatch**: Ensure that the callback URL configured in the Arcade dashboard matches the one in your application.

2. **API Key Issues**: Verify that your API key is correct and has the necessary permissions.

3. **Stale Authentication**: If authentication seems to be stuck, try canceling and restarting the authentication flow.

### Tool Execution Issues

1. **Missing Permissions**: Ensure that the authenticated user has the necessary permissions for the tool being executed.

2. **Invalid Parameters**: Check that all required parameters are provided and have the correct format.

3. **Network Issues**: Check for network connectivity issues that might be affecting API calls.

### UI Integration Issues

1. **State Management**: Ensure that authentication state is properly managed and persisted across page reloads.

2. **Cross-Origin Issues**: Verify that your application is handling cross-origin requests correctly.

3. **Browser Compatibility**: Test your integration on different browsers to ensure compatibility.

## Next Steps

1. **Custom Toolkit Development**: Learn how to create custom toolkits for your specific needs.

2. **Advanced Authentication**: Implement more advanced authentication flows, such as token refresh and silent authentication.

3. **Hybrid Deployment**: Explore hybrid deployment options for improved data security and compliance.

4. **Analytics**: Add analytics to track toolkit usage and authentication success rates.

## Conclusion

The Arcade client UI integration provides a flexible and powerful way to add external service capabilities to your application. By following this guide, you should be able to integrate Arcade toolkits into your application's UI and provide a seamless experience for your users.

For more information, see the [Arcade API Documentation](https://docs.arcade.dev) and the [Arcade Client API Reference](./api/README.md).