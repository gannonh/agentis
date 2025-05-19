/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for Arcade API endpoints
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { createArcadeEndpoints } from '../endpoints';
import type { ArcadeClient } from '../client';
import type { ArcadeAuthResponse, ArcadeExecuteToolResponse } from '../../types';

describe('Arcade API Endpoints', () => {
  // Mock Arcade client
  const mockClient = {
    getTools: jest.fn(),
    getEnabledTools: jest.fn(),
    getTool: jest.fn(),
    executeTool: jest.fn(),
    authorizeToolkit: jest.fn(),
    getAuthStatus: jest.fn(),
    initiateAuth: jest.fn(),
    health: jest.fn(),
  } as unknown as jest.Mocked<ArcadeClient>;

  // Mock auth flow
  const mockAuthFlow = {
    startAuth: jest.fn(),
    checkAuthStatus: jest.fn(),
    cancelAuth: jest.fn(),
    getAuthStatus: jest.fn(),
    getActiveAuthRequest: jest.fn(),
  };

  // Mock toolkit selector
  const mockToolkitSelector = {
    getAvailableToolkits: jest.fn(),
    getAuthenticatedToolkits: jest.fn(),
    startAuthentication: jest.fn(),
    checkAuthenticationStatus: jest.fn(),
    isAuthenticated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create endpoints with correct methods', () => {
    const endpoints = createArcadeEndpoints({
      client: mockClient,
      authFlow: mockAuthFlow,
      toolkitSelector: mockToolkitSelector,
      userId: 'test-user',
    });

    expect(endpoints).toHaveProperty('getAvailableToolkits');
    expect(endpoints).toHaveProperty('getToolkitDetails');
    expect(endpoints).toHaveProperty('startToolkitAuth');
    expect(endpoints).toHaveProperty('checkAuthStatus');
    expect(endpoints).toHaveProperty('executeToolkitTool');
  });

  describe('getAvailableToolkits', () => {
    it('should return available toolkits from the selector', async () => {
      const mockToolkits = [
        { id: 'arcade-github', name: 'GitHub', arcadeToolkitId: 'github' },
        { id: 'arcade-google', name: 'Google', arcadeToolkitId: 'google' },
      ];

      mockToolkitSelector.getAvailableToolkits.mockReturnValue(mockToolkits as any);

      const endpoints = createArcadeEndpoints({
        client: mockClient,
        authFlow: mockAuthFlow,
        toolkitSelector: mockToolkitSelector,
        userId: 'test-user',
      });

      const result = await endpoints.getAvailableToolkits();

      expect(result).toEqual(mockToolkits);
      expect(mockToolkitSelector.getAvailableToolkits).toHaveBeenCalled();
    });

    it('should filter by category if provided', async () => {
      const mockToolkits = [{ id: 'arcade-github', name: 'GitHub', arcadeToolkitId: 'github' }];

      mockToolkitSelector.getAvailableToolkits.mockReturnValue(mockToolkits as any);

      const endpoints = createArcadeEndpoints({
        client: mockClient,
        authFlow: mockAuthFlow,
        toolkitSelector: mockToolkitSelector,
        userId: 'test-user',
      });

      const result = await endpoints.getAvailableToolkits('Developer Tools');

      expect(result).toEqual(mockToolkits);
      expect(mockToolkitSelector.getAvailableToolkits).toHaveBeenCalledWith('Developer Tools');
    });
  });

  describe('getToolkitDetails', () => {
    it('should get toolkit details from the client', async () => {
      const mockTools = {
        items: [
          { name: 'CreateIssue', fully_qualified_name: 'github.CreateIssue' },
          { name: 'ListIssues', fully_qualified_name: 'github.ListIssues' },
        ],
      };

      mockClient.getTools.mockResolvedValue(mockTools as any);

      const endpoints = createArcadeEndpoints({
        client: mockClient,
        authFlow: mockAuthFlow,
        toolkitSelector: mockToolkitSelector,
        userId: 'test-user',
      });

      const result = await endpoints.getToolkitDetails('github');

      expect(result).toEqual(mockTools);
      expect(mockClient.getTools).toHaveBeenCalledWith({ toolkit: 'github' });
    });
  });

  describe('startToolkitAuth', () => {
    it('should initiate authentication for a toolkit', async () => {
      const mockAuthResponse: ArcadeAuthResponse = {
        id: 'auth-123',
        status: 'pending',
        url: 'https://example.com/auth',
      };

      mockClient.authorizeToolkit.mockResolvedValue(mockAuthResponse);

      const endpoints = createArcadeEndpoints({
        client: mockClient,
        authFlow: mockAuthFlow,
        toolkitSelector: mockToolkitSelector,
        userId: 'test-user',
      });

      const result = await endpoints.startToolkitAuth('github');

      expect(result).toEqual(mockAuthResponse);
      expect(mockClient.authorizeToolkit).toHaveBeenCalledWith('github');
      expect(mockAuthFlow.startAuth).toHaveBeenCalledWith('github', mockAuthResponse);
    });
  });

  describe('checkAuthStatus', () => {
    it('should check authentication status for an auth ID', async () => {
      const mockAuthResponse: ArcadeAuthResponse = {
        id: 'auth-123',
        status: 'completed',
      };

      mockClient.getAuthStatus.mockResolvedValue(mockAuthResponse);

      const endpoints = createArcadeEndpoints({
        client: mockClient,
        authFlow: mockAuthFlow,
        toolkitSelector: mockToolkitSelector,
        userId: 'test-user',
      });

      const result = await endpoints.checkAuthStatus('auth-123');

      expect(result).toEqual(mockAuthResponse);
      expect(mockClient.getAuthStatus).toHaveBeenCalledWith('auth-123');
      expect(mockAuthFlow.checkAuthStatus).toHaveBeenCalledWith(mockAuthResponse);
    });
  });

  describe('executeToolkitTool', () => {
    it('should execute a tool in a toolkit', async () => {
      const mockExecuteResponse: ArcadeExecuteToolResponse = {
        success: true,
        output: {
          value: { id: 123, title: 'New Issue' },
        },
      };

      mockClient.executeTool.mockResolvedValue(mockExecuteResponse);

      const endpoints = createArcadeEndpoints({
        client: mockClient,
        authFlow: mockAuthFlow,
        toolkitSelector: mockToolkitSelector,
        userId: 'test-user',
      });

      const result = await endpoints.executeToolkitTool('github', 'CreateIssue', {
        repository: 'user/repo',
        title: 'New Issue',
      });

      expect(result).toEqual(mockExecuteResponse);
      expect(mockClient.executeTool).toHaveBeenCalledWith(
        'github.CreateIssue',
        { repository: 'user/repo', title: 'New Issue' },
        undefined
      );
    });

    it('should handle tool execution with version parameter', async () => {
      const mockExecuteResponse: ArcadeExecuteToolResponse = {
        success: true,
      };

      mockClient.executeTool.mockResolvedValue(mockExecuteResponse);

      const endpoints = createArcadeEndpoints({
        client: mockClient,
        authFlow: mockAuthFlow,
        toolkitSelector: mockToolkitSelector,
        userId: 'test-user',
      });

      const result = await endpoints.executeToolkitTool(
        'github',
        'CreateIssue',
        {},
        { toolVersion: '1.0' }
      );

      expect(result).toEqual(mockExecuteResponse);
      expect(mockClient.executeTool).toHaveBeenCalledWith(
        'github.CreateIssue',
        {},
        { toolVersion: '1.0' }
      );
    });
  });
});
