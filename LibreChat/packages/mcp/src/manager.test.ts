import { MCPManager } from './manager';
import { MCPConnection } from './connection';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from 'winston';
import type { MCPOptions } from 'librechat-data-provider';

// Mock the MCPConnection class
jest.mock('./connection');
const MockMCPConnection = MCPConnection as jest.MockedClass<typeof MCPConnection>;

// Mock logger
const mockLogger: Logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

describe('MCPManager', () => {
  let manager: MCPManager;
  let mockConnection: jest.Mocked<MCPConnection>;

  beforeEach(() => {
    // Reset the singleton instance
    (MCPManager as any).instance = null;

    // Create manager instance
    manager = MCPManager.getInstance(mockLogger);

    // Create mock connection instance
    mockConnection = {
      isConnected: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(undefined),
      serverName: 'test-server',
      client: {
        getServerCapabilities: jest.fn().mockReturnValue({}),
        listTools: jest.fn().mockResolvedValue({ tools: [] }),
        request: jest.fn(),
      },
    } as any;

    // Mock the constructor to return our mock
    MockMCPConnection.mockImplementation(() => mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (MCPManager as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = MCPManager.getInstance(mockLogger);
      const instance2 = MCPManager.getInstance(mockLogger);
      
      expect(instance1).toBe(instance2);
    });

    it('should use default logger when none provided', () => {
      const instance = MCPManager.getInstance();
      expect(instance).toBeDefined();
    });
  });

  describe('App-level Server Initialization', () => {
    it('should initialize app-level servers successfully', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      // Mock successful connection
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);

      await manager.initializeMCP({ 'test-server': serverConfig });

      expect(mockConnection.connect).toHaveBeenCalled();
      expect(manager.getConnection('test-server')).toBeDefined();
    });

    it('should handle initialization failures gracefully', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      // Mock connection failure
      mockConnection.isConnected.mockResolvedValue(false);
      mockConnection.connect.mockRejectedValue(new Error('Connection failed'));

      // Should not throw
      await expect(manager.initializeMCP({ 'test-server': serverConfig })).resolves.not.toThrow();
      
      // Should not add failed connections
      expect(manager.getConnection('test-server')).toBeUndefined();
    });

    it('should store processing function and connected account resolver', async () => {
      const processMCPEnv = jest.fn((config) => config);
      const connectedAccountResolver = jest.fn().mockResolvedValue('account-123');

      await manager.initializeMCP({}, processMCPEnv, connectedAccountResolver);

      // Verify they were stored (we can't directly test this, but we test the behavior later)
      expect(processMCPEnv).not.toHaveBeenCalled(); // Not called for app-level
    });

    it('should retry connection attempts on failure', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      // Mock connection failures followed by success
      mockConnection.connect
        .mockRejectedValueOnce(new Error('Connection failed 1'))
        .mockRejectedValueOnce(new Error('Connection failed 2'))
        .mockResolvedValueOnce(undefined);

      mockConnection.isConnected.mockResolvedValue(true);

      await manager.initializeMCP({ 'test-server': serverConfig });

      expect(mockConnection.connect).toHaveBeenCalledTimes(3);
      expect(manager.getConnection('test-server')).toBeDefined();
    }, 10000);
  });

  describe('User Connection Management', () => {
    beforeEach(async () => {
      // Initialize with a basic server config
      await manager.initializeMCP({
        'test-server': { command: 'test-command', args: [] }
      });
    });

    it('should create user connections on demand', async () => {
      const userId = 'user-123';
      
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);

      const connection = await manager.getUserConnection(userId, 'test-server');
      
      expect(connection).toBeDefined();
      expect(mockConnection.connect).toHaveBeenCalled();
    });

    it('should reuse existing user connections', async () => {
      const userId = 'user-123';
      
      // Mock successful connection for both calls
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);

      const connection1 = await manager.getUserConnection(userId, 'test-server');
      const connection2 = await manager.getUserConnection(userId, 'test-server');
      
      // Both should be the same instance
      expect(connection1).toBe(connection2);
    });

    it('should disconnect user connections', async () => {
      const userId = 'user-123';
      
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.disconnect.mockResolvedValue(undefined);

      await manager.getUserConnection(userId, 'test-server');
      await manager.disconnectUserConnection(userId, 'test-server');
      
      expect(mockConnection.disconnect).toHaveBeenCalled();
    });

    it('should disconnect all user connections', async () => {
      const userId = 'user-123';
      
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.disconnect.mockResolvedValue(undefined);

      await manager.getUserConnection(userId, 'test-server');
      await manager.disconnectUserConnections(userId);
      
      expect(mockConnection.disconnect).toHaveBeenCalled();
    });
  });

  describe('Composio Authentication', () => {
    let connectedAccountResolver: jest.Mock;

    beforeEach(async () => {
      connectedAccountResolver = jest.fn();
      
      // Initialize with Composio server
      await manager.initializeMCP(
        {
          'googlesheets': {
            type: 'sse',
            url: 'https://mcp.composio.dev/composio/server/uuid/sse?user_id={{LIBRECHAT_USER_ID}}&connected_account_id={{COMPOSIO_CONNECTED_ACCOUNT_ID}}'
          }
        },
        undefined,
        connectedAccountResolver
      );
    });

    it('should throw authentication error when no connected account found', async () => {
      const userId = 'user-123';
      connectedAccountResolver.mockResolvedValue(null);

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);

      await expect(
        manager.callTool({
          serverName: 'googlesheets',
          toolName: 'test-tool',
          provider: 'openai',
          options: { userId }
        })
      ).rejects.toThrow();

      // Check that the error has authentication properties
      try {
        await manager.callTool({
          serverName: 'googlesheets',
          toolName: 'test-tool',
          provider: 'openai',
          options: { userId }
        });
      } catch (error: any) {
        expect(error.authenticationRequired).toBe(true);
        expect(error.service).toBe('googlesheets');
      }
    });

    it('should proceed when connected account is found', async () => {
      const userId = 'user-123';
      connectedAccountResolver.mockResolvedValue('account-123');

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.client.request.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool executed successfully' }]
      });

      await manager.callTool({
        serverName: 'googlesheets',
        toolName: 'test-tool',
        provider: 'openai',
        options: { userId }
      });

      expect(connectedAccountResolver).toHaveBeenCalledWith(userId, 'googlesheets');
      expect(mockConnection.client.request).toHaveBeenCalled();
    });

    it('should not check authentication for non-Composio servers', async () => {
      const userId = 'user-123';
      
      // Add a non-Composio server
      await manager.initializeMCP({
        'regular-server': { command: 'test-command', args: [] }
      });

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.client.request.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool executed successfully' }]
      });

      await manager.callTool({
        serverName: 'regular-server',
        toolName: 'test-tool',
        provider: 'openai',
        options: { userId }
      });

      expect(connectedAccountResolver).not.toHaveBeenCalled();
      expect(mockConnection.client.request).toHaveBeenCalled();
    });

    it('should handle authentication resolver errors gracefully', async () => {
      const userId = 'user-123';
      connectedAccountResolver.mockRejectedValue(new Error('Resolver failed'));

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.client.request.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool executed successfully' }]
      });

      // Should continue with tool call despite resolver error
      await manager.callTool({
        serverName: 'googlesheets',
        toolName: 'test-tool',
        provider: 'openai',
        options: { userId }
      });

      expect(mockConnection.client.request).toHaveBeenCalled();
    });
  });

  describe('Tool Calling', () => {
    beforeEach(async () => {
      await manager.initializeMCP({
        'test-server': { command: 'test-command', args: [] }
      });
    });

    it('should call tools on app-level connections when no userId provided', async () => {
      // First ensure the app-level connection is established
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.client.request.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool result' }]
      });

      await manager.initializeMCP({ 'test-server': serverConfig });

      const result = await manager.callTool({
        serverName: 'test-server',
        toolName: 'test-tool',
        provider: 'openai'
      });

      expect(result).toBeDefined();
      expect(mockConnection.client.request).toHaveBeenCalledWith(
        {
          method: 'tools/call',
          params: {
            name: 'test-tool',
            arguments: undefined,
          },
        },
        expect.anything(),
        expect.anything()
      );
    });

    it('should call tools on user connections when userId provided', async () => {
      const userId = 'user-123';
      
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.client.request.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool result' }]
      });

      const result = await manager.callTool({
        serverName: 'test-server',
        toolName: 'test-tool',
        provider: 'openai',
        options: { userId }
      });

      expect(result).toBeDefined();
      expect(mockConnection.client.request).toHaveBeenCalled();
    });

    it('should handle tool call errors', async () => {
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.client.request.mockRejectedValue(new Error('Tool failed'));

      await expect(
        manager.callTool({
          serverName: 'test-server',
          toolName: 'test-tool',
          provider: 'openai'
        })
      ).rejects.toThrow();
    });

    it('should throw error for unknown servers', async () => {
      await expect(
        manager.callTool({
          serverName: 'unknown-server',
          toolName: 'test-tool',
          provider: 'openai'
        })
      ).rejects.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should return app-level connections', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);

      await manager.initializeMCP({ 'test-server': serverConfig });

      const connection = manager.getConnection('test-server');
      expect(connection).toBeDefined();
    });

    it('should return all connections', async () => {
      const serverConfigs = {
        'server-1': { command: 'cmd1', args: [] },
        'server-2': { command: 'cmd2', args: [] }
      };

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);

      await manager.initializeMCP(serverConfigs);

      const allConnections = manager.getAllConnections();
      expect(allConnections.size).toBe(2);
      expect(allConnections.has('server-1')).toBe(true);
      expect(allConnections.has('server-2')).toBe(true);
    });

    it('should disconnect individual servers', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.disconnect.mockResolvedValue(undefined);

      await manager.initializeMCP({ 'test-server': serverConfig });
      await manager.disconnectServer('test-server');

      expect(mockConnection.disconnect).toHaveBeenCalled();
      expect(manager.getConnection('test-server')).toBeUndefined();
    });

    it('should disconnect all servers', async () => {
      const serverConfigs = {
        'server-1': { command: 'cmd1', args: [] },
        'server-2': { command: 'cmd2', args: [] }
      };

      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.disconnect.mockResolvedValue(undefined);

      await manager.initializeMCP(serverConfigs);
      await manager.disconnectAll();

      expect(mockConnection.disconnect).toHaveBeenCalledTimes(2);
      expect(manager.getAllConnections().size).toBe(0);
    });
  });

  describe('Instance Management', () => {
    it('should destroy singleton instance', async () => {
      const instance = MCPManager.getInstance(mockLogger);
      
      await MCPManager.destroyInstance();
      
      const newInstance = MCPManager.getInstance(mockLogger);
      expect(newInstance).not.toBe(instance);
    });
  });

  describe('Idle Connection Cleanup', () => {
    beforeEach(async () => {
      await manager.initializeMCP({
        'test-server': { command: 'test-command', args: [] }
      });
    });

    it('should track user activity', async () => {
      const userId = 'user-123';
      
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);
      mockConnection.client.request.mockResolvedValue({
        content: [{ type: 'text', text: 'Tool result' }]
      });

      // Calling a tool should update user activity
      await manager.callTool({
        serverName: 'test-server',
        toolName: 'test-tool',
        provider: 'openai',
        options: { userId }
      });

      // No direct way to test this, but the activity tracking should prevent idle cleanup
      // This is more of an integration test that the mechanism exists
      expect(mockConnection.client.request).toHaveBeenCalled();
    });
  });
});