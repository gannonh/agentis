/**
 * ArcadeClient: Main client for interacting with the Arcade API.
 * Provides methods for authentication, tool execution, and toolkit management.
 */

import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

import type {
  ArcadeConfig,
  ArcadeAuthResponse,
  ArcadeToolsResponse,
  ArcadeToolResponse,
  ArcadeExecuteToolRequest,
  ArcadeExecuteToolResponse,
  ArcadeToolAuthRequest,
  ArcadeAuthInitiationRequest,
  ArcadeFormattedToolOptions,
  ArcadeHealthResponse,
  ArcadeChatRequest,
  ArcadeChatResponse,
} from '../types';

/**
 * Configuration validation schema
 */
const configSchema = z.object({
  enabled: z.boolean(),
  api_key: z.string(),
  callback_url: z.string().url(),
  hosting: z.enum(['cloud', 'hybrid', 'self_hosted']),
  toolkits: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      category: z.string(),
      description: z.string(),
      icon: z.string().optional(),
    })
  ),
  engine: z
    .object({
      host: z.string(),
      port: z.number(),
    })
    .optional(),
  worker: z
    .object({
      enabled: z.boolean(),
      host: z.string(),
      port: z.number(),
      image: z.string().optional(),
    })
    .optional(),
});

/**
 * Main Arcade API client
 */
export class ArcadeClient {
  private apiKey: string;
  private userId: string;
  private baseUrl: string;
  private http: AxiosInstance;
  private config: ArcadeConfig;

  /**
   * Create a new Arcade client
   *
   * @param config - Arcade configuration
   * @param userId - User ID for authorization
   */
  constructor(config: ArcadeConfig, userId: string) {
    // Validate configuration
    try {
      configSchema.parse(config);
    } catch (error) {
      throw new Error(
        `Invalid Arcade configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    this.config = config;
    this.apiKey = config.api_key;
    this.userId = userId;

    // Determine base URL based on hosting type
    this.baseUrl =
      config.hosting === 'self_hosted'
        ? `http://${config.engine?.host || 'localhost'}:${config.engine?.port || 8000}/v1`
        : 'https://api.arcade.dev/v1';

    // Create HTTP client with default headers
    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for error handling
    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        // Log the error details for debugging
        console.error('Arcade API Error:', error.response?.data || error.message);

        // Throw a more user-friendly error
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || 'Unknown error';

          if (status === 401) {
            throw new Error(`Authentication failed: ${message}`);
          } else if (status === 403) {
            throw new Error(`Access denied: ${message}`);
          } else if (status === 404) {
            throw new Error(`Resource not found: ${message}`);
          } else if (status >= 500) {
            throw new Error(`Arcade server error: ${message}`);
          }
        }

        throw error;
      }
    );
  }

  /**
   * Check the health of the Arcade API
   *
   * @returns Health status response
   */
  async health(): Promise<ArcadeHealthResponse> {
    try {
      const response = await this.http.get<ArcadeHealthResponse>('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return { healthy: false };
    }
  }

  /**
   * Get all available toolkits
   *
   * @param options - Pagination and filtering options
   * @returns List of available toolkits
   */
  async getTools(options?: ArcadeFormattedToolOptions): Promise<ArcadeToolsResponse> {
    const params: Record<string, string | number> = {};

    if (options) {
      if (options.toolkit) params.toolkit = options.toolkit;
      if (options.limit) params.limit = options.limit;
      if (options.offset) params.offset = options.offset;
      if (options.format) params.format = options.format;
    }

    const response = await this.http.get<ArcadeToolsResponse>('/tools', { params });
    return response.data;
  }

  /**
   * Get a specific tool by name
   *
   * @param toolName - The fully qualified tool name (toolkit.tool)
   * @returns Tool details
   */
  async getTool(toolName: string): Promise<ArcadeToolResponse> {
    const response = await this.http.get<ArcadeToolResponse>(
      `/tools/${encodeURIComponent(toolName)}`
    );
    return response.data;
  }

  /**
   * Get tools filtered by the enabled toolkits in configuration
   *
   * @returns Filtered list of tools based on enabled toolkits
   */
  async getEnabledTools(): Promise<ArcadeToolsResponse> {
    const toolkitIds = this.config.toolkits.map((t) => t.id);

    // If no toolkits are configured, return an empty list
    if (toolkitIds.length === 0) {
      return {
        items: [],
        limit: 0,
        offset: 0,
        page_count: 0,
        total_count: 0,
      };
    }

    // Fetch all tools
    const allTools = await this.getTools({ limit: 100 });

    // Filter by enabled toolkits
    const filteredItems = allTools.items.filter((tool) =>
      toolkitIds.includes(tool.toolkit.name.toLowerCase())
    );

    return {
      ...allTools,
      items: filteredItems,
      total_count: filteredItems.length,
    };
  }

  /**
   * Execute a tool
   *
   * @param toolName - Tool name (toolkit.tool format)
   * @param params - Tool input parameters
   * @param options - Additional execution options
   * @returns Tool execution result
   */
  async executeTool(
    toolName: string,
    params: Record<string, unknown>,
    options?: { runAt?: string; toolVersion?: string }
  ): Promise<ArcadeExecuteToolResponse> {
    const request: ArcadeExecuteToolRequest = {
      tool_name: toolName,
      user_id: this.userId,
      input: params,
    };

    if (options) {
      if (options.toolVersion) request.tool_version = options.toolVersion;
      if (options.runAt) request.run_at = options.runAt;
    }

    const response = await this.http.post<ArcadeExecuteToolResponse>('/tools/execute', request);

    return response.data;
  }

  /**
   * Start tool authorization process
   *
   * @param toolName - Tool name (toolkit.tool or toolkit.* for all tools in a toolkit)
   * @param toolVersion - Optional tool version
   * @returns Authorization response with URL for user to complete auth
   */
  async authorizeToolkit(toolName: string, toolVersion?: string): Promise<ArcadeAuthResponse> {
    const request: ArcadeToolAuthRequest = {
      tool_name: toolName,
      user_id: this.userId,
    };

    if (toolVersion) {
      request.tool_version = toolVersion;
    }

    const response = await this.http.post<ArcadeAuthResponse>('/tools/authorize', request);

    return response.data;
  }

  /**
   * Check authorization status
   *
   * @param authId - Authorization ID from previous authorize call
   * @returns Current authorization status
   */
  async getAuthStatus(authId: string): Promise<ArcadeAuthResponse> {
    const response = await this.http.get<ArcadeAuthResponse>(`/auth/status?id=${authId}`);

    return response.data;
  }

  /**
   * Initiate direct authorization with authorization requirement
   *
   * @param authRequirement - Authorization requirement details
   * @returns Authorization response
   */
  async initiateAuth(authRequirement: ArcadeAuthInitiationRequest): Promise<ArcadeAuthResponse> {
    const response = await this.http.post<ArcadeAuthResponse>('/auth/initiate', authRequirement);

    return response.data;
  }

  /**
   * Complete chat with tools
   *
   * @param request - Chat request with optional tools
   * @returns Chat completion response
   */
  async chat(request: ArcadeChatRequest): Promise<ArcadeChatResponse> {
    const response = await this.http.post<ArcadeChatResponse>('/chat/completions', request);

    return response.data;
  }

  /**
   * Map Arcade toolkit to Agentis/LibreChat tool format
   *
   * @param toolkitId - Toolkit ID to map
   * @returns Mapped tool definition in LibreChat format
   */
  mapToolkitToLibreChatTool(toolkitId: string): Record<string, unknown> {
    // Find the toolkit in configuration
    const toolkit = this.config.toolkits.find((t) => t.id === toolkitId);

    if (!toolkit) {
      throw new Error(`Toolkit ${toolkitId} not found in configuration`);
    }

    // Create a LibreChat tool definition (simplified example)
    return {
      name: toolkit.name,
      id: `arcade-${toolkitId}`,
      description: toolkit.description,
      category: toolkit.category,
      icon: toolkit.icon || 'default-icon.png',
      requiresAuth: true,
      authType: 'oauth',
      authProvider: 'arcade',
      isArcade: true,
      arcadeToolkitId: toolkitId,
    };
  }
}

/**
 * Create a client with validation
 *
 * @param config - Arcade configuration
 * @param userId - User ID for authorization
 * @returns Configured Arcade client
 */
export function createArcadeClient(config: ArcadeConfig, userId: string): ArcadeClient {
  if (!config.enabled) {
    throw new Error('Arcade is not enabled in configuration');
  }

  return new ArcadeClient(config, userId);
}
