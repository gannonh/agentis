/**
 * API endpoints for Arcade integration
 */
import type { ArcadeClient } from './client';
import type { 
  ArcadeAuthResponse, 
  ArcadeExecuteToolResponse, 
  ArcadeToolsResponse 
} from '../types';
import type { AuthFlow } from '../ui/AuthFlow';
import type { ToolkitSelector } from '../ui/ToolkitSelector';
import type { ArcadeAgentisTool } from '../ui/types';

/**
 * Configuration for Arcade API endpoints
 */
export interface ArcadeEndpointsConfig {
  /** Arcade client */
  client: ArcadeClient;
  /** Authentication flow */
  authFlow: AuthFlow;
  /** Toolkit selector */
  toolkitSelector: ToolkitSelector;
  /** User ID */
  userId: string;
}

/**
 * Arcade API endpoints
 */
export interface ArcadeEndpoints {
  /** Get available toolkits */
  getAvailableToolkits(category?: string): Promise<ArcadeAgentisTool[]>;
  /** Get details for a specific toolkit */
  getToolkitDetails(toolkitId: string): Promise<ArcadeToolsResponse>;
  /** Start authentication for a toolkit */
  startToolkitAuth(toolkitId: string): Promise<ArcadeAuthResponse>;
  /** Check authentication status */
  checkAuthStatus(authId: string): Promise<ArcadeAuthResponse>;
  /** Execute a tool in a toolkit */
  executeToolkitTool(
    toolkitId: string,
    toolName: string,
    params: Record<string, unknown>,
    options?: { toolVersion?: string; runAt?: string }
  ): Promise<ArcadeExecuteToolResponse>;
}

/**
 * Create Arcade API endpoints
 * 
 * @param config - Endpoints configuration
 * @returns Arcade API endpoints
 */
export function createArcadeEndpoints(config: ArcadeEndpointsConfig): ArcadeEndpoints {
  const { client, authFlow, toolkitSelector } = config;
  
  return {
    async getAvailableToolkits(category?: string): Promise<ArcadeAgentisTool[]> {
      return toolkitSelector.getAvailableToolkits(category);
    },
    
    async getToolkitDetails(toolkitId: string): Promise<ArcadeToolsResponse> {
      return client.getTools({ toolkit: toolkitId });
    },
    
    async startToolkitAuth(toolkitId: string): Promise<ArcadeAuthResponse> {
      // Start authentication with Arcade
      const response = await client.authorizeToolkit(toolkitId);
      
      // Update auth flow state
      authFlow.startAuth(toolkitId, response);
      
      return response;
    },
    
    async checkAuthStatus(authId: string): Promise<ArcadeAuthResponse> {
      // Check status with Arcade
      const response = await client.getAuthStatus(authId);
      
      // Update auth flow state
      authFlow.checkAuthStatus(response);
      
      return response;
    },
    
    async executeToolkitTool(
      toolkitId: string,
      toolName: string,
      params: Record<string, unknown>,
      options?: { toolVersion?: string; runAt?: string }
    ): Promise<ArcadeExecuteToolResponse> {
      // Format the fully qualified tool name
      const fullToolName = `${toolkitId}.${toolName}`;
      
      // Execute the tool
      return client.executeTool(fullToolName, params, options);
    },
  };
}