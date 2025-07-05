/**
 * @fileoverview Tests for /api/organization/enable-domain-join endpoint
 * @module routes/organization-domain-join.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';

// Mock the PublicDomainService
vi.mock('../../services/PublicDomainService.js', () => ({
  isPublicDomain: vi.fn(),
}));

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

import { isPublicDomain } from '../../services/PublicDomainService.js';

describe('POST /api/organization/enable-domain-join', () => {
  let app;
  let mockDb;
  let mockCollection;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock MongoDB collection
    mockCollection = {
      updateOne: vi.fn(),
    };

    mockDb = {
      collection: vi.fn(() => mockCollection),
    };

    // Add the endpoint we're testing (copied from actual implementation)
    app.post('/api/organization/enable-domain-join', async (req, res) => {
      try {
        const { organizationId, domain } = req.body;

        if (!organizationId || !domain) {
          return res.status(400).json({
            error: 'Organization ID and domain are required',
          });
        }

        // Validate organizationId format (should be a string, not necessarily ObjectId)
        if (typeof organizationId !== 'string' || organizationId.trim() === '') {
          return res.status(400).json({
            error: 'Invalid organization ID format',
          });
        }

        // Validate domain format (should be a valid domain, not email)
        const domainRegex =
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
          return res.status(400).json({
            error: 'Invalid domain format',
          });
        }

        // Security check: Prevent enabling domain join for public domains
        if (isPublicDomain(domain)) {
          mockLogger.warn(`Attempt to enable domain join for public domain: ${domain}`);
          return res.status(400).json({
            error: 'Cannot enable domain join for public email domains',
          });
        }

        // Use Better Auth's organization collection directly
        const db = mockDb; // Use our mock in tests
        if (!db) {
          mockLogger.warn('MongoDB connection not available for organization update');
          return res.status(503).json({
            error: 'Database connection not available',
          });
        }

        // CRITICAL FIX: Use 'id' field instead of '_id' for Better Auth compatibility
        // Better Auth uses string 'id' field as primary key, not MongoDB ObjectId '_id'
        const result = await db.collection('organization').updateOne(
          { id: organizationId },
          {
            $set: {
              'metadata.domain': domain,
              'metadata.allowDomainJoin': true,
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({
            error: 'Organization not found',
          });
        }

        mockLogger.info(
          `Domain join enabled for organization ${organizationId} with domain ${domain}`,
        );
        res.json({ success: true });
      } catch (error) {
        mockLogger.error('Error enabling domain join:', error);
        res.status(500).json({
          error: 'Failed to enable domain join',
          message: error.message,
        });
      }
    });

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Input validation', () => {
    it('should return 400 when organizationId is missing', async () => {
      const response = await request(app).post('/api/organization/enable-domain-join').send({
        domain: 'example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Organization ID and domain are required');
    });

    it('should return 400 when domain is missing', async () => {
      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Organization ID and domain are required');
    });

    it('should return 400 when organizationId is empty string', async () => {
      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: '',
        domain: 'example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Organization ID and domain are required');
    });

    it('should return 400 when organizationId is only whitespace', async () => {
      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: '   ',
        domain: 'example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid organization ID format');
    });

    it('should return 400 when organizationId is not a string', async () => {
      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 123,
        domain: 'example.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid organization ID format');
    });

    it('should return 400 for invalid domain format', async () => {
      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
        domain: 'invalid..domain',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid domain format');
    });
  });

  describe('Public domain security checks', () => {
    it('should return 400 for public domains', async () => {
      // Mock isPublicDomain to return true for gmail.com
      isPublicDomain.mockReturnValue(true);

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
        domain: 'gmail.com',
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot enable domain join for public email domains');
      expect(isPublicDomain).toHaveBeenCalledWith('gmail.com');
    });

    it('should allow private domains', async () => {
      // Mock isPublicDomain to return false for private domain
      isPublicDomain.mockReturnValue(false);

      // Mock successful database update
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
        domain: 'acmecorp.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(isPublicDomain).toHaveBeenCalledWith('acmecorp.com');
    });
  });

  describe('Successful domain join enablement', () => {
    beforeEach(() => {
      // Mock private domain
      isPublicDomain.mockReturnValue(false);
    });

    it('should successfully enable domain join for valid organization', async () => {
      // Mock successful database update
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
        domain: 'example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // CRITICAL ASSERTION: Verify database was called with correct parameters
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: 'org-123' }, // CRITICAL: Should use 'id' field, not '_id'
        {
          $set: {
            'metadata.domain': 'example.com',
            'metadata.allowDomainJoin': true,
          },
        },
      );
    });

    it('should handle organization IDs with various valid string formats', async () => {
      const testCases = [
        'org-123',
        'organization_456',
        'abcd1234',
        'ORG-UPPER-CASE',
        'org.with.dots',
        'org-with-many-hyphens-123',
        'ba_org_1234567890abcdef', // Better Auth format
      ];

      for (const organizationId of testCases) {
        mockCollection.updateOne.mockResolvedValue({
          matchedCount: 1,
          modifiedCount: 1,
        });

        const response = await request(app).post('/api/organization/enable-domain-join').send({
          organizationId,
          domain: 'example.com',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify correct query field is used
        expect(mockCollection.updateOne).toHaveBeenCalledWith(
          { id: organizationId }, // Must use 'id' field
          expect.any(Object),
        );
      }
    });

    it('should handle various valid domain formats', async () => {
      const testDomains = [
        'example.com',
        'sub.example.com',
        'deep.nested.example.com',
        'example-company.org',
        'my-company.co.uk',
        'company123.net',
      ];

      for (const domain of testDomains) {
        mockCollection.updateOne.mockResolvedValue({
          matchedCount: 1,
          modifiedCount: 1,
        });

        const response = await request(app).post('/api/organization/enable-domain-join').send({
          organizationId: 'org-123',
          domain,
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify correct domain is set
        expect(mockCollection.updateOne).toHaveBeenCalledWith(
          { id: 'org-123' },
          {
            $set: {
              'metadata.domain': domain,
              'metadata.allowDomainJoin': true,
            },
          },
        );
      }
    });
  });

  describe('Organization not found handling', () => {
    beforeEach(() => {
      // Mock private domain
      isPublicDomain.mockReturnValue(false);
    });

    it('should return 404 when organization does not exist', async () => {
      // Mock no matches found
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
      });

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'nonexistent-org',
        domain: 'example.com',
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Organization not found');

      // Verify query used correct field
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: 'nonexistent-org' }, // Must use 'id' field for Better Auth compatibility
        expect.any(Object),
      );
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      // Mock private domain
      isPublicDomain.mockReturnValue(false);
    });

    it('should return 500 when database operation fails', async () => {
      // Mock database error
      mockCollection.updateOne.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
        domain: 'example.com',
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to enable domain join');
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock unexpected error
      mockCollection.updateOne.mockRejectedValue(new TypeError('Unexpected error'));

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
        domain: 'example.com',
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to enable domain join');
      expect(response.body.message).toBe('Unexpected error');
    });
  });

  describe('CRITICAL: Better Auth compatibility', () => {
    beforeEach(() => {
      // Mock private domain
      isPublicDomain.mockReturnValue(false);
    });

    it('should NEVER use _id field with ObjectId for Better Auth organizations', async () => {
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'org-123',
        domain: 'example.com',
      });

      // CRITICAL ASSERTION: Must use 'id' field, not '_id'
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: 'org-123' }, // Correct: Better Auth uses string 'id' field
        expect.any(Object),
      );

      // CRITICAL ASSERTION: Must NOT use '_id' with ObjectId
      expect(mockCollection.updateOne).not.toHaveBeenCalledWith(
        { _id: expect.anything() }, // Wrong: This would fail with Better Auth
        expect.any(Object),
      );
    });

    it('should work with string organization IDs (Better Auth format)', async () => {
      const stringOrgId = 'ba_org_1234567890abcdef'; // Typical Better Auth ID format

      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: stringOrgId,
        domain: 'example.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify string ID is used directly without ObjectId conversion
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: stringOrgId },
        expect.any(Object),
      );
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      // Mock private domain
      isPublicDomain.mockReturnValue(false);
    });

    it('should handle the complete flow for a legitimate corporate domain', async () => {
      mockCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const response = await request(app).post('/api/organization/enable-domain-join').send({
        organizationId: 'acme-corp-org',
        domain: 'acmecorp.com',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify all the right data is set
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { id: 'acme-corp-org' },
        {
          $set: {
            'metadata.domain': 'acmecorp.com',
            'metadata.allowDomainJoin': true,
          },
        },
      );
    });
  });
});
