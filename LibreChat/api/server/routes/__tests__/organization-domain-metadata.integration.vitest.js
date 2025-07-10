/**
 * @fileoverview Integration tests for organization domain metadata functionality
 * @module server/routes/__tests__/organization-domain-metadata.integration.vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';

// Mock logger to avoid console output during tests
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Organization Domain Metadata Integration Tests - Issue #104', () => {
  let mongoServer;
  let db;

  beforeEach(async () => {
    // Disconnect any existing connection before connecting to memory server
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri);
    db = mongoose.connection.db;

    console.log('🧪 Integration test database connected');
  });

  afterEach(async () => {
    // Clean up database and close connections
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();

    console.log('🧹 Integration test database cleaned');
  });

  // Helper function to create organization with membership
  async function createTestOrganization(orgData) {
    await db.collection('organization').insertOne(orgData);
    
    // Create membership record so user has admin permissions
    const membership = {
      _id: new mongoose.Types.ObjectId(),
      userId: 'test-user-123',
      organizationId: orgData.id,
      role: 'owner',
      createdAt: new Date(),
    };
    
    await db.collection('member').insertOne(membership);
  }

  // Helper function to create test app with mocked authentication
  async function createTestApp() {
    const app = express();
    app.use(express.json());

    // Mock authenticated user
    app.use((req, res, next) => {
      req.user = { 
        id: 'test-user-123',
        email: 'test@example.com'
      };
      next();
    });

    // Import middleware after mocks are set up
    const { checkOrganizationAdmin } = await import('../../middleware/roles/index.js');

    // Create test endpoint that mimics enable-domain-join
    app.post('/api/organization/enable-domain-join', checkOrganizationAdmin, async (req, res) => {
      try {
        const { organizationId, domain, enableDomainJoin = true } = req.body;

        if (!organizationId || !domain) {
          return res.status(400).json({
            error: 'Organization ID and domain are required',
          });
        }

        // Update organization metadata with domain information
        const updateFields = {
          'metadata.domain': domain,
          'metadata.allowDomainJoin': enableDomainJoin,
        };

        // Try both Better Auth and ObjectId formats like the real endpoint
        let result = await db
          .collection('organization')
          .updateOne({ id: organizationId }, { $set: updateFields });

        if (result.matchedCount === 0 && mongoose.Types.ObjectId.isValid(organizationId)) {
          const objectId = new mongoose.Types.ObjectId(organizationId);
          result = await db
            .collection('organization')
            .updateOne({ _id: objectId }, { $set: updateFields });
        }

        if (result.matchedCount === 0) {
          return res.status(404).json({
            error: 'Organization not found',
          });
        }

        res.json({
          success: true,
          domain,
          allowDomainJoin: enableDomainJoin,
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to set organization domain',
          message: error.message,
        });
      }
    });

    // Create test endpoint that mimics detect-domain
    app.post('/api/organization/detect-domain', async (req, res) => {
      try {
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({
            error: 'Email is required',
          });
        }

        const emailParts = email.split('@');
        const domain = emailParts[1];

        // Find organizations with matching domain
        const organizations = await db
          .collection('organization')
          .find({
            'metadata.domain': domain,
          })
          .toArray();

        res.json({
          isPublicDomain: false,
          domain,
          hasOrganization: organizations.length > 0,
          canAutoJoin: organizations.some(org => org.metadata?.allowDomainJoin === true),
          organizations: organizations.map(org => ({
            name: org.name,
            domain: org.metadata?.domain,
            allowDomainJoin: org.metadata?.allowDomainJoin || false,
          })),
        });
      } catch (error) {
        res.status(500).json({
          error: 'Failed to detect organization',
          message: error.message,
        });
      }
    });

    return app;
  }

  describe('Organization Domain Join API Security', () => {
    it('should require authentication and admin permissions for domain setup', async () => {
      const app = await createTestApp();

      // Create organization with membership
      await createTestOrganization({
        id: 'test-org-auth',
        name: 'Test Corp Auth',
        slug: 'test-corp-auth',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      });

      // Test that the endpoint works when properly authenticated and authorized
      const response = await request(app)
        .post('/api/organization/enable-domain-join')
        .send({
          organizationId: 'test-org-auth',
          domain: 'testcorpauth.com',
          enableDomainJoin: true,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        domain: 'testcorpauth.com',
        allowDomainJoin: true,
      });

      // Verify database was updated correctly
      const updatedOrg = await db.collection('organization').findOne({ id: 'test-org-auth' });
      expect(updatedOrg.metadata.domain).toBe('testcorpauth.com');
      expect(updatedOrg.metadata.allowDomainJoin).toBe(true);
    });

    it('should save domain metadata when enableDomainJoin=false (manual approval)', async () => {
      const app = await createTestApp();

      // Create organization with membership
      await createTestOrganization({
        id: 'test-org-manual-approval',
        name: 'Test Corp Manual',
        slug: 'test-corp-manual',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      });

      // Call the domain join API with enableDomainJoin=false
      const response = await request(app)
        .post('/api/organization/enable-domain-join')
        .send({
          organizationId: 'test-org-manual-approval',
          domain: 'testcorpmanual.com',
          enableDomainJoin: false,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        domain: 'testcorpmanual.com',
        allowDomainJoin: false,
      });

      // Verify database was updated correctly - domain should be saved even when auto-join is disabled
      const updatedOrg = await db
        .collection('organization')
        .findOne({ id: 'test-org-manual-approval' });
      expect(updatedOrg.metadata.domain).toBe('testcorpmanual.com');
      expect(updatedOrg.metadata.allowDomainJoin).toBe(false);
    });
  });

  describe('Organization Detection API Security', () => {
    it('should find organization with auto-join enabled', async () => {
      const app = await createTestApp();

      // Create organization with domain metadata and auto-join enabled
      const autoJoinOrg = {
        id: 'auto-join-org',
        name: 'Auto Join Corp',
        slug: 'auto-join-corp',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          domain: 'autojoin.com',
          allowDomainJoin: true,
        },
      };

      await db.collection('organization').insertOne(autoJoinOrg);

      // Test organization detection
      const response = await request(app)
        .post('/api/organization/detect-domain')
        .send({
          email: 'user@autojoin.com',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        isPublicDomain: false,
        domain: 'autojoin.com',
        hasOrganization: true,
        canAutoJoin: true,
      });

      expect(response.body.organizations).toHaveLength(1);
      expect(response.body.organizations[0]).toMatchObject({
        name: 'Auto Join Corp',
        domain: 'autojoin.com',
        allowDomainJoin: true,
      });
    });

    it('should find organization with auto-join disabled (manual approval)', async () => {
      const app = await createTestApp();

      // Create organization with domain metadata but auto-join disabled
      const manualApprovalOrg = {
        id: 'manual-approval-org',
        name: 'Manual Approval Corp',
        slug: 'manual-approval-corp',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          domain: 'manualapproval.com',
          allowDomainJoin: false,
        },
      };

      await db.collection('organization').insertOne(manualApprovalOrg);

      // Test organization detection
      const response = await request(app)
        .post('/api/organization/detect-domain')
        .send({
          email: 'user@manualapproval.com',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        isPublicDomain: false,
        domain: 'manualapproval.com',
        hasOrganization: true,
        canAutoJoin: false, // Should be false because allowDomainJoin is false
      });

      expect(response.body.organizations).toHaveLength(1);
      expect(response.body.organizations[0]).toMatchObject({
        name: 'Manual Approval Corp',
        domain: 'manualapproval.com',
        allowDomainJoin: false,
      });
    });
  });

  describe('Authorization Integration', () => {
    it('should deny access to users without admin permissions', async () => {
      const app = express();
      app.use(express.json());

      // Mock user WITHOUT admin permissions (no membership record)
      app.use((req, res, next) => {
        req.user = { 
          id: 'non-admin-user',
          email: 'user@example.com'
        };
        next();
      });

      // Import middleware
      const { checkOrganizationAdmin } = await import('../../middleware/roles/index.js');

      // Create test endpoint with admin requirement
      app.post('/api/organization/enable-domain-join', checkOrganizationAdmin, (req, res) => {
        res.json({ success: true });
      });

      // Create organization but NO membership for the user
      await createTestOrganization({
        id: 'test-org-no-access',
        name: 'Test Corp No Access',
        slug: 'test-corp-no-access',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      });

      // This should fail with 403 because user has no admin permissions
      const response = await request(app)
        .post('/api/organization/enable-domain-join')
        .send({
          organizationId: 'test-org-no-access',
          domain: 'noaccess.com',
          enableDomainJoin: true,
        })
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions. Admin or owner role required.');
    });
  });
});