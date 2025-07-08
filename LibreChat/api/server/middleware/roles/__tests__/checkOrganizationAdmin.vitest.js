/**
 * @fileoverview Tests for checkOrganizationAdmin middleware
 * @module server/middleware/roles/__tests__/checkOrganizationAdmin.vitest.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import checkOrganizationAdmin from '../checkOrganizationAdmin.js';
import { logger } from '#config/index.js';

// Mock logger
vi.mock('#config/index.js', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('checkOrganizationAdmin middleware', () => {
  let req, res, next;
  let mockDb, mockMemberCollection;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request object
    req = {
      params: {
        organizationId: '507f1f77bcf86cd799439011',
      },
      user: {
        id: 'user123',
      },
      path: '/test/path',
    };

    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Mock next function
    next = vi.fn();

    // Mock database and collection
    mockMemberCollection = {
      findOne: vi.fn(),
    };

    mockDb = {
      collection: vi.fn().mockReturnValue(mockMemberCollection),
    };

    // Mock mongoose connection
    vi.spyOn(mongoose, 'connection', 'get').mockReturnValue({
      db: mockDb,
    });

    // Mock mongoose ObjectId validation
    vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(true);
  });

  describe('validation', () => {
    it('should return 400 if organizationId is missing', async () => {
      req.params.organizationId = undefined;

      await checkOrganizationAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Organization ID is required',
      });
      expect(next).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Organization admin check failed: missing organizationId in params',
        expect.objectContaining({
          userId: 'user123',
          path: '/test/path',
        })
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await checkOrganizationAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(next).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Organization admin check failed: missing user ID',
        expect.objectContaining({
          organizationId: '507f1f77bcf86cd799439011',
          path: '/test/path',
        })
      );
    });

    it('should return 400 if organizationId format is invalid', async () => {
      req.params.organizationId = 'invalid-id';
      mongoose.Types.ObjectId.isValid.mockReturnValue(false);

      await checkOrganizationAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid organization ID format',
      });
      expect(next).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Organization admin check failed: invalid organizationId format',
        expect.objectContaining({
          userId: 'user123',
          organizationId: 'invalid-id',
          path: '/test/path',
        })
      );
    });
  });

  describe('authorization', () => {
    it('should return 403 if user is not an admin or owner', async () => {
      mockMemberCollection.findOne.mockResolvedValue(null);

      await checkOrganizationAdmin(req, res, next);

      expect(mockMemberCollection.findOne).toHaveBeenCalledWith({
        userId: 'user123',
        organizationId: '507f1f77bcf86cd799439011',
        role: { $in: ['admin', 'owner'] },
      });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions. Admin or owner role required.',
      });
      expect(next).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Organization admin check failed: user lacks admin/owner permissions',
        expect.objectContaining({
          userId: 'user123',
          organizationId: '507f1f77bcf86cd799439011',
          path: '/test/path',
        })
      );
    });

    it('should pass if user is an admin', async () => {
      const mockMembership = {
        userId: 'user123',
        organizationId: '507f1f77bcf86cd799439011',
        role: 'admin',
      };
      mockMemberCollection.findOne.mockResolvedValue(mockMembership);

      await checkOrganizationAdmin(req, res, next);

      expect(mockMemberCollection.findOne).toHaveBeenCalledWith({
        userId: 'user123',
        organizationId: '507f1f77bcf86cd799439011',
        role: { $in: ['admin', 'owner'] },
      });
      expect(req.organizationRole).toBe('admin');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Organization admin check passed',
        expect.objectContaining({
          userId: 'user123',
          organizationId: '507f1f77bcf86cd799439011',
          role: 'admin',
          path: '/test/path',
        })
      );
    });

    it('should pass if user is an owner', async () => {
      const mockMembership = {
        userId: 'user123',
        organizationId: '507f1f77bcf86cd799439011',
        role: 'owner',
      };
      mockMemberCollection.findOne.mockResolvedValue(mockMembership);

      await checkOrganizationAdmin(req, res, next);

      expect(mockMemberCollection.findOne).toHaveBeenCalledWith({
        userId: 'user123',
        organizationId: '507f1f77bcf86cd799439011',
        role: { $in: ['admin', 'owner'] },
      });
      expect(req.organizationRole).toBe('owner');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Organization admin check passed',
        expect.objectContaining({
          userId: 'user123',
          organizationId: '507f1f77bcf86cd799439011',
          role: 'owner',
          path: '/test/path',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should return 500 if database error occurs', async () => {
      const dbError = new Error('Database connection failed');
      mockMemberCollection.findOne.mockRejectedValue(dbError);

      await checkOrganizationAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error during permission check',
      });
      expect(next).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Organization admin check error',
        expect.objectContaining({
          userId: 'user123',
          organizationId: '507f1f77bcf86cd799439011',
          path: '/test/path',
          error: 'Database connection failed',
        })
      );
    });
  });
});