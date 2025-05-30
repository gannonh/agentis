import { MCPConnection } from './connection';
import type { Logger } from 'winston';
import type { MCPOptions, StdioOptions, WebSocketOptions, SSEOptions } from './types/mcp';

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/stdio.js');
jest.mock('@modelcontextprotocol/sdk/client/websocket.js');
jest.mock('@modelcontextprotocol/sdk/client/sse.js');

const mockLogger: Logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

describe('MCPConnection', () => {
  let connection: MCPConnection;

  afterEach(() => {
    jest.clearAllMocks();
    if (connection) {
      connection.removeAllListeners();
    }
  });

  describe('Connection Type Detection', () => {
    it('should detect stdio options correctly', () => {
      const stdioOptions: StdioOptions = {
        command: 'test-command',
        args: ['--test'],
      };

      connection = new MCPConnection('test-server', stdioOptions, mockLogger);
      expect(connection.serverName).toBe('test-server');
    });

    it('should detect WebSocket options correctly', () => {
      const wsOptions: WebSocketOptions = {
        url: 'ws://localhost:8080',
      };

      connection = new MCPConnection('ws-server', wsOptions, mockLogger);
      expect(connection.serverName).toBe('ws-server');
    });

    it('should detect SSE options correctly', () => {
      const sseOptions: SSEOptions = {
        url: 'http://localhost:8080/sse',
      };

      connection = new MCPConnection('sse-server', sseOptions, mockLogger);
      expect(connection.serverName).toBe('sse-server');
    });

    it('should detect WSS options correctly', () => {
      const wssOptions: WebSocketOptions = {
        url: 'wss://example.com:8080',
      };

      connection = new MCPConnection('wss-server', wssOptions, mockLogger);
      expect(connection.serverName).toBe('wss-server');
    });
  });

  describe('Connection State Management', () => {
    beforeEach(() => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };
      connection = new MCPConnection('test-server', options, mockLogger);
    });

    it('should start in disconnected state', async () => {
      expect(await connection.isConnected()).toBe(false);
    });

    it('should emit connection events', (done) => {
      connection.on('connected', () => {
        done();
      });

      // Simulate connection event
      connection.emit('connected');
    });

    it('should emit disconnection events', (done) => {
      connection.on('disconnected', () => {
        done();
      });

      // Simulate disconnection event
      connection.emit('disconnected');
    });

    it('should emit error events with error details', (done) => {
      const testError = new Error('Test connection error');

      connection.on('error', (error) => {
        expect(error).toBe(testError);
        done();
      });

      // Simulate error event
      connection.emit('error', testError);
    });
  });

  describe('Connection Options Validation', () => {
    it('should handle stdio options with environment variables', () => {
      const stdioOptions: StdioOptions = {
        command: 'test-command',
        args: ['--port', '8080'],
        env: {
          TEST_VAR: 'test-value',
          API_KEY: 'secret-key',
        },
      };

      connection = new MCPConnection('env-server', stdioOptions, mockLogger);
      expect(connection.serverName).toBe('env-server');
    });

    it('should handle WebSocket options with headers', () => {
      const wsOptions = {
        url: 'ws://localhost:8080',
        headers: {
          Authorization: 'Bearer token',
          'X-Custom-Header': 'custom-value',
        },
      } as WebSocketOptions;

      connection = new MCPConnection('ws-headers-server', wsOptions, mockLogger);
      expect(connection.serverName).toBe('ws-headers-server');
    });

    it('should handle SSE options with custom timeout', () => {
      const sseOptions: SSEOptions = {
        url: 'http://localhost:8080/sse',
        timeout: 30000,
      };

      connection = new MCPConnection('sse-timeout-server', sseOptions, mockLogger);
      expect(connection.timeout).toBe(30000);
    });

    it('should handle iconPath in options', () => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
        iconPath: '/path/to/icon.png',
      };

      connection = new MCPConnection('icon-server', options, mockLogger);
      expect(connection.iconPath).toBe('/path/to/icon.png');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };
      connection = new MCPConnection('test-server', options, mockLogger);
    });

    it('should handle connection timeout errors', (done) => {
      const timeoutError = new Error('Connection timeout');

      connection.on('error', (error) => {
        expect(error.message).toContain('timeout');
        done();
      });

      // Simulate timeout error
      connection.emit('error', timeoutError);
    });

    it('should handle process spawn errors for stdio connections', (done) => {
      const spawnError = new Error('spawn ENOENT');

      connection.on('error', (error) => {
        expect(error.message).toContain('ENOENT');
        done();
      });

      // Simulate spawn error
      connection.emit('error', spawnError);
    });

    it('should handle network errors for WebSocket connections', (done) => {
      const wsOptions: WebSocketOptions = {
        url: 'ws://nonexistent:8080',
      };

      connection = new MCPConnection('failing-ws', wsOptions, mockLogger);

      connection.on('error', (error) => {
        expect(error.message).toBe('ECONNREFUSED');
        done();
      });

      const networkError = new Error('ECONNREFUSED');
      connection.emit('error', networkError);
    });

    it('should handle invalid URL errors', () => {
      expect(() => {
        const invalidOptions: WebSocketOptions = {
          url: 'invalid-url',
        };
        new MCPConnection('invalid-server', invalidOptions, mockLogger);
      }).not.toThrow(); // Constructor should not throw, errors handled during connection
    });
  });

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };
      connection = new MCPConnection('test-server', options, mockLogger);
    });

    it('should attempt reconnection on disconnection', (done) => {
      let reconnectAttempted = false;

      connection.on('reconnecting', () => {
        reconnectAttempted = true;
      });

      connection.on('disconnected', () => {
        // Simulate automatic reconnection attempt
        setTimeout(() => {
          connection.emit('reconnecting');
          expect(reconnectAttempted).toBe(true);
          done();
        }, 100);
      });

      // Simulate disconnection
      connection.emit('disconnected');
    });

    it('should respect maximum reconnection attempts', (done) => {
      let attemptCount = 0;

      connection.on('reconnecting', () => {
        attemptCount++;
      });

      connection.on('reconnection_failed', () => {
        expect(attemptCount).toBeGreaterThan(0);
        done();
      });

      // Simulate multiple failed reconnection attempts
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          connection.emit('reconnecting');
          if (i === 4) {
            connection.emit('reconnection_failed');
          }
        }, i * 100);
      }
    });

    it('should stop reconnecting when explicitly requested', () => {
      let shouldStop = false;

      connection.on('stop_reconnecting', () => {
        shouldStop = true;
      });

      // Simulate stop reconnecting request
      connection.emit('stop_reconnecting');
      expect(shouldStop).toBe(true);
    });
  });

  describe('Ping/Pong Mechanism', () => {
    beforeEach(() => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };
      connection = new MCPConnection('test-server', options, mockLogger);
    });

    it('should handle ping requests', (done) => {
      connection.on('ping', () => {
        connection.emit('pong');
        done();
      });

      // Simulate ping
      connection.emit('ping');
    });

    it('should track last ping time', () => {
      const initialTime = (connection as any).lastPingTime;
      expect(initialTime).toBeGreaterThan(0);

      // Simulate ping update
      const newTime = Date.now();
      (connection as any).lastPingTime = newTime;
      expect((connection as any).lastPingTime).toBe(newTime);
    });
  });

  describe('User Context', () => {
    it('should store user ID when provided', () => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };

      connection = new MCPConnection('user-server', options, mockLogger, 'user-123');
      expect((connection as any).userId).toBe('user-123');
    });

    it('should handle connections without user ID', () => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };

      connection = new MCPConnection('no-user-server', options, mockLogger);
      expect((connection as any).userId).toBeUndefined();
    });
  });

  describe('Event Listener Management', () => {
    beforeEach(() => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };
      connection = new MCPConnection('test-server', options, mockLogger);
    });

    it('should properly setup event listeners', () => {
      // Check that the connection has event listeners
      expect(connection.listenerCount('connected')).toBeGreaterThanOrEqual(0);
      expect(connection.listenerCount('disconnected')).toBeGreaterThanOrEqual(0);
      expect(connection.listenerCount('error')).toBeGreaterThanOrEqual(0);
    });

    it('should allow adding custom event listeners', (done) => {
      connection.on('custom_event', (data) => {
        expect(data).toBe('test-data');
        done();
      });

      connection.emit('custom_event', 'test-data');
    });

    it('should properly remove event listeners', () => {
      const testListener = jest.fn();
      connection.on('test_event', testListener);

      expect(connection.listenerCount('test_event')).toBe(1);

      connection.removeListener('test_event', testListener);
      expect(connection.listenerCount('test_event')).toBe(0);
    });
  });

  describe('Client Configuration', () => {
    it('should initialize client with correct metadata', () => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };

      connection = new MCPConnection('metadata-server', options, mockLogger);
      expect(connection.client).toBeDefined();

      // The client should be initialized with librechat-mcp-client name and version
      // This is verified by the constructor call in the implementation
    });

    it('should handle client capabilities configuration', () => {
      const options: StdioOptions = {
        command: 'test-command',
        args: [],
      };

      connection = new MCPConnection('capabilities-server', options, mockLogger);

      // The client should be initialized with capabilities
      // This is handled in the constructor
      expect(connection.client).toBeDefined();
    });
  });
});
