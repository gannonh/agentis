import { MCPManager } from './manager';
import { MCPConnection } from './connection';
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

describe('MCPManager Circuit Breaker and Retry Strategy', () => {
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
      close: jest.fn(),
      callTool: jest.fn(),
      client: {
        getServerCapabilities: jest.fn().mockReturnValue({}),
        listTools: jest.fn().mockResolvedValue({ tools: [] }),
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

  describe('Circuit Breaker Pattern', () => {
    it('should initialize server health state correctly', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      // Mock successful connection
      mockConnection.isConnected.mockResolvedValue(true);
      mockConnection.connect.mockResolvedValue(undefined);

      await manager.initializeMCP({ 'test-server': serverConfig });

      const health = manager.getServerHealth('test-server');
      expect(health).toBeDefined();
      expect(health?.state).toBe('healthy');
      expect(health?.consecutiveFailures).toBe(0);
      expect(health?.lastSuccessTime).toBeGreaterThan(0);
    });

    it('should transition to degraded state after first failure', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      // Mock connection failure
      mockConnection.isConnected.mockResolvedValue(false);
      mockConnection.connect.mockRejectedValue(new Error('Connection failed'));

      await manager.initializeMCP({ 'test-server': serverConfig });

      const health = manager.getServerHealth('test-server');
      expect(health?.state).toBe('degraded');
      expect(health?.consecutiveFailures).toBe(1);
    }, 30000);

    it('should open circuit breaker after threshold failures', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');

      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        (manager as any).recordServerFailure('test-server');
      }

      const health = manager.getServerHealth('test-server');
      expect(health?.state).toBe('circuit_open');
      expect(health?.consecutiveFailures).toBe(3);
      expect(health?.circuitOpenUntil).toBeGreaterThan(Date.now());
    });

    it('should prevent requests when circuit is open', () => {
      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');
      
      // Force circuit open
      for (let i = 0; i < 3; i++) {
        (manager as any).recordServerFailure('test-server');
      }

      const isAvailable = (manager as any).isServerAvailable('test-server');
      expect(isAvailable).toBe(false);
    });

    it('should allow test request after circuit timeout', async () => {
      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');
      
      // Force circuit open with past timeout
      const health = manager.getServerHealth('test-server');
      if (health) {
        health.state = 'circuit_open';
        health.consecutiveFailures = 3;
        health.circuitOpenUntil = Date.now() - 1000; // Past timeout
      }

      const isAvailable = (manager as any).isServerAvailable('test-server');
      expect(isAvailable).toBe(true);
      
      // Should transition to degraded state
      const updatedHealth = manager.getServerHealth('test-server');
      expect(updatedHealth?.state).toBe('degraded');
    });

    it('should reset circuit on successful operation', () => {
      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');
      
      // Force degraded state
      (manager as any).recordServerFailure('test-server');
      (manager as any).recordServerFailure('test-server');

      let health = manager.getServerHealth('test-server');
      expect(health?.state).toBe('degraded');
      expect(health?.consecutiveFailures).toBe(2);

      // Record success
      (manager as any).recordServerSuccess('test-server');

      health = manager.getServerHealth('test-server');
      expect(health?.state).toBe('healthy');
      expect(health?.consecutiveFailures).toBe(0);
      expect(health?.circuitOpenUntil).toBeUndefined();
    });
  });

  describe('Server Health Management', () => {
    it('should track multiple server health states independently', () => {
      // Initialize multiple servers
      (manager as any).initializeServerHealth('server-1');
      (manager as any).initializeServerHealth('server-2');

      // Fail server-1 but not server-2
      (manager as any).recordServerFailure('server-1');
      (manager as any).recordServerSuccess('server-2');

      const health1 = manager.getServerHealth('server-1');
      const health2 = manager.getServerHealth('server-2');

      expect(health1?.state).toBe('degraded');
      expect(health1?.consecutiveFailures).toBe(1);
      expect(health2?.state).toBe('healthy');
      expect(health2?.consecutiveFailures).toBe(0);
    });

    it('should return all server health statuses', () => {
      // Initialize multiple servers
      (manager as any).initializeServerHealth('server-1');
      (manager as any).initializeServerHealth('server-2');
      (manager as any).initializeServerHealth('server-3');

      const allHealth = manager.getAllServerHealth();
      expect(allHealth.size).toBe(3);
      expect(allHealth.has('server-1')).toBe(true);
      expect(allHealth.has('server-2')).toBe(true);
      expect(allHealth.has('server-3')).toBe(true);
    });

    it('should handle unknown servers gracefully', () => {
      const health = manager.getServerHealth('unknown-server');
      expect(health).toBeUndefined();

      const isAvailable = (manager as any).isServerAvailable('unknown-server');
      expect(isAvailable).toBe(true); // Unknown servers are considered available
    });
  });

  describe('Connection Retry Logic', () => {
    it('should retry connection attempts with exponential backoff', async () => {
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

      const startTime = Date.now();
      await manager.initializeMCP({ 'test-server': serverConfig });
      const endTime = Date.now();

      // Should have taken some time due to retries
      expect(endTime - startTime).toBeGreaterThan(100);
      expect(mockConnection.connect).toHaveBeenCalledTimes(3);
    });

    it('should respect maximum retry attempts', async () => {
      const serverConfig: MCPOptions = {
        command: 'test-command',
        args: ['test-arg'],
      };

      // Mock persistent connection failures
      mockConnection.connect.mockRejectedValue(new Error('Persistent failure'));
      mockConnection.isConnected.mockResolvedValue(false);

      await manager.initializeMCP({ 'test-server': serverConfig });

      // Should eventually give up after max retries
      const health = manager.getServerHealth('test-server');
      expect(health?.state).toBe('degraded');
      expect(mockConnection.connect).toHaveBeenCalledTimes(5); // Based on actual retry logic
    }, 30000);
  });

  describe('Health Check and Recovery', () => {
    beforeEach(() => {
      // Mock Date.now to control timing
      jest.spyOn(Date, 'now').mockImplementation(() => 1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should attempt recovery for degraded servers after timeout', async () => {
      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');
      
      // Set server to degraded state with old failure time
      const health = manager.getServerHealth('test-server');
      if (health) {
        health.state = 'degraded';
        health.lastFailureTime = 1000000 - (6 * 60 * 1000); // 6 minutes ago
      }

      // Mock successful recovery
      mockConnection.isConnected.mockResolvedValue(true);
      (mockConnection.client.listTools as jest.Mock).mockResolvedValue({ tools: [] });

      // Spy on attemptServerRecovery method
      const attemptRecoverySpy = jest.spyOn(manager as any, 'attemptServerRecovery');
      attemptRecoverySpy.mockResolvedValue(undefined);

      await manager.performHealthCheck();

      expect(attemptRecoverySpy).toHaveBeenCalledWith('test-server');
    });

    it('should not attempt recovery for recently failed servers', async () => {
      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');
      
      // Set server to degraded state with recent failure
      const health = manager.getServerHealth('test-server');
      if (health) {
        health.state = 'degraded';
        health.lastFailureTime = 1000000 - (2 * 60 * 1000); // 2 minutes ago
      }

      // Spy on attemptServerRecovery method
      const attemptRecoverySpy = jest.spyOn(manager as any, 'attemptServerRecovery');

      await manager.performHealthCheck();

      expect(attemptRecoverySpy).not.toHaveBeenCalled();
    });

    it('should handle recovery attempt failures gracefully', async () => {
      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');
      
      // Set server to degraded state with old failure time
      const health = manager.getServerHealth('test-server');
      if (health) {
        health.state = 'degraded';
        health.lastFailureTime = 1000000 - (6 * 60 * 1000); // 6 minutes ago
      }

      // Mock failed recovery
      const attemptRecoverySpy = jest.spyOn(manager as any, 'attemptServerRecovery');
      attemptRecoverySpy.mockRejectedValue(new Error('Recovery failed'));

      // Should not throw
      await expect(manager.performHealthCheck()).resolves.not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should handle mixed success and failure scenarios', async () => {
      const serverConfigs = {
        'good-server': { command: 'good-command', args: [] },
        'bad-server': { command: 'bad-command', args: [] },
        'flaky-server': { command: 'flaky-command', args: [] },
      };

      // Mock different behaviors for different servers
      MockMCPConnection.mockImplementation((serverName) => {
        const mockConn = {
          isConnected: jest.fn(),
          connect: jest.fn(),
          close: jest.fn(),
          callTool: jest.fn(),
          client: {
            getServerCapabilities: jest.fn().mockReturnValue({}),
            listTools: jest.fn().mockResolvedValue({ tools: [] }),
          },
        } as any;

        if (serverName === 'good-server') {
          mockConn.connect.mockResolvedValue(undefined);
          mockConn.isConnected.mockResolvedValue(true);
        } else if (serverName === 'bad-server') {
          mockConn.connect.mockRejectedValue(new Error('Persistent failure'));
          mockConn.isConnected.mockResolvedValue(false);
        } else if (serverName === 'flaky-server') {
          mockConn.connect
            .mockRejectedValueOnce(new Error('Flaky failure'))
            .mockResolvedValue(undefined);
          mockConn.isConnected.mockResolvedValue(true);
        }

        return mockConn;
      });

      await manager.initializeMCP(serverConfigs);

      const goodHealth = manager.getServerHealth('good-server');
      const badHealth = manager.getServerHealth('bad-server');
      const flakyHealth = manager.getServerHealth('flaky-server');

      expect(goodHealth?.state).toBe('healthy');
      expect(badHealth?.state).toBe('degraded');
      expect(flakyHealth?.state).toBe('healthy'); // Should recover after retry
    }, 30000);

    it('should maintain circuit breaker state across multiple operations', async () => {
      // Initialize server health manually
      (manager as any).initializeServerHealth('test-server');

      // Simulate a series of failures followed by circuit opening
      for (let i = 0; i < 3; i++) {
        (manager as any).recordServerFailure('test-server');
      }

      let health = manager.getServerHealth('test-server');
      expect(health?.state).toBe('circuit_open');

      // Verify circuit remains closed for new requests
      expect((manager as any).isServerAvailable('test-server')).toBe(false);

      // Simulate timeout expiry
      if (health?.circuitOpenUntil) {
        health.circuitOpenUntil = Date.now() - 1000;
      }

      // Should now allow test request
      expect((manager as any).isServerAvailable('test-server')).toBe(true);
      
      // Simulate successful recovery
      (manager as any).recordServerSuccess('test-server');

      health = manager.getServerHealth('test-server');
      expect(health?.state).toBe('healthy');
      expect(health?.consecutiveFailures).toBe(0);
    });
  });
});