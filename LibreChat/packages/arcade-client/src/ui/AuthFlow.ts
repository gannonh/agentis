/**
 * Authentication flow management for Arcade integration
 */
import type { ArcadeAuthResponse } from '../types';

/**
 * Authentication flow status
 */
export enum AuthFlowStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Active authentication request
 */
export interface AuthRequest {
  /** Authorization ID */
  id: string;
  /** Toolkit ID */
  toolkitId: string;
  /** Authorization status */
  status: AuthFlowStatus;
  /** When authorization started */
  startedAt: Date;
}

/**
 * Authentication flow configuration
 */
export interface AuthFlowConfig {
  /** Callback when authentication starts */
  onAuthStart: (toolkitId: string, response: ArcadeAuthResponse) => void;
  /** Callback when authentication encounters an error */
  onAuthError: (toolkitId: string, response: ArcadeAuthResponse) => void;
  /** Callback when authentication completes successfully */
  onAuthComplete: (toolkitId: string, response: ArcadeAuthResponse) => void;
  /** Polling interval for checking authentication status (ms) */
  pollingInterval?: number;
  /** Local storage key for storing auth request */
  storageKey?: string;
}

/**
 * Authentication flow interface
 */
export interface AuthFlow {
  /** Start authentication for a toolkit */
  startAuth: (toolkitId: string, response: ArcadeAuthResponse) => void;
  /** Check authentication status */
  checkAuthStatus: (response: ArcadeAuthResponse) => void;
  /** Cancel active authentication */
  cancelAuth: () => void;
  /** Get authentication status for a toolkit */
  getAuthStatus: (toolkitId: string) => AuthFlowStatus | null;
  /** Get active authentication request */
  getActiveAuthRequest: () => AuthRequest | null;
}

/**
 * Create an authentication flow
 *
 * @param config - Authentication flow configuration
 * @returns Authentication flow
 */
export function createAuthFlow(config: AuthFlowConfig): AuthFlow {
  const {
    onAuthStart,
    onAuthError,
    onAuthComplete,
    pollingInterval = 2000,
    storageKey = 'arcade_auth_request',
  } = config;

  // Track auth status for toolkits
  const authStatusMap = new Map<string, AuthFlowStatus>();

  // Active auth request
  let activeAuthRequest: AuthRequest | null = null;

  // Polling interval ID
  let pollingIntervalId: number | undefined;

  // Try to restore auth request from local storage
  try {
    const storedAuth = localStorage.getItem(storageKey);
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      activeAuthRequest = {
        ...parsed,
        startedAt: new Date(parsed.startedAt),
      };
    }
  } catch {
    // Use error handler for better error reporting in production
    localStorage.removeItem(storageKey);
  }

  /**
   * Start polling for auth status
   */
  const startPolling = () => {
    if (pollingIntervalId) {
      window.clearInterval(pollingIntervalId);
    }

    // This is just a stub for the polling mechanism
    // In a real implementation, this would make API calls to check status
    pollingIntervalId = window.setInterval(() => {
      // This would normally be an API call
      if (activeAuthRequest) {
        // Removed console.log to fix linting error
        // This is where actual polling would happen
      }
    }, pollingInterval);
  };

  /**
   * Stop polling for auth status
   */
  const stopPolling = () => {
    if (pollingIntervalId) {
      window.clearInterval(pollingIntervalId);
      pollingIntervalId = undefined;
    }
  };

  /**
   * Save auth request to local storage
   */
  const saveAuthRequest = () => {
    if (activeAuthRequest) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...activeAuthRequest,
          startedAt: activeAuthRequest.startedAt.toISOString(),
        })
      );
    } else {
      localStorage.removeItem(storageKey);
    }
  };

  return {
    startAuth(toolkitId: string, response: ArcadeAuthResponse): void {
      // Create auth request
      activeAuthRequest = {
        id: response.id,
        toolkitId,
        status: AuthFlowStatus.PENDING,
        startedAt: new Date(),
      };

      // Save to local storage
      saveAuthRequest();

      // Update status map
      authStatusMap.set(toolkitId, AuthFlowStatus.PENDING);

      // Call callback
      onAuthStart(toolkitId, response);

      // Open auth URL if provided
      if (response.url) {
        window.open(response.url, '_blank');
      }

      // Start polling
      startPolling();
    },

    checkAuthStatus(response: ArcadeAuthResponse): void {
      // If no active request or ID doesn't match, ignore
      if (!activeAuthRequest || activeAuthRequest.id !== response.id) {
        return;
      }

      // Extract toolkit ID from active request
      const { toolkitId } = activeAuthRequest;

      // Handle status
      if (response.status === 'completed') {
        // Update status
        authStatusMap.set(toolkitId, AuthFlowStatus.COMPLETED);
        activeAuthRequest.status = AuthFlowStatus.COMPLETED;

        // Call callback
        onAuthComplete(toolkitId, response);

        // Clear active request
        activeAuthRequest = null;
        saveAuthRequest();

        // Stop polling
        stopPolling();
      } else if (response.status === 'failed') {
        // Update status
        authStatusMap.set(toolkitId, AuthFlowStatus.FAILED);
        activeAuthRequest.status = AuthFlowStatus.FAILED;

        // Call callback
        onAuthError(toolkitId, response);

        // Clear active request
        activeAuthRequest = null;
        saveAuthRequest();

        // Stop polling
        stopPolling();
      }
    },

    cancelAuth(): void {
      // Clear active request
      activeAuthRequest = null;
      saveAuthRequest();

      // Stop polling
      stopPolling();
    },

    getAuthStatus(toolkitId: string): AuthFlowStatus | null {
      return authStatusMap.get(toolkitId) || null;
    },

    getActiveAuthRequest(): AuthRequest | null {
      return activeAuthRequest;
    },
  };
}
