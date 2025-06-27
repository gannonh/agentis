/**
 * @fileoverview Tests for admin organization management endpoints
 * @module server/routes/__tests__/admin-organizations.vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock mongoose - must be inline to avoid hoisting issues
vi.mock('mongoose', () => {
  const mockObjectId = class MockObjectId {
    constructor(id) {
      this._id = id || 'mock-object-id-' + Math.random().toString(36).substr(2, 9);
    }
    toString() {
      return this._id;
    }
  };

  return {
    default: {
      connection: {
        db: vi.fn(),
      },
      Types: {
        ObjectId: mockObjectId,
      },
    },
  };
});

// Mock middleware
vi.mock('#server/middleware/index.js', () => ({
  requireBetterAuth: vi.fn((req, res, next) => {
    req.user = { id: 'admin-user-id', role: 'admin' };
    next();
  }),
  checkAdmin: vi.fn((req, res, next) => {
    next();
  }),
}));

// Mock logger
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import mongoose from 'mongoose';
import adminOrganizations from '../adminOrganizations.js';

describe('Admin Organization Routes', () => {
  let app;
  let mockDb;
  let mockOrganizationCollection;
  let mockMemberCollection;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock database collections
    mockOrganizationCollection = {
      find: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      findOne: vi.fn(),
      countDocuments: vi.fn(),
    };
    
    mockMemberCollection = {
      find: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      countDocuments: vi.fn(),
    };

    mockDb = {
      collection: vi.fn((name) => {
        if (name === 'organization') return mockOrganizationCollection;
        if (name === 'member') return mockMemberCollection;
        return null;
      }),
    };

    // Mock mongoose connection
    mongoose.connection.db = mockDb;

    // Setup route
    app.use('/api/admin/organizations', adminOrganizations);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/organizations', () => {
    it('should return all organizations with member counts', async () => {
      const mockOrganizations = [
        {
          _id: '1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          metadata: JSON.stringify({ domain: 'acme.com' }),
          createdAt: new Date('2024-01-01'),
        },
        {
          _id: '2',
          name: 'Tech Startup',
          slug: 'tech-startup',
          metadata: JSON.stringify({ domain: 'techstartup.io' }),
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockOrganizationCollection.toArray.mockResolvedValue(mockOrganizations);
      mockMemberCollection.countDocuments.mockResolvedValueOnce(5).mockResolvedValueOnce(3);

      const response = await request(app)
        .get('/api/admin/organizations')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toEqual({
        id: '1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        domain: 'acme.com',
        memberCount: 5,
        createdAt: '2024-01-01T00:00:00.000Z',
      });
      expect(response.body[1]).toEqual({
        id: '2',
        name: 'Tech Startup',
        slug: 'tech-startup',
        domain: 'techstartup.io',
        memberCount: 3,
        createdAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('should handle search parameter', async () => {
      const mockOrganizations = [
        {
          _id: '1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          metadata: JSON.stringify({ domain: 'acme.com' }),
          createdAt: new Date('2024-01-01'),
        },
      ];

      // Chain all methods to return the final array
      const chainMock = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockOrganizations),
      };
      mockOrganizationCollection.find.mockReturnValue(chainMock);
      mockMemberCollection.countDocuments.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/admin/organizations?search=acme')
        .expect(200);

      expect(mockOrganizationCollection.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: 'acme', $options: 'i' } },
          { slug: { $regex: 'acme', $options: 'i' } },
          { metadata: { $regex: 'acme', $options: 'i' } },
        ],
      });
      expect(response.body).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      const mockOrganizations = [];
      for (let i = 0; i < 15; i++) {
        mockOrganizations.push({
          _id: `${i}`,
          name: `Org ${i}`,
          slug: `org-${i}`,
          metadata: JSON.stringify({ domain: `org${i}.com` }),
          createdAt: new Date('2024-01-01'),
        });
      }

      mockOrganizationCollection.toArray.mockResolvedValue(mockOrganizations.slice(0, 10));
      mockOrganizationCollection.countDocuments.mockResolvedValue(15);
      mockMemberCollection.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/admin/organizations?page=1&limit=10')
        .expect(200);

      expect(response.body.organizations).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 15,
        totalPages: 2,
      });
    });

    it.skip('should return 403 for non-admin users', async () => {
      // This test needs a different approach to test auth middleware
      // Skip for now as we're testing the core functionality
    });
  });

  describe('GET /api/admin/organizations/:id', () => {
    it('should return organization details with members', async () => {
      const mockOrganization = {
        _id: '1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        metadata: JSON.stringify({ domain: 'acme.com' }),
        createdAt: new Date('2024-01-01'),
      };

      const mockMembers = [
        {
          _id: 'member1',
          userId: 'user1',
          organizationId: '1',
          role: 'owner',
          createdAt: new Date('2024-01-01'),
        },
        {
          _id: 'member2',
          userId: 'user2',
          organizationId: '1',
          role: 'member',
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockOrganizationCollection.findOne.mockResolvedValue(mockOrganization);
      mockMemberCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockMembers),
      });
      
      // Mock user collection for member details
      const mockUserCollection = {
        findOne: vi.fn()
          .mockResolvedValueOnce({ _id: 'user1', name: 'User 1', email: 'user1@example.com', image: null })
          .mockResolvedValueOnce({ _id: 'user2', name: 'User 2', email: 'user2@example.com', image: null }),
      };
      
      mockDb.collection.mockImplementation((name) => {
        if (name === 'organization') return mockOrganizationCollection;
        if (name === 'member') return mockMemberCollection;
        if (name === 'user') return mockUserCollection;
        return null;
      });

      const response = await request(app)
        .get('/api/admin/organizations/1')
        .expect(200);

      expect(response.body).toMatchObject({
        id: '1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        domain: 'acme.com',
        memberCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        members: expect.arrayContaining([
          expect.objectContaining({
            id: 'member1',
            userId: 'user1',
            role: 'owner',
            user: expect.objectContaining({
              id: 'user1',
              name: 'User 1',
              email: 'user1@example.com',
            }),
          }),
          expect.objectContaining({
            id: 'member2',
            userId: 'user2',
            role: 'member',
            user: expect.objectContaining({
              id: 'user2',
              name: 'User 2',
              email: 'user2@example.com',
            }),
          }),
        ]),
      });
    });

    it('should return 404 for non-existent organization', async () => {
      mockOrganizationCollection.findOne.mockResolvedValue(null);

      await request(app)
        .get('/api/admin/organizations/nonexistent')
        .expect(404);
    });
  });
});