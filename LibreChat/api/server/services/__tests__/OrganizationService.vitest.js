/**
 * @fileoverview Tests for OrganizationService
 * @module server/services/OrganizationService.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
        db: {
          collection: vi.fn(),
        },
      },
      Types: {
        ObjectId: mockObjectId,
      },
    },
  };
});

// Mock the auth module
vi.mock('~/auth.js', () => ({
  getAuth: vi.fn(),
}));

// Mock logger
vi.mock('#config/index.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import { organizationService } from '../OrganizationService.js';
import mongoose from 'mongoose';

describe('OrganizationService', () => {
  let mockAuth;
  let mockDb;
  let mockCollections;

  beforeEach(async () => {
    // Mock collections
    mockCollections = {
      organization: {
        findOne: vi.fn(),
        insertOne: vi.fn(),
        find: vi.fn().mockReturnValue({ toArray: vi.fn() }),
      },
      member: {
        findOne: vi.fn(),
        insertOne: vi.fn(),
        find: vi.fn().mockReturnValue({ toArray: vi.fn() }),
      },
    };

    mockDb = {
      collection: vi.fn((name) => mockCollections[name]),
    };

    mockAuth = {
      api: {
        listOrganizations: vi.fn(),
        createOrganization: vi.fn(),
        addMember: vi.fn(),
        listUserOrganizations: vi.fn(),
      },
    };

    // Mock getAuth to return our mock
    const { getAuth } = await import('#/auth.js');
    getAuth.mockReturnValue(mockAuth);

    // Mock mongoose connection
    mongoose.connection.db = mockDb;
  });

  describe('findOrganizationByEmailDomain', () => {
    it('should find organization by email domain', async () => {
      const mockOrganization = { 
        _id: '1', 
        slug: 'company', 
        name: 'Company',
        metadata: JSON.stringify({ domain: 'company.com' }) 
      };
      mockCollections.organization.findOne.mockResolvedValue(mockOrganization);

      const result = await organizationService.findOrganizationByEmailDomain('user@company.com');

      expect(result).toEqual(mockOrganization);
      expect(mockCollections.organization.findOne).toHaveBeenCalledWith({ slug: 'company' });
    });

    it('should return null if no organization found', async () => {
      mockCollections.organization.findOne.mockResolvedValue(null);

      const result = await organizationService.findOrganizationByEmailDomain('user@newcompany.com');

      expect(result).toBeNull();
      expect(mockCollections.organization.findOne).toHaveBeenCalledTimes(2); // Once for slug, once for metadata search
    });

    it('should handle errors', async () => {
      mockCollections.organization.findOne.mockRejectedValue(new Error('Database Error'));

      await expect(
        organizationService.findOrganizationByEmailDomain('user@company.com'),
      ).rejects.toThrow('Database Error');
    });
  });

  describe('createOrganizationForDomain', () => {
    it('should create organization for email domain', async () => {
      const mockOrgId = new mongoose.Types.ObjectId();
      const mockOrganization = {
        _id: mockOrgId,
        name: 'Company',
        slug: 'company',
        metadata: JSON.stringify({
          domain: 'company.com',
          autoCreated: true,
          createdFromEmail: 'user@company.com',
        }),
        createdAt: new Date(),
      };
      const mockMemberId = new mongoose.Types.ObjectId();
      const mockMember = {
        _id: mockMemberId,
        userId: 'user123',
        organizationId: mockOrgId.toString(),
        role: 'owner',
        createdAt: new Date(),
      };

      mockCollections.organization.insertOne.mockResolvedValue({ insertedId: mockOrgId });
      mockCollections.organization.findOne.mockResolvedValue(mockOrganization);
      mockCollections.member.insertOne.mockResolvedValue({ insertedId: mockMemberId });
      mockCollections.member.findOne.mockResolvedValue(mockMember);

      const result = await organizationService.createOrganizationForDomain(
        'user@company.com',
        'user123',
      );

      expect(result).toEqual(mockOrganization);
      expect(mockCollections.organization.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Company',
          slug: 'company',
        }),
      );
    });

    it('should handle creation errors', async () => {
      mockCollections.organization.insertOne.mockRejectedValue(new Error('Creation failed'));

      await expect(
        organizationService.createOrganizationForDomain('user@company.com', 'user123'),
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('addUserToOrganization', () => {
    it('should add user to organization as member', async () => {
      const mockMemberId = new mongoose.Types.ObjectId();
      const mockMember = {
        _id: mockMemberId,
        userId: 'user123',
        organizationId: 'org123',
        role: 'member',
        createdAt: new Date(),
      };
      
      mockCollections.member.findOne.mockResolvedValueOnce(null); // No existing member
      mockCollections.member.insertOne.mockResolvedValue({ insertedId: mockMemberId });
      mockCollections.member.findOne.mockResolvedValueOnce(mockMember);

      const result = await organizationService.addUserToOrganization('user123', 'org123');

      expect(result).toEqual(mockMember);
      expect(mockCollections.member.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          organizationId: 'org123',
          role: 'member',
        }),
      );
    });

    it('should add user with custom role', async () => {
      const mockMemberId = new mongoose.Types.ObjectId();
      const mockMember = {
        _id: mockMemberId,
        userId: 'user123',
        organizationId: 'org123',
        role: 'admin',
        createdAt: new Date(),
      };
      
      mockCollections.member.findOne.mockResolvedValueOnce(null); // No existing member
      mockCollections.member.insertOne.mockResolvedValue({ insertedId: mockMemberId });
      mockCollections.member.findOne.mockResolvedValueOnce(mockMember);

      const result = await organizationService.addUserToOrganization('user123', 'org123', 'admin');

      expect(result).toEqual(mockMember);
      expect(mockCollections.member.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          organizationId: 'org123',
          role: 'admin',
        }),
      );
    });

    it('should handle addition errors', async () => {
      mockCollections.member.findOne.mockResolvedValueOnce(null); // No existing member
      mockCollections.member.insertOne.mockRejectedValue(new Error('Addition failed'));

      await expect(organizationService.addUserToOrganization('user123', 'org123')).rejects.toThrow(
        'Addition failed',
      );
    });
  });

  describe('handleUserOrganizationAssignment', () => {
    it('should create new organization when none exists', async () => {
      const mockOrgId = new mongoose.Types.ObjectId();
      const mockOrganization = {
        _id: mockOrgId,
        name: 'Company',
        slug: 'company',
        metadata: JSON.stringify({
          domain: 'company.com',
          autoCreated: true,
          createdFromEmail: 'user@company.com',
        }),
      };

      // Mock findOrganizationByEmailDomain to return null
      mockCollections.organization.findOne.mockResolvedValue(null);
      
      // Mock createOrganizationForDomain
      mockCollections.organization.insertOne.mockResolvedValue({ insertedId: mockOrgId });
      mockCollections.organization.findOne
        .mockResolvedValueOnce(null) // findOrganizationByEmailDomain - slug check
        .mockResolvedValueOnce(null) // findOrganizationByEmailDomain - metadata check  
        .mockResolvedValueOnce(mockOrganization); // After creation
      mockCollections.member.insertOne.mockResolvedValue({ insertedId: 'member123' });
      mockCollections.member.findOne.mockResolvedValue({
        _id: 'member123',
        userId: 'user123',
        organizationId: mockOrgId.toString(),
        role: 'owner',
      });

      const result = await organizationService.handleUserOrganizationAssignment(
        'user@company.com',
        'user123',
      );

      expect(result).toEqual({
        organization: {
          id: mockOrgId.toString(),
          name: mockOrganization.name,
          slug: mockOrganization.slug,
          metadata: mockOrganization.metadata,
          createdAt: mockOrganization.createdAt,
        },
        isNewOrganization: true,
        memberRole: 'owner',
      });
    });

    it('should add user to existing organization', async () => {
      const mockOrgId = new mongoose.Types.ObjectId();
      const mockOrganization = {
        _id: mockOrgId,
        id: mockOrgId.toString(),
        name: 'Company',
        slug: 'company',
        metadata: JSON.stringify({ domain: 'company.com' }),
      };
      const mockMember = {
        _id: 'member123',
        userId: 'user123',
        organizationId: mockOrgId.toString(),
        role: 'member',
      };

      // Mock findOrganizationByEmailDomain to return existing org
      mockCollections.organization.findOne.mockResolvedValue(mockOrganization);
      
      // Mock addUserToOrganization
      mockCollections.member.findOne
        .mockResolvedValueOnce(null) // No existing member
        .mockResolvedValueOnce(mockMember); // After addition
      mockCollections.member.insertOne.mockResolvedValue({ insertedId: 'member123' });

      const result = await organizationService.handleUserOrganizationAssignment(
        'user@company.com',
        'user123',
      );

      expect(result).toEqual({
        organization: {
          id: mockOrgId.toString(),
          name: mockOrganization.name,
          slug: mockOrganization.slug,
          metadata: mockOrganization.metadata,
          createdAt: mockOrganization.createdAt,
        },
        isNewOrganization: false,
        memberRole: 'member',
      });
    });

    it('should handle assignment errors', async () => {
      mockCollections.organization.findOne.mockRejectedValue(new Error('Assignment failed'));

      await expect(
        organizationService.handleUserOrganizationAssignment('user@company.com', 'user123'),
      ).rejects.toThrow('Assignment failed');
    });
  });

  describe('getUserOrganization', () => {
    it('should return user primary organization', async () => {
      const mockOrgId = new mongoose.Types.ObjectId();
      const mockMembership = {
        _id: 'member123',
        userId: 'user123',
        organizationId: mockOrgId.toString(),
        role: 'member',
      };
      const mockOrganization = {
        _id: mockOrgId,
        name: 'Company',
        slug: 'company',
      };
      
      mockCollections.member.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([mockMembership]),
      });
      mockCollections.organization.findOne.mockResolvedValue(mockOrganization);

      const result = await organizationService.getUserOrganization('user123');

      expect(result).toEqual({
        organization: {
          id: mockOrgId.toString(),
          name: mockOrganization.name,
          slug: mockOrganization.slug,
          metadata: mockOrganization.metadata,
          createdAt: mockOrganization.createdAt,
        },
        role: 'member',
      });
      expect(mockCollections.member.find).toHaveBeenCalledWith({ userId: 'user123' });
    });

    it('should return null when user has no organizations', async () => {
      mockCollections.member.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      });

      const result = await organizationService.getUserOrganization('user123');

      expect(result).toEqual({
        organization: null,
        role: null,
      });
    });

    it('should handle retrieval errors', async () => {
      mockCollections.member.find.mockReturnValue({
        toArray: vi.fn().mockRejectedValue(new Error('Retrieval failed')),
      });

      await expect(organizationService.getUserOrganization('user123')).rejects.toThrow(
        'Retrieval failed',
      );
    });
  });
});