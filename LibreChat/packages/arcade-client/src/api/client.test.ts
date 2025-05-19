/**
 * Tests for the Arcade Client implementation
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { ArcadeClient, createArcadeClient } from './client';
import type {
  ArcadeConfig,
  ArcadeHealthResponse,
  ArcadeToolsResponse,
  ArcadeExecuteToolResponse,
  ArcadeToolResponse,
  ArcadeFormattedToolOptions,
} from '../types';

// Mock axios
jest.mock('axios');

describe('ArcadeClient', () => {
  // Sample configuration for testing
  const mockConfig: ArcadeConfig = {
    enabled: true,
    api_key: 'test-api-key',
    callback_url: 'https://example.com/callback',
    hosting: 'cloud',
    toolkits: [
      {
        id: 'github',
        name: 'GitHub',
        category: 'Developer Tools',
        description: 'GitHub integration',
      },
    ],
  };

  const userId = 'test-user-id';
  let client: ArcadeClient;
  let mockGet: jest.MockedFunction<
    (url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse>
  >;
  let mockPost: jest.MockedFunction<
    (url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<AxiosResponse>
  >;
  let mockResponse: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up axios mock for create
    mockGet = jest.fn();
    mockPost = jest.fn();
    mockResponse = jest.fn();

    // Mock axios.create to return an object with get and post methods
    (axios.create as jest.Mock).mockReturnValue({
      get: mockGet,
      post: mockPost,
      interceptors: {
        response: {
          use: mockResponse,
        },
      },
    });

    // Create client
    client = createArcadeClient(mockConfig, userId);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createArcadeClient', () => {
    it('should create an instance of ArcadeClient', () => {
      expect(client).toBeInstanceOf(ArcadeClient);
    });

    it('should throw an error if Arcade is not enabled', () => {
      const disabledConfig = { ...mockConfig, enabled: false };
      expect(() => createArcadeClient(disabledConfig, userId)).toThrow('Arcade is not enabled');
    });

    it('should initialize axios with correct configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.arcade.dev/v1',
        headers: {
          Authorization: `Bearer ${mockConfig.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('should use the engine config for self-hosted deployment', () => {
      const selfHostedConfig = {
        ...mockConfig,
        hosting: 'self_hosted' as const,
        engine: { host: 'localhost', port: 8000 },
      };

      jest.clearAllMocks();
      createArcadeClient(selfHostedConfig, userId);

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:8000/v1',
        })
      );
    });
  });

  describe('health', () => {
    it('should fetch the health status', async () => {
      const mockHealthResponse: ArcadeHealthResponse = { healthy: true };
      mockGet.mockResolvedValueOnce({ data: mockHealthResponse } as AxiosResponse);

      const result = await client.health();

      expect(mockGet).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockHealthResponse);
    });

    it('should handle errors and return unhealthy status', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.health();

      expect(result).toEqual({ healthy: false });
    });
  });

  describe('getTools', () => {
    it('should fetch tools with default parameters', async () => {
      const mockToolResponse: Partial<ArcadeToolResponse> = { name: 'tool1' };
      const mockTools: ArcadeToolsResponse = {
        items: [mockToolResponse as ArcadeToolResponse],
        limit: 10,
        offset: 0,
        page_count: 1,
        total_count: 1,
      };
      mockGet.mockResolvedValueOnce({ data: mockTools } as AxiosResponse);

      const result = await client.getTools();

      expect(mockGet).toHaveBeenCalledWith('/tools', { params: {} });
      expect(result).toEqual(mockTools);
    });

    it('should include query parameters when provided', async () => {
      mockGet.mockResolvedValueOnce({ data: {} } as AxiosResponse);

      const options: ArcadeFormattedToolOptions = {
        toolkit: 'github',
        limit: 20,
        offset: 10,
        format: 'json',
      };

      await client.getTools(options);

      expect(mockGet).toHaveBeenCalledWith('/tools', {
        params: {
          toolkit: 'github',
          limit: 20,
          offset: 10,
          format: 'json',
        },
      });
    });
  });

  describe('executeTool', () => {
    it('should call the execute endpoint with the correct parameters', async () => {
      const mockResponse: ArcadeExecuteToolResponse = { success: true };
      mockPost.mockResolvedValueOnce({ data: mockResponse } as AxiosResponse);

      const toolName = 'github.createIssue';
      const params = { repo: 'user/repo', title: 'Test issue' };

      const result = await client.executeTool(toolName, params);

      expect(mockPost).toHaveBeenCalledWith('/tools/execute', {
        tool_name: toolName,
        user_id: userId,
        input: params,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include optional parameters when provided', async () => {
      mockPost.mockResolvedValueOnce({ data: {} } as AxiosResponse);

      await client.executeTool(
        'github.createIssue',
        {},
        {
          toolVersion: '1.0',
          runAt: '2023-01-01T00:00:00Z',
        }
      );

      expect(mockPost).toHaveBeenCalledWith('/tools/execute', {
        tool_name: 'github.createIssue',
        user_id: userId,
        input: {},
        tool_version: '1.0',
        run_at: '2023-01-01T00:00:00Z',
      });
    });
  });

  describe('mapToolkitToLibreChatTool', () => {
    it('should map toolkit configuration to LibreChat tool format', () => {
      const result = client.mapToolkitToLibreChatTool('github');

      expect(result).toEqual({
        name: 'GitHub',
        id: 'arcade-github',
        description: 'GitHub integration',
        category: 'Developer Tools',
        icon: 'default-icon.png',
        requiresAuth: true,
        authType: 'oauth',
        authProvider: 'arcade',
        isArcade: true,
        arcadeToolkitId: 'github',
      });
    });

    it('should throw an error if toolkit is not found', () => {
      expect(() => client.mapToolkitToLibreChatTool('invalid-toolkit')).toThrow(
        'Toolkit invalid-toolkit not found in configuration'
      );
    });
  });
});
