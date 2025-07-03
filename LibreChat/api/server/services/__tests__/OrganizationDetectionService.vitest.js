/**
 * @fileoverview Tests for Organization Detection Service
 * @module services/OrganizationDetectionService.test
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Organization model
vi.mock('#models/Organization', () => ({
  default: {
    find: vi.fn(),
  },
}));

// Mock PublicDomainService
vi.mock('../PublicDomainService.js', () => ({
  default: {
    isPublicDomain: vi.fn(),
  },
}));

import {
  getOrganizationsByDomain,
  checkDomainOrganizations,
} from '../OrganizationDetectionService.js';
import Organization from '#models/Organization';
import PublicDomainService from '../PublicDomainService.js';

describe('OrganizationDetectionService', () => {
  describe('getOrganizationsByDomain', () => {
    it('should return empty array for null domain', async () => {
      const result = await getOrganizationsByDomain(null);
      expect(result).toEqual([]);
    });

    it('should find organizations by domain', async () => {
      const mockOrgs = [{ _id: 'org1', name: 'Acme Corp', domain: 'acme.com' }];

      Organization.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockOrgs),
      });

      const result = await getOrganizationsByDomain('acme.com');

      expect(Organization.find).toHaveBeenCalledWith({ domain: 'acme.com' });
      expect(result).toEqual(mockOrgs);
    });
  });

  describe('checkDomainOrganizations', () => {
    it('should return default response for null email', async () => {
      const result = await checkDomainOrganizations(null);

      expect(result).toEqual({
        isPublicDomain: true,
        domain: null,
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false,
      });
    });

    it('should detect public domain', async () => {
      PublicDomainService.isPublicDomain.mockReturnValue(true);

      const result = await checkDomainOrganizations('user@gmail.com');

      expect(PublicDomainService.isPublicDomain).toHaveBeenCalledWith('gmail.com');
      expect(result).toEqual({
        isPublicDomain: true,
        domain: 'gmail.com',
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false,
      });
    });

    it('should handle corporate domain with organization', async () => {
      PublicDomainService.isPublicDomain.mockReturnValue(false);
      const mockOrg = {
        _id: 'org1',
        name: 'Acme Corp',
        domain: 'acme.com',
        allowDomainJoin: true,
      };
      Organization.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockOrg]),
      });

      const result = await checkDomainOrganizations('user@acme.com');

      expect(PublicDomainService.isPublicDomain).toHaveBeenCalledWith('acme.com');
      expect(Organization.find).toHaveBeenCalledWith({ domain: 'acme.com' });
      expect(result).toEqual({
        isPublicDomain: false,
        domain: 'acme.com',
        hasOrganization: true,
        organizations: [mockOrg],
        canAutoJoin: true,
      });
    });

    it('should handle invitation context bypassing domain detection', async () => {
      const inviteContext = {
        organizationId: 'invited-org-123',
        organizationName: 'Invited Company',
        inviteToken: 'valid-token-123',
      };

      // Mock PublicDomainService to return true for gmail.com
      PublicDomainService.isPublicDomain.mockReturnValue(true);

      // Even with a public domain email, invitation takes precedence
      const result = await checkDomainOrganizations('user@gmail.com', inviteContext);

      // PublicDomainService should still be called to determine actual domain status
      expect(PublicDomainService.isPublicDomain).toHaveBeenCalledWith('gmail.com');

      expect(result).toEqual({
        isPublicDomain: true, // Accurately reflects gmail.com is public
        bypassDomainCheck: true, // New field to indicate invitation bypass
        domain: 'gmail.com',
        hasOrganization: true,
        organizations: [
          {
            _id: 'invited-org-123',
            name: 'Invited Company',
          },
        ],
        canAutoJoin: true,
        isInvited: true,
        invitation: inviteContext,
      });
    });

    it('should handle invalid invitation context gracefully', async () => {
      const inviteContext = {
        organizationId: null, // Invalid - missing organization ID
        organizationName: 'Invalid Company',
        inviteToken: 'invalid-token-123',
      };

      PublicDomainService.isPublicDomain.mockReturnValue(true);

      // Should fall back to normal domain detection when invitation is invalid
      const result = await checkDomainOrganizations('user@gmail.com', inviteContext);

      expect(PublicDomainService.isPublicDomain).toHaveBeenCalledWith('gmail.com');
      expect(result).toEqual({
        isPublicDomain: true,
        domain: 'gmail.com',
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false,
      });
    });

    it('should validate invitation token expiration', async () => {
      const expiredInviteContext = {
        organizationId: 'org-123',
        organizationName: 'Company Inc',
        inviteToken: 'expired-token-456',
        expiresAt: new Date('2024-01-01'), // Expired date
      };

      PublicDomainService.isPublicDomain.mockReturnValue(false);

      // Mock no organizations found for company.com domain
      Organization.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      // Should fall back to normal domain detection when invitation is expired
      const result = await checkDomainOrganizations('user@company.com', expiredInviteContext);

      expect(Organization.find).toHaveBeenCalledWith({ domain: 'company.com' });
      expect(result).toEqual({
        isPublicDomain: false,
        domain: 'company.com',
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false,
        invitationError: 'Invitation has expired',
      });
    });
  });
});
