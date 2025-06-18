/**
 * @fileoverview Tests for OrganizationService
 * @module server/services/OrganizationService.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { organizationService } from '../OrganizationService.js';

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

describe('OrganizationService', () => {
  let mockAuth;

  beforeEach(async () => {
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
  });

  describe('findOrganizationByEmailDomain', () => {
    it('should find organization by email domain', async () => {
      const mockOrganizations = [{ id: '1', slug: 'company', metadata: { domain: 'company.com' } }];
      mockAuth.api.listOrganizations.mockResolvedValue(mockOrganizations);

      const result = await organizationService.findOrganizationByEmailDomain('user@company.com');

      expect(result).toEqual(mockOrganizations[0]);
    });

    it('should return null if no organization found', async () => {
      mockAuth.api.listOrganizations.mockResolvedValue([]);

      const result = await organizationService.findOrganizationByEmailDomain('user@newcompany.com');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      mockAuth.api.listOrganizations.mockRejectedValue(new Error('API Error'));

      await expect(
        organizationService.findOrganizationByEmailDomain('user@company.com'),
      ).rejects.toThrow('API Error');
    });
  });

  describe('createOrganizationForDomain', () => {
    it('should create organization for email domain', async () => {
      const mockOrganization = {
        id: '123',
        name: 'Company',
        slug: 'company',
      };
      mockAuth.api.createOrganization.mockResolvedValue(mockOrganization);

      const result = await organizationService.createOrganizationForDomain(
        'user@company.com',
        'user123',
      );

      expect(result).toEqual(mockOrganization);
      expect(mockAuth.api.createOrganization).toHaveBeenCalledWith({
        body: {
          name: 'Company',
          slug: 'company',
          metadata: {
            domain: 'company.com',
            autoCreated: true,
            createdFromEmail: 'user@company.com',
          },
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle creation errors', async () => {
      mockAuth.api.createOrganization.mockRejectedValue(new Error('Creation failed'));

      await expect(
        organizationService.createOrganizationForDomain('user@company.com', 'user123'),
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('addUserToOrganization', () => {
    it('should add user to organization as member', async () => {
      const mockMember = {
        id: 'member123',
        userId: 'user123',
        organizationId: 'org123',
        role: 'member',
      };
      mockAuth.api.addMember.mockResolvedValue(mockMember);

      const result = await organizationService.addUserToOrganization('user123', 'org123');

      expect(result).toEqual(mockMember);
      expect(mockAuth.api.addMember).toHaveBeenCalledWith({
        body: {
          userId: 'user123',
          organizationId: 'org123',
          role: 'member',
        },
      });
    });

    it('should add user with custom role', async () => {
      const mockMember = {
        id: 'member123',
        userId: 'user123',
        organizationId: 'org123',
        role: 'admin',
      };
      mockAuth.api.addMember.mockResolvedValue(mockMember);

      const result = await organizationService.addUserToOrganization('user123', 'org123', 'admin');

      expect(result).toEqual(mockMember);
      expect(mockAuth.api.addMember).toHaveBeenCalledWith({
        body: {
          userId: 'user123',
          organizationId: 'org123',
          role: 'admin',
        },
      });
    });

    it('should handle addition errors', async () => {
      mockAuth.api.addMember.mockRejectedValue(new Error('Addition failed'));

      await expect(organizationService.addUserToOrganization('user123', 'org123')).rejects.toThrow(
        'Addition failed',
      );
    });
  });

  describe('handleUserOrganizationAssignment', () => {
    it('should create new organization when none exists', async () => {
      const mockOrganization = {
        id: '123',
        name: 'Company',
        slug: 'company',
      };

      mockAuth.api.listOrganizations.mockResolvedValue([]);
      mockAuth.api.createOrganization.mockResolvedValue(mockOrganization);

      const result = await organizationService.handleUserOrganizationAssignment(
        'user@company.com',
        'user123',
      );

      expect(result).toEqual({
        organization: mockOrganization,
        isNewOrganization: true,
        memberRole: 'owner',
      });
    });

    it('should add user to existing organization', async () => {
      const mockOrganization = {
        id: '123',
        name: 'Company',
        slug: 'company',
        metadata: { domain: 'company.com' },
      };
      const mockMember = {
        id: 'member123',
        userId: 'user123',
        organizationId: '123',
        role: 'member',
      };

      mockAuth.api.listOrganizations.mockResolvedValue([mockOrganization]);
      mockAuth.api.addMember.mockResolvedValue(mockMember);

      const result = await organizationService.handleUserOrganizationAssignment(
        'user@company.com',
        'user123',
      );

      expect(result).toEqual({
        organization: mockOrganization,
        isNewOrganization: false,
        memberRole: 'member',
      });
    });

    it('should handle assignment errors', async () => {
      mockAuth.api.listOrganizations.mockRejectedValue(new Error('Assignment failed'));

      await expect(
        organizationService.handleUserOrganizationAssignment('user@company.com', 'user123'),
      ).rejects.toThrow('Assignment failed');
    });
  });

  describe('getUserOrganization', () => {
    it('should return user primary organization', async () => {
      const mockUserOrgs = [
        {
          organization: { id: '123', name: 'Company' },
          role: 'member',
        },
      ];
      mockAuth.api.listUserOrganizations.mockResolvedValue(mockUserOrgs);

      const result = await organizationService.getUserOrganization('user123');

      expect(result).toEqual({
        organization: { id: '123', name: 'Company' },
        role: 'member',
      });
      expect(mockAuth.api.listUserOrganizations).toHaveBeenCalledWith({
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should return null when user has no organizations', async () => {
      mockAuth.api.listUserOrganizations.mockResolvedValue([]);

      const result = await organizationService.getUserOrganization('user123');

      expect(result).toEqual({
        organization: null,
        role: null,
      });
    });

    it('should handle retrieval errors', async () => {
      mockAuth.api.listUserOrganizations.mockRejectedValue(new Error('Retrieval failed'));

      await expect(organizationService.getUserOrganization('user123')).rejects.toThrow(
        'Retrieval failed',
      );
    });
  });
});
