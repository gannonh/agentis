/**
 * @fileoverview Tests for Organization Detection Service
 * @module services/OrganizationDetectionService.test
 */

import { describe, it, expect, vi } from 'vitest';

// Mock Organization model
vi.mock('#models/Organization', () => ({
  default: {
    find: vi.fn()
  }
}));

// Mock PublicDomainService
vi.mock('../PublicDomainService.js', () => ({
  default: {
    isPublicDomain: vi.fn()
  }
}));

import { getOrganizationsByDomain, checkDomainOrganizations } from '../OrganizationDetectionService.js';
import Organization from '#models/Organization';
import PublicDomainService from '../PublicDomainService.js';

describe('OrganizationDetectionService', () => {
  describe('getOrganizationsByDomain', () => {
    it('should return empty array for null domain', async () => {
      const result = await getOrganizationsByDomain(null);
      expect(result).toEqual([]);
    });

    it('should find organizations by domain', async () => {
      const mockOrgs = [
        { _id: 'org1', name: 'Acme Corp', domain: 'acme.com' }
      ];
      
      Organization.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockOrgs)
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
        canAutoJoin: false
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
        canAutoJoin: false
      });
    });

    it('should handle corporate domain with organization', async () => {
      PublicDomainService.isPublicDomain.mockReturnValue(false);
      const mockOrg = {
        _id: 'org1',
        name: 'Acme Corp',
        domain: 'acme.com',
        allowDomainJoin: true
      };
      Organization.find.mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockOrg])
      });
      
      const result = await checkDomainOrganizations('user@acme.com');
      
      expect(PublicDomainService.isPublicDomain).toHaveBeenCalledWith('acme.com');
      expect(Organization.find).toHaveBeenCalledWith({ domain: 'acme.com' });
      expect(result).toEqual({
        isPublicDomain: false,
        domain: 'acme.com',
        hasOrganization: true,
        organizations: [mockOrg],
        canAutoJoin: true
      });
    });
  });
});