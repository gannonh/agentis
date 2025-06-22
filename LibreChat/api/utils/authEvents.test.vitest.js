/**
 * @fileoverview Unit tests for auth event logging helpers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authEvents } from './authEvents.js';

// Mock the logger
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('authEvents', () => {
  let mockLogger;

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Get the mocked logger
    const { logger } = await import('#config/index.js');
    mockLogger = logger;
  });

  describe('userLogin', () => {
    it('should log user login with default method', () => {
      const userId = 'user123';

      authEvents.userLogin(userId);

      expect(mockLogger.info).toHaveBeenCalledWith('🔐 User login', {
        userId: 'user123',
        method: 'unknown',
        action: 'login',
      });
    });

    it('should log user login with specified method and metadata', () => {
      const userId = 'user123';
      const method = 'magic-link';
      const metadata = { ip: '192.168.1.1', userAgent: 'test-agent' };

      authEvents.userLogin(userId, method, metadata);

      expect(mockLogger.info).toHaveBeenCalledWith('🔐 User login', {
        userId: 'user123',
        method: 'magic-link',
        action: 'login',
        ip: '192.168.1.1',
        userAgent: 'test-agent',
      });
    });
  });

  describe('userLogout', () => {
    it('should log user logout with minimal data', () => {
      const userId = 'user123';

      authEvents.userLogout(userId);

      expect(mockLogger.info).toHaveBeenCalledWith('🔓 User logout', {
        userId: 'user123',
        action: 'logout',
      });
    });

    it('should log user logout with metadata', () => {
      const userId = 'user123';
      const metadata = { ip: '192.168.1.1', sessionDuration: '30min' };

      authEvents.userLogout(userId, metadata);

      expect(mockLogger.info).toHaveBeenCalledWith('🔓 User logout', {
        userId: 'user123',
        action: 'logout',
        ip: '192.168.1.1',
        sessionDuration: '30min',
      });
    });
  });

  describe('organizationAssigned', () => {
    it('should log organization assignment with default role', () => {
      const userId = 'user123';
      const organizationId = 'org456';

      authEvents.organizationAssigned(userId, organizationId);

      expect(mockLogger.info).toHaveBeenCalledWith('🏢 Organization assigned', {
        userId: 'user123',
        organizationId: 'org456',
        role: 'member',
        action: 'org-assigned',
      });
    });

    it('should log organization assignment with specified role and metadata', () => {
      const userId = 'user123';
      const organizationId = 'org456';
      const role = 'admin';
      const metadata = { assignedBy: 'owner123', reason: 'promotion' };

      authEvents.organizationAssigned(userId, organizationId, role, metadata);

      expect(mockLogger.info).toHaveBeenCalledWith('🏢 Organization assigned', {
        userId: 'user123',
        organizationId: 'org456',
        role: 'admin',
        action: 'org-assigned',
        assignedBy: 'owner123',
        reason: 'promotion',
      });
    });
  });

  describe('authFailure', () => {
    it('should log authentication failure with reason', () => {
      const reason = 'Invalid credentials';

      authEvents.authFailure(reason);

      expect(mockLogger.warn).toHaveBeenCalledWith('❌ Authentication failed', {
        reason: 'Invalid credentials',
        action: 'auth-failed',
      });
    });

    it('should log authentication failure with metadata', () => {
      const reason = 'Account locked';
      const metadata = { ip: '192.168.1.1', attempts: 3 };

      authEvents.authFailure(reason, metadata);

      expect(mockLogger.warn).toHaveBeenCalledWith('❌ Authentication failed', {
        reason: 'Account locked',
        action: 'auth-failed',
        ip: '192.168.1.1',
        attempts: 3,
      });
    });
  });

  describe('sessionRefresh', () => {
    it('should log session refresh with minimal data', () => {
      const userId = 'user123';

      authEvents.sessionRefresh(userId);

      expect(mockLogger.debug).toHaveBeenCalledWith('🔄 Session refreshed', {
        userId: 'user123',
        action: 'session-refresh',
      });
    });

    it('should log session refresh with metadata', () => {
      const userId = 'user123';
      const metadata = { oldExpiry: '2024-01-01', newExpiry: '2024-01-02' };

      authEvents.sessionRefresh(userId, metadata);

      expect(mockLogger.debug).toHaveBeenCalledWith('🔄 Session refreshed', {
        userId: 'user123',
        action: 'session-refresh',
        oldExpiry: '2024-01-01',
        newExpiry: '2024-01-02',
      });
    });
  });

  describe('integration', () => {
    it('should handle all auth events in sequence', () => {
      const userId = 'user123';
      const organizationId = 'org456';

      // Simulate a full auth flow
      authEvents.userLogin(userId, 'oauth', { provider: 'google' });
      authEvents.organizationAssigned(userId, organizationId, 'member');
      authEvents.sessionRefresh(userId);
      authEvents.userLogout(userId);

      expect(mockLogger.info).toHaveBeenCalledTimes(3); // login, org assignment, logout
      expect(mockLogger.debug).toHaveBeenCalledTimes(1); // session refresh
      expect(mockLogger.warn).not.toHaveBeenCalled(); // no failures
    });
  });
});
