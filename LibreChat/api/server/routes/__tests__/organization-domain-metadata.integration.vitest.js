/**
 * @fileoverview Integration tests for organization domain metadata functionality
 * @module server/routes/__tests__/organization-domain-metadata.integration.vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import organizationJoinRouter from '../organizationJoin.js';

describe('Organization Domain Metadata Integration Tests - Issue #104', () => {
  let mongoServer;
  let db;
  let app;

  beforeEach(async () => {
    // Create minimal Express app for testing (like the working unit test)
    app = express();
    app.use(express.json());
    
    // Disconnect any existing connection before connecting to memory server
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    db = mongoose.connection.db;
    
    // Mount the organizationJoin router (this is what was missing!)
    app.use('/api/organization', organizationJoinRouter);
    
    console.log('🧪 Integration test database connected');
  });

  afterEach(async () => {
    // Clean up database and close connections
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    
    console.log('🧹 Integration test database cleaned');
  });

  describe('Organization Domain Join API', () => {
    it('should save domain metadata when enableDomainJoin=true', async () => {
      // First create an organization via direct database insertion to simulate Better Auth
      const testOrg = {
        id: 'test-org-auto-join',
        name: 'Test Corp Auto',
        slug: 'test-corp-auto',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };
      
      await db.collection('organization').insertOne(testOrg);

      // Call the domain join API with enableDomainJoin=true
      const response = await request(app)
        .post('/api/organization/enable-domain-join')
        .send({
          organizationId: 'test-org-auto-join',
          domain: 'testcorpauto.com',
          enableDomainJoin: true,
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        domain: 'testcorpauto.com',
        allowDomainJoin: true,
      });

      // Verify database was updated correctly
      const updatedOrg = await db.collection('organization').findOne({ id: 'test-org-auto-join' });
      expect(updatedOrg.metadata.domain).toBe('testcorpauto.com');
      expect(updatedOrg.metadata.allowDomainJoin).toBe(true);
    });

    it('should save domain metadata when enableDomainJoin=false (manual approval)', async () => {
      // First create an organization via direct database insertion to simulate Better Auth
      const testOrg = {
        id: 'test-org-manual-approval',
        name: 'Test Corp Manual',
        slug: 'test-corp-manual',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };
      
      await db.collection('organization').insertOne(testOrg);

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
      const updatedOrg = await db.collection('organization').findOne({ id: 'test-org-manual-approval' });
      expect(updatedOrg.metadata.domain).toBe('testcorpmanual.com');
      expect(updatedOrg.metadata.allowDomainJoin).toBe(false);
    });
  });

  describe('Organization Detection API', () => {
    it('should find organization with auto-join enabled', async () => {
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

    it('should not find organization when domain metadata is missing (legacy scenario)', async () => {
      // Create organization without domain metadata (simulates legacy org before our fix)
      const legacyOrg = {
        id: 'legacy-org',
        name: 'Legacy Corp',
        slug: 'legacy-corp',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          // No domain metadata
        },
      };
      
      await db.collection('organization').insertOne(legacyOrg);

      // Test organization detection - should not find the organization
      const response = await request(app)
        .post('/api/organization/detect-domain')
        .send({
          email: 'user@legacy.com',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        isPublicDomain: false,
        domain: 'legacy.com',
        hasOrganization: false,
        canAutoJoin: false,
      });

      expect(response.body.organizations).toHaveLength(0);
    });
  });

  describe('End-to-End Workflow - Issue #104 Fix', () => {
    it('should complete full workflow: create org with manual approval -> detect org -> show preview', async () => {
      // Step 1: Create organization with manual approval (enableDomainJoin=false)
      const testOrg = {
        id: 'e2e-test-org',
        name: 'E2E Test Corp',
        slug: 'e2e-test-corp',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };
      
      await db.collection('organization').insertOne(testOrg);

      // Step 2: Set domain metadata with manual approval
      const domainResponse = await request(app)
        .post('/api/organization/enable-domain-join')
        .send({
          organizationId: 'e2e-test-org',
          domain: 'e2etest.com',
          enableDomainJoin: false, // Manual approval required
        })
        .expect(200);

      expect(domainResponse.body.allowDomainJoin).toBe(false);

      // Step 3: Different user with same domain should be able to detect the organization
      const detectionResponse = await request(app)
        .post('/api/organization/detect-domain')
        .send({
          email: 'newuser@e2etest.com',
        })
        .expect(200);

      // Step 4: Verify detection worked and provides organization info for preview
      expect(detectionResponse.body).toMatchObject({
        isPublicDomain: false,
        domain: 'e2etest.com',
        hasOrganization: true,
        canAutoJoin: false, // Manual approval required
      });

      expect(detectionResponse.body.organizations).toHaveLength(1);
      expect(detectionResponse.body.organizations[0]).toMatchObject({
        name: 'E2E Test Corp',
        domain: 'e2etest.com',
        allowDomainJoin: false,
      });

      // This organization info can now be used by the frontend to show
      // the organization preview with "Request to Join" functionality
    });
  });
});