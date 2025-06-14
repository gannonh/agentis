/**
 * @fileoverview Unit tests for Better Auth integration
 * @module auth.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before importing the module under test
const mockBetterAuth = vi.fn();
const mockMongodbAdapter = vi.fn();
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};
const mockBetterAuthConfig = {
  basePath: '/api/auth',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
};

// Mock modules
vi.mock('better-auth', () => ({
  betterAuth: mockBetterAuth,
}));

vi.mock('better-auth/adapters/mongodb', () => ({
  mongodbAdapter: mockMongodbAdapter,
}));

vi.mock('#config/index.js', () => ({
  logger: mockLogger,
}));

vi.mock('#config/betterAuth.js', () => ({
  betterAuthConfig: mockBetterAuthConfig,
}));

// Mock mongoose
const mockDb = { name: 'Agentis' };
const mockClient = { db: vi.fn().mockReturnValue(mockDb) };
const mockConnection = {
  once: vi.fn(),
  getClient: vi.fn().mockReturnValue(mockClient),
};

vi.mock('mongoose', () => ({
  default: {
    connection: mockConnection,
  },
  connection: mockConnection,
}));

describe('Better Auth Integration', () => {
  let getAuth;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful auth instance
    const mockAuthInstance = {
      handler: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
    
    mockBetterAuth.mockReturnValue(mockAuthInstance);
    mockMongodbAdapter.mockReturnValue('mock-adapter');
    
    // Set environment variables
    process.env.BETTER_AUTH_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.BETTER_AUTH_SECRET;
    
    // Reset mocks to clean state
    mockBetterAuth.mockReturnValue({
      handler: vi.fn(),
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    mockMongodbAdapter.mockReturnValue('mock-adapter');
    mockClient.db.mockReturnValue(mockDb);
  });

  describe('Module Initialization', () => {
    test('should export getAuth function', async () => {
      const authModule = await import('./auth.js');
      expect(typeof authModule.getAuth).toBe('function');
    });

    test('should return temporary handler when auth not initialized', async () => {
      const { getAuth } = await import('./auth.js');
      const auth = getAuth();
      
      expect(auth).toHaveProperty('handler');
      expect(typeof auth.handler).toBe('function');
    });

    test('should send 503 response when auth not ready', async () => {
      const { getAuth } = await import('./auth.js');
      const auth = getAuth();
      
      const mockReq = {};
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      
      auth.handler(mockReq, mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication service is starting up. Please try again in a moment.'
      });
    });
  });

  describe('MongoDB Connection Event Handler', () => {
    test('should register MongoDB connection event listener', async () => {
      await import('./auth.js');
      expect(mockConnection.once).toHaveBeenCalledWith('open', expect.any(Function));
    });

    test('should initialize Better Auth when MongoDB connection opens', async () => {
      await import('./auth.js');
      
      // Get the callback function passed to connection.once
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      
      // Simulate MongoDB connection opening
      connectionCallback();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Better Auth with MongoDB adapter');
      expect(mockConnection.getClient).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('Agentis');
      expect(mockMongodbAdapter).toHaveBeenCalledWith(mockDb);
      expect(mockBetterAuth).toHaveBeenCalledWith({
        database: 'mock-adapter',
        secret: 'test-secret-key',
        ...mockBetterAuthConfig,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Better Auth initialized successfully');
    });

    test('should handle initialization errors gracefully', async () => {
      const testError = new Error('MongoDB connection failed');
      mockMongodbAdapter.mockImplementation(() => {
        throw testError;
      });

      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      
      expect(() => connectionCallback()).toThrow(testError);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Better Auth:', testError);
    });
  });

  describe('getAuth Function', () => {
    test('should return auth instance after successful initialization', async () => {
      const mockAuthInstance = {
        handler: vi.fn(),
        signUp: vi.fn(),
        signIn: vi.fn(),
      };
      
      mockBetterAuth.mockReturnValue(mockAuthInstance);
      
      const { getAuth } = await import('./auth.js');
      
      // Simulate MongoDB connection opening
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      const auth = getAuth();
      expect(auth).toBe(mockAuthInstance);
    });

    test('should handle missing secret environment variable', async () => {
      delete process.env.BETTER_AUTH_SECRET;
      
      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      expect(mockBetterAuth).toHaveBeenCalledWith({
        database: 'mock-adapter',
        secret: undefined,
        ...mockBetterAuthConfig,
      });
    });
  });

  describe('Configuration Integration', () => {
    test('should use correct betterAuthConfig settings', async () => {
      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      const expectedConfig = {
        database: 'mock-adapter',
        secret: 'test-secret-key',
        basePath: '/api/auth',
        emailAndPassword: {
          enabled: true,
          minPasswordLength: 8,
          maxPasswordLength: 128,
        },
      };
      
      expect(mockBetterAuth).toHaveBeenCalledWith(expectedConfig);
    });

    test('should use correct database name for MongoDB adapter', async () => {
      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      expect(mockClient.db).toHaveBeenCalledWith('Agentis');
    });
  });

  describe('Error Handling', () => {
    test('should handle Better Auth initialization failure', async () => {
      const authError = new Error('Better Auth initialization failed');
      mockBetterAuth.mockImplementation(() => {
        throw authError;
      });

      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      
      expect(() => connectionCallback()).toThrow(authError);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Better Auth:', authError);
    });

    test('should handle MongoDB adapter creation failure', async () => {
      const adapterError = new Error('MongoDB adapter creation failed');
      mockMongodbAdapter.mockImplementation(() => {
        throw adapterError;
      });

      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      
      expect(() => connectionCallback()).toThrow(adapterError);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Better Auth:', adapterError);
    });

    test('should handle database connection failure', async () => {
      const dbError = new Error('Database connection failed');
      mockClient.db.mockImplementation(() => {
        throw dbError;
      });

      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      
      expect(() => connectionCallback()).toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Better Auth:', dbError);
    });
  });

  describe('Environment Variables', () => {
    test('should use BETTER_AUTH_SECRET from environment', async () => {
      const testSecret = 'my-super-secret-key-for-testing';
      process.env.BETTER_AUTH_SECRET = testSecret;

      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      expect(mockBetterAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: testSecret,
        })
      );
    });

    test('should handle undefined BETTER_AUTH_SECRET gracefully', async () => {
      delete process.env.BETTER_AUTH_SECRET;

      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      expect(mockBetterAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: undefined,
        })
      );
    });
  });

  describe('Logging', () => {
    test('should log initialization start', async () => {
      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing Better Auth with MongoDB adapter');
    });

    test('should log successful initialization', async () => {
      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Better Auth initialized successfully');
    });

    test('should log initialization errors', async () => {
      const testError = new Error('Test initialization error');
      mockBetterAuth.mockImplementation(() => {
        throw testError;
      });

      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      
      expect(() => connectionCallback()).toThrow(testError);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Better Auth:', testError);
    });
  });

  describe('Mongoose Integration', () => {
    test('should reuse existing mongoose connection', async () => {
      await import('./auth.js');
      
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      // Should use existing connection, not create a new one
      expect(mockConnection.getClient).toHaveBeenCalled();
      expect(mockClient.db).toHaveBeenCalledWith('Agentis');
    });

    test('should wait for MongoDB connection before initializing', async () => {
      const { getAuth } = await import('./auth.js');
      
      // Before connection opens, should return temporary handler
      const authBeforeConnection = getAuth();
      expect(authBeforeConnection).toHaveProperty('handler');
      expect(typeof authBeforeConnection.handler).toBe('function');
      
      // After connection opens, should initialize properly
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
      
      const authAfterConnection = getAuth();
      expect(authAfterConnection).not.toEqual(authBeforeConnection);
      expect(mockBetterAuth).toHaveBeenCalled();
    });
  });
});