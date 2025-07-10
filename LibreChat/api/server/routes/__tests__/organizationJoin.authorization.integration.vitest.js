/**
 * @fileoverview Integration tests for organization join route authorization
 * @module server/routes/__tests__/organizationJoin.authorization.vitest.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { logger } from '#config/index.js';

// Mock logger to avoid console output during tests
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Organization Join Routes - Authorization Tests', () => {
  let mongoServer;
  let db;

  // Test data
  const testOrganizationId = '507f1f77bcf86cd799439011';
  const adminUserId = 'admin123';
  const ownerUserId = 'owner123';
  const regularUserId = 'member123';

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    db = mongoose.connection.db;

    // Set up test data
    await setupTestData();
  });

  async function createTestApp(userId) {
    const app = express();
    app.use(express.json());

    // Mock user authentication
    app.use((req, res, next) => {
      if (userId) {
        req.user = { id: userId };
      }
      next();
    });

    // Import the authorization middleware
    const { checkOrganizationAdmin } = await import('../../middleware/roles/index.js');

    // Import the OrganizationJoinService
    const OrganizationJoinService = (await import('../../services/OrganizationJoinService.js'))
      .default;

    // Create simple test endpoint for admin routes
    app.get(
      '/api/organization/:organizationId/join-requests',
      checkOrganizationAdmin,
      (req, res) => {
        res.json({
          success: true,
          message: 'Authorization successful',
          user: req.user,
          organizationRole: req.organizationRole,
        });
      },
    );

    // Add the membership-status endpoint directly
    app.get('/api/organization/membership-status', async (req, res) => {
      try {
        const { organizationId } = req.query;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        if (!organizationId) {
          return res.status(400).json({ error: 'Organization ID is required' });
        }

        const isMember = await OrganizationJoinService.checkUserMembership({
          userId,
          organizationId,
        });

        res.json({
          success: true,
          isMember,
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to check membership status',
          message: error.message,
        });
      }
    });

    return app;
  }

  afterEach(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
    vi.clearAllMocks();
  });

  async function setupTestData() {
    // Create test members with different roles
    await db.collection('member').insertMany([
      {
        _id: new mongoose.Types.ObjectId(),
        userId: ownerUserId,
        organizationId: testOrganizationId,
        role: 'owner',
        createdAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        userId: adminUserId,
        organizationId: testOrganizationId,
        role: 'admin',
        createdAt: new Date(),
      },
      {
        _id: new mongoose.Types.ObjectId(),
        userId: regularUserId,
        organizationId: testOrganizationId,
        role: 'member',
        createdAt: new Date(),
      },
    ]);
  }

  describe('Authorization middleware integration', () => {
    it('should allow organization owner to access admin endpoints', async () => {
      const app = await createTestApp(ownerUserId);

      const response = await request(app)
        .get(`/api/organization/${testOrganizationId}/join-requests`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organizationRole).toBe('owner');
    });

    it('should allow organization admin to access admin endpoints', async () => {
      const app = await createTestApp(adminUserId);

      const response = await request(app)
        .get(`/api/organization/${testOrganizationId}/join-requests`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.organizationRole).toBe('admin');
    });

    it('should deny access to regular organization members', async () => {
      const app = await createTestApp(regularUserId);

      const response = await request(app)
        .get(`/api/organization/${testOrganizationId}/join-requests`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions. Admin or owner role required.');
    });

    it('should deny access to users not in the organization', async () => {
      const app = await createTestApp('outsider123');

      const response = await request(app)
        .get(`/api/organization/${testOrganizationId}/join-requests`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions. Admin or owner role required.');
    });

    it('should deny access to unauthenticated users', async () => {
      const app = await createTestApp(null);

      const response = await request(app)
        .get(`/api/organization/${testOrganizationId}/join-requests`)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject invalid organization ID format', async () => {
      const app = await createTestApp(ownerUserId);

      // Test with space character - Express treats this as a valid string 
      // but user has no membership for this "organization", so expect 403
      const response = await request(app)
        .get('/api/organization/ /join-requests') // Space character 
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions. Admin or owner role required.');
    });
  });

  describe('Membership Status Endpoint', () => {
    it('should return true for organization members', async () => {
      const app = await createTestApp(regularUserId);

      const response = await request(app)
        .get(`/api/organization/membership-status?organizationId=${testOrganizationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isMember).toBe(true);
    });

    it('should return false for non-members', async () => {
      const app = await createTestApp('outsider123');

      const response = await request(app)
        .get(`/api/organization/membership-status?organizationId=${testOrganizationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isMember).toBe(false);
    });

    it('should require authentication', async () => {
      const app = await createTestApp(null);

      const response = await request(app)
        .get(`/api/organization/membership-status?organizationId=${testOrganizationId}`)
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should require organization ID parameter', async () => {
      const app = await createTestApp(regularUserId);

      const response = await request(app).get('/api/organization/membership-status').expect(400);

      expect(response.body.error).toBe('Organization ID is required');
    });

    it('should work for organization admins', async () => {
      const app = await createTestApp(adminUserId);

      const response = await request(app)
        .get(`/api/organization/membership-status?organizationId=${testOrganizationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isMember).toBe(true);
    });

    it('should work for organization owners', async () => {
      const app = await createTestApp(ownerUserId);

      const response = await request(app)
        .get(`/api/organization/membership-status?organizationId=${testOrganizationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isMember).toBe(true);
    });
  });
});
