/**
 * @file Session model tests
 * @description TDD tests for Session model functions and Better Auth integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  createSession,
  findSession,
  deleteAllUserSessions,
  countActiveSessions,
  SessionError,
} from '../Session.js';

// Mock the logger to prevent console output during tests
vi.mock('#config/index.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Session Model', () => {
  describe('SessionError Class', () => {
    it('should create a SessionError with default code', () => {
      const error = new SessionError('Test error');
      expect(error.name).toBe('SessionError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('SESSION_ERROR');
    });

    it('should create a SessionError with custom code', () => {
      const error = new SessionError('Test error', 'CUSTOM_CODE');
      expect(error.name).toBe('SessionError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });

  describe('Better Auth Integration (Session Model Disabled)', () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();

    describe('createSession', () => {
      it('should return mock session object when Session model is disabled', async () => {
        // This test verifies the fix - createSession now returns a consistent mock object
        // following the same pattern as other session functions
        const result = await createSession(mockUserId);

        expect(result).toEqual({
          session: {
            user: mockUserId,
            expiration: expect.any(Date),
            _id: null,
            refreshTokenHash: null,
            save: expect.any(Function),
          },
          refreshToken: 'better-auth-managed',
        });

        // Verify the mock save function works
        await expect(result.session.save()).resolves.toEqual({});
      });

      it('should throw SessionError for invalid user ID', async () => {
        await expect(createSession()).rejects.toThrow(SessionError);

        try {
          await createSession();
        } catch (error) {
          expect(error.code).toBe('INVALID_USER_ID');
        }
      });
    });

    describe('findSession', () => {
      it('should return null when Session model is disabled', async () => {
        const result = await findSession({ userId: mockUserId });
        expect(result).toBeNull();
      });

      it('should return null for refresh token search when disabled', async () => {
        const result = await findSession({ refreshToken: 'test-token' });
        expect(result).toBeNull();
      });

      it('should return null for session ID search when disabled', async () => {
        const result = await findSession({ sessionId: mockUserId });
        expect(result).toBeNull();
      });
    });

    describe('deleteAllUserSessions', () => {
      it('should return mock success result when Session model is disabled', async () => {
        const result = await deleteAllUserSessions(mockUserId);

        expect(result).toEqual({
          deletedCount: 0,
          acknowledged: true,
          message: 'Session management handled by Better Auth',
        });
      });

      it('should handle user ID as object when disabled', async () => {
        const result = await deleteAllUserSessions({ userId: mockUserId });

        expect(result).toEqual({
          deletedCount: 0,
          acknowledged: true,
          message: 'Session management handled by Better Auth',
        });
      });
    });

    describe('countActiveSessions', () => {
      it('should return 0 when Session model is disabled', async () => {
        const result = await countActiveSessions(mockUserId);
        expect(result).toBe(0);
      });
    });
  });

  describe('Session Function Input Validation', () => {
    describe('createSession validation', () => {
      it('should throw error for missing user ID', async () => {
        await expect(createSession()).rejects.toThrow(SessionError);
        await expect(createSession('')).rejects.toThrow(SessionError);
        await expect(createSession(null)).rejects.toThrow(SessionError);
      });
    });

    describe('findSession validation', () => {
      it('should return null when Session model is disabled (regardless of invalid params)', async () => {
        // When Session model is disabled, findSession returns null before validation
        const result = await findSession({});
        expect(result).toBeNull();
      });
    });

    describe('deleteAllUserSessions validation', () => {
      it('should throw error for missing user ID', async () => {
        await expect(deleteAllUserSessions()).rejects.toThrow(SessionError);
        await expect(deleteAllUserSessions('')).rejects.toThrow(SessionError);
        await expect(deleteAllUserSessions(null)).rejects.toThrow(SessionError);
      });
    });

    describe('countActiveSessions validation', () => {
      it('should return 0 when Session model is disabled (regardless of invalid params)', async () => {
        // When Session model is disabled, countActiveSessions returns 0 before validation
        expect(await countActiveSessions()).toBe(0);
        expect(await countActiveSessions('')).toBe(0);
        expect(await countActiveSessions(null)).toBe(0);
      });
    });
  });

  describe('Consistency Bug Test', () => {
    const mockUserId = new mongoose.Types.ObjectId().toString();

    it('should demonstrate consistent behavior across session functions when Session model is disabled', async () => {
      // Test that all session functions now handle disabled model consistently
      // This test verifies the fix - all functions now gracefully handle disabled Session model

      // createSession returns mock object (FIXED - was throwing error before)
      const createResult = await createSession(mockUserId);
      expect(createResult).toEqual({
        session: {
          user: mockUserId,
          expiration: expect.any(Date),
          _id: null,
          refreshTokenHash: null,
          save: expect.any(Function),
        },
        refreshToken: 'better-auth-managed',
      });

      // findSession returns null
      const findResult = await findSession({ userId: mockUserId });
      expect(findResult).toBeNull();

      // deleteAllUserSessions returns mock success
      const deleteResult = await deleteAllUserSessions(mockUserId);
      expect(deleteResult).toEqual({
        deletedCount: 0,
        acknowledged: true,
        message: 'Session management handled by Better Auth',
      });

      // countActiveSessions returns 0
      const countResult = await countActiveSessions(mockUserId);
      expect(countResult).toBe(0);

      // All functions now gracefully handle the disabled Session model
      // The inconsistency bug has been fixed
    });
  });
});
