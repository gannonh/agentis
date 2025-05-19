/**
 * Toolkit selector for managing Arcade toolkits in the UI
 */
import type { ArcadeAgentisTool } from './types';

/**
 * Auth status record mapping toolkit IDs to authentication status
 */
export interface AuthStatusRecord {
  [toolkitId: string]: {
    isAuthenticated: boolean;
    error?: string;
    lastChecked?: Date;
  };
}

/**
 * Configuration for the toolkit selector
 */
export interface ToolkitSelectorConfig {
  /** Available toolkits */
  toolkits: ArcadeAgentisTool[];
  /** Authentication status for toolkits */
  authStatus: AuthStatusRecord;
  /** Callback for starting authentication */
  onStartAuth: (toolkitId: string) => void;
  /** Callback for checking authentication status */
  onCheckAuth: (toolkitId: string) => void;
}

/**
 * Toolkit selector interface
 */
export interface ToolkitSelector {
  /** Get all available toolkits, optionally filtered by category */
  getAvailableToolkits(category?: string): ArcadeAgentisTool[];
  /** Get only authenticated toolkits */
  getAuthenticatedToolkits(): ArcadeAgentisTool[];
  /** Start authentication for a toolkit */
  startAuthentication(toolkitId: string): void;
  /** Check authentication status for a toolkit */
  checkAuthenticationStatus(toolkitId: string): void;
  /** Check if a toolkit is authenticated */
  isAuthenticated(toolkitId: string): boolean;
}

/**
 * Create a toolkit selector
 * 
 * @param config - Toolkit selector configuration
 * @returns Toolkit selector
 */
export function createToolkitSelector(config: ToolkitSelectorConfig): ToolkitSelector {
  const { toolkits, authStatus, onStartAuth, onCheckAuth } = config;
  
  return {
    getAvailableToolkits(category?: string): ArcadeAgentisTool[] {
      if (!category) {
        return [...toolkits];
      }
      
      return toolkits.filter(toolkit => toolkit.category === category);
    },
    
    getAuthenticatedToolkits(): ArcadeAgentisTool[] {
      return toolkits.filter(toolkit => 
        authStatus[toolkit.arcadeToolkitId]?.isAuthenticated === true
      );
    },
    
    startAuthentication(toolkitId: string): void {
      onStartAuth(toolkitId);
    },
    
    checkAuthenticationStatus(toolkitId: string): void {
      onCheckAuth(toolkitId);
    },
    
    isAuthenticated(toolkitId: string): boolean {
      return authStatus[toolkitId]?.isAuthenticated === true;
    }
  };
}