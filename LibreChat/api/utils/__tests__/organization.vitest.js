/**
 * @fileoverview Tests for organization utility functions
 * @module utils/organization.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractEmailDomain,
  generateOrganizationName,
  generateOrganizationSlug,
  findOrganizationByEmailDomain,
  createOrganizationForUser,
  handleOrganizationAssignment,
} from '../organization.js';

describe('Organization Utilities', () => {
  describe('extractEmailDomain', () => {
    it('should extract domain from valid email', () => {
      expect(extractEmailDomain('user@company.com')).toBe('company.com');
      expect(extractEmailDomain('test@example.org')).toBe('example.org');
      expect(extractEmailDomain('admin@subdomain.domain.co.uk')).toBe('subdomain.domain.co.uk');
    });

    it('should handle case insensitive domains', () => {
      expect(extractEmailDomain('user@COMPANY.COM')).toBe('company.com');
      expect(extractEmailDomain('Test@Example.ORG')).toBe('example.org');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => extractEmailDomain('')).toThrow('Valid email string is required');
      expect(() => extractEmailDomain(null)).toThrow('Valid email string is required');
      expect(() => extractEmailDomain(undefined)).toThrow('Valid email string is required');
      expect(() => extractEmailDomain(123)).toThrow('Valid email string is required');
    });

    it('should throw error for invalid email format', () => {
      expect(() => extractEmailDomain('invalid-email')).toThrow('Invalid email format');
      expect(() => extractEmailDomain('user@')).toThrow('Invalid email format');
      expect(() => extractEmailDomain('@domain.com')).toThrow('Invalid email format');
      expect(() => extractEmailDomain('user@domain')).toThrow('Invalid email format');
    });
  });

  describe('generateOrganizationName', () => {
    it('should generate organization name from domain', () => {
      expect(generateOrganizationName('company.com')).toBe('Company');
      expect(generateOrganizationName('example.org')).toBe('Example');
      expect(generateOrganizationName('test-corp.net')).toBe('Test-corp');
    });

    it('should handle complex domains', () => {
      expect(generateOrganizationName('subdomain.company.com')).toBe('Subdomain');
      expect(generateOrganizationName('my-company.co.uk')).toBe('My-company');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => generateOrganizationName('')).toThrow('Valid domain string is required');
      expect(() => generateOrganizationName(null)).toThrow('Valid domain string is required');
      expect(() => generateOrganizationName(undefined)).toThrow('Valid domain string is required');
    });
  });

  describe('generateOrganizationSlug', () => {
    it('should generate organization slug from domain', () => {
      expect(generateOrganizationSlug('company.com')).toBe('company');
      expect(generateOrganizationSlug('EXAMPLE.ORG')).toBe('example');
      expect(generateOrganizationSlug('Test-Corp.net')).toBe('test-corp');
    });

    it('should handle complex domains', () => {
      expect(generateOrganizationSlug('subdomain.company.com')).toBe('subdomain');
      expect(generateOrganizationSlug('my-company.co.uk')).toBe('my-company');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => generateOrganizationSlug('')).toThrow('Valid domain string is required');
      expect(() => generateOrganizationSlug(null)).toThrow('Valid domain string is required');
      expect(() => generateOrganizationSlug(undefined)).toThrow('Valid domain string is required');
    });
  });

  describe('findOrganizationByEmailDomain', () => {
    let mockAuth;

    beforeEach(() => {
      mockAuth = {
        api: {
          listOrganizations: vi.fn(),
        },
      };
    });

    it('should find existing organization by slug', async () => {
      const mockOrganizations = [
        { id: '1', name: 'Company', slug: 'company', metadata: { domain: 'company.com' } },
        { id: '2', name: 'Example', slug: 'example', metadata: { domain: 'example.org' } },
      ];
      mockAuth.api.listOrganizations.mockResolvedValue(mockOrganizations);

      const result = await findOrganizationByEmailDomain(mockAuth, 'user@company.com');

      expect(result).toEqual(mockOrganizations[0]);
      expect(mockAuth.api.listOrganizations).toHaveBeenCalledWith({ body: {} });
    });

    it('should find existing organization by domain in metadata', async () => {
      const mockOrganizations = [
        { id: '1', name: 'Company', slug: 'corp', metadata: { domain: 'company.com' } },
      ];
      mockAuth.api.listOrganizations.mockResolvedValue(mockOrganizations);

      const result = await findOrganizationByEmailDomain(mockAuth, 'user@company.com');

      expect(result).toEqual(mockOrganizations[0]);
    });

    it('should return null if no organization found', async () => {
      mockAuth.api.listOrganizations.mockResolvedValue([]);

      const result = await findOrganizationByEmailDomain(mockAuth, 'user@newcompany.com');

      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      mockAuth.api.listOrganizations.mockRejectedValue(new Error('API Error'));

      await expect(findOrganizationByEmailDomain(mockAuth, 'user@company.com')).rejects.toThrow(
        'API Error',
      );
    });
  });

  describe('createOrganizationForUser', () => {
    let mockAuth;

    beforeEach(() => {
      mockAuth = {
        api: {
          createOrganization: vi.fn(),
        },
      };
    });

    it('should create organization for user email domain', async () => {
      const mockOrganization = {
        id: '123',
        name: 'Company',
        slug: 'company',
        metadata: {
          domain: 'company.com',
          autoCreated: true,
          createdFromEmail: 'user@company.com',
        },
      };
      mockAuth.api.createOrganization.mockResolvedValue(mockOrganization);

      const result = await createOrganizationForUser(mockAuth, 'user@company.com', 'user123');

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

    it('should handle API errors', async () => {
      mockAuth.api.createOrganization.mockRejectedValue(new Error('Create failed'));

      await expect(
        createOrganizationForUser(mockAuth, 'user@company.com', 'user123'),
      ).rejects.toThrow('Create failed');
    });
  });

  describe('handleOrganizationAssignment', () => {
    let mockAuth;

    beforeEach(() => {
      mockAuth = {
        api: {
          listOrganizations: vi.fn(),
          createOrganization: vi.fn(),
          addMember: vi.fn(),
        },
      };
    });

    it('should create new organization if none exists', async () => {
      const mockOrganization = {
        id: '123',
        name: 'Company',
        slug: 'company',
      };

      mockAuth.api.listOrganizations.mockResolvedValue([]);
      mockAuth.api.createOrganization.mockResolvedValue(mockOrganization);

      const result = await handleOrganizationAssignment(mockAuth, 'user@company.com', 'user123');

      expect(result).toEqual({
        organization: mockOrganization,
        isNewOrganization: true,
        memberRole: 'owner',
      });
      expect(mockAuth.api.createOrganization).toHaveBeenCalled();
      expect(mockAuth.api.addMember).not.toHaveBeenCalled();
    });

    it('should return existing organization info for joining', async () => {
      const mockOrganization = {
        id: '123',
        name: 'Company',
        slug: 'company',
        metadata: { domain: 'company.com' },
      };

      mockAuth.api.listOrganizations.mockResolvedValue([mockOrganization]);

      const result = await handleOrganizationAssignment(mockAuth, 'user@company.com', 'user123');

      expect(result).toEqual({
        organization: mockOrganization,
        isNewOrganization: false,
        memberRole: 'member',
      });
      expect(mockAuth.api.createOrganization).not.toHaveBeenCalled();
      // Note: actual membership addition is handled by OrganizationService
    });

    it('should handle errors gracefully', async () => {
      mockAuth.api.listOrganizations.mockRejectedValue(new Error('API Error'));

      await expect(
        handleOrganizationAssignment(mockAuth, 'user@company.com', 'user123'),
      ).rejects.toThrow('API Error');
    });
  });
});
