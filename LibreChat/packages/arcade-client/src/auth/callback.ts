/**
 * Authentication callback handler for Arcade integration
 */
import type { ArcadeClient } from '../api/client';
import type { AuthFlow } from '../ui/AuthFlow';
import type { ArcadeAuthResponse } from '../types';

/**
 * Authentication success result
 */
export interface AuthSuccessResult {
  /** Authorization ID */
  authId: string;
  /** Toolkit ID */
  toolkitId: string;
  /** Provider ID */
  provider: string;
  /** Full authorization response */
  response: ArcadeAuthResponse;
}

/**
 * Authentication error result
 */
export interface AuthErrorResult {
  /** Authorization ID */
  authId: string;
  /** Toolkit ID */
  toolkitId: string;
  /** Error message */
  error: string;
  /** Full authorization response (if available) */
  response?: ArcadeAuthResponse;
}

/**
 * Authentication callback configuration
 */
export interface AuthCallbackConfig {
  /** Arcade client */
  client: ArcadeClient;
  /** Authentication flow */
  authFlow: AuthFlow;
  /** Success callback */
  onSuccess: (result: AuthSuccessResult) => void;
  /** Error callback */
  onError: (result: AuthErrorResult) => void;
  /** Cancel callback */
  onCancel: () => void;
  /** Result page path */
  resultPath?: string;
  /** Polling interval (ms) */
  pollInterval?: number;
  /** Maximum number of polling attempts */
  maxPollCount?: number;
}

/**
 * Authentication callback handler
 */
export interface AuthCallbackHandler {
  /** Handle initial callback from auth provider */
  handleCallback(url: URL): void;
  /** Handle result page loading */
  handleResultPage(url: URL): void;
  /** Poll for authentication status */
  pollAuthStatus(authId: string, toolkitId: string): Promise<void>;
}

/**
 * Create an authentication callback handler
 * 
 * @param config - Authentication callback configuration
 * @returns Authentication callback handler
 */
export function createCallbackHandler(config: AuthCallbackConfig): AuthCallbackHandler {
  const {
    client,
    authFlow,
    onSuccess,
    onError,
    // We'll use onCancel in future implementations
    // onCancel,
    resultPath = '/auth-result',
    pollInterval = 2000,
    maxPollCount = 30,  // Default to 1 minute timeout with 2s interval
  } = config;

  return {
    handleCallback(url: URL): void {
      try {
        // Extract auth ID and toolkit ID from URL parameters
        const authId = url.searchParams.get('auth_id');
        const toolkitId = url.searchParams.get('toolkit');
        
        if (!authId) {
          throw new Error('Missing auth_id parameter in callback URL');
        }
        
        // Redirect to result page to handle the auth result
        const resultUrl = new URL(window.location.origin + resultPath);
        resultUrl.searchParams.set('auth_id', authId);
        if (toolkitId) {
          resultUrl.searchParams.set('toolkit', toolkitId);
        }
        
        // Redirect to result page
        window.location.href = resultUrl.toString();
      } catch (error) {
        // Handle any errors
        onError({
          authId: '',
          toolkitId: '',
          error: `Error handling callback: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
    
    handleResultPage(url: URL): void {
      try {
        // Extract auth ID and toolkit ID from URL parameters
        const authId = url.searchParams.get('auth_id');
        const toolkitId = url.searchParams.get('toolkit');
        
        if (!authId || !toolkitId) {
          throw new Error('Missing required parameters: auth_id and toolkit');
        }
        
        // Begin polling for auth status
        this.pollAuthStatus(authId, toolkitId);
      } catch (error) {
        // Handle any errors
        onError({
          authId: '',
          toolkitId: '',
          error: `Error handling result page: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
    
    async pollAuthStatus(authId: string, toolkitId: string): Promise<void> {
      let pollCount = 0;
      
      const poll = async (): Promise<void> => {
        try {
          // Check if we've reached the maximum poll count
          if (pollCount >= maxPollCount) {
            onError({
              authId,
              toolkitId,
              error: `Authentication timed out after ${maxPollCount} attempts`,
            });
            return;
          }
          
          pollCount++;
          
          // Get auth status from Arcade
          const response = await client.getAuthStatus(authId);
          
          // Update auth flow state
          authFlow.checkAuthStatus(response);
          
          // Handle auth status
          if (response.status === 'completed') {
            // Success
            onSuccess({
              authId,
              toolkitId,
              provider: response.provider_id || toolkitId,
              response,
            });
          } else if (response.status === 'failed') {
            // Error
            onError({
              authId,
              toolkitId,
              error: 'Authentication failed',
              response,
            });
          } else {
            // Still pending, continue polling
            setTimeout(poll, pollInterval);
          }
        } catch (error) {
          // Handle any errors
          onError({
            authId,
            toolkitId,
            error: `Error polling auth status: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      };
      
      // Start polling
      await poll();
    },
  };
}