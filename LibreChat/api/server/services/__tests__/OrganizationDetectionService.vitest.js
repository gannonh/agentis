/**
 * @fileoverview Tests for Organization Detection Service
 * @module services/OrganizationDetectionService.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// Mock mongoose
vi.mock('mongoose', () => ({
  default: {
    connection: {
      db: null,
    },
  },
}));

// Mock PublicDomainService
vi.mock('../PublicDomainService.js', () => ({
  isPublicDomain: vi.fn(),
}));

// Mock InvitationValidationService
vi.mock('../InvitationValidationService.js', () => ({
  validateInvitationToken: vi.fn(),
}));

import {
  getOrganizationsByDomain,
  checkDomainOrganizations,
} from '../OrganizationDetectionService.js';
import { isPublicDomain } from '../PublicDomainService.js';
import { validateInvitationToken } from '../InvitationValidationService.js';

describe('OrganizationDetectionService', () => {
  let mockDb;
  let mockOrganizationCollection;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock database collections
    mockOrganizationCollection = {
      find: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
    };

    mockDb = {
      collection: vi.fn((name) => {
        if (name === 'organization') return mockOrganizationCollection;
        return null;
      }),
    };

    // Mock mongoose connection
    mongoose.connection.db = mockDb;
  });

  describe('getOrganizationsByDomain', () => {
    it('should return empty array for null domain', async () => {
      const result = await getOrganizationsByDomain(null);
      expect(result).toEqual([]);
    });

    it('should find organizations by domain', async () => {
      const mockOrgs = [
        {
          id: 'org1',
          name: 'Acme Corp',
          slug: 'acme-corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: true,
          },
        },
      ];

      mockOrganizationCollection.toArray.mockResolvedValue(mockOrgs);

      const result = await getOrganizationsByDomain('acme.com');

      expect(mockOrganizationCollection.find).toHaveBeenCalledWith({
        'metadata.domain': 'acme.com',
      });
      expect(result).toEqual([
        {
          _id: 'org1',
          name: 'Acme Corp',
          domain: 'acme.com',
          allowDomainJoin: true,
          slug: 'acme-corp',
        },
      ]);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockOrganizationCollection.find.mockImplementation(() => {
        throw dbError;
      });

      const result = await getOrganizationsByDomain('test.com');

      expect(result).toEqual([]);
      // Note: Error logging is verified by stdout in test output
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

    it('should handle invalid email formats', async () => {
      const invalidEmails = [
        'user@', // Missing domain
        '@domain.com', // Missing user
        'user@.com', // Domain starts with dot
        'user@domain', // No TLD
        'user domain.com', // Missing @
        'user@@domain.com', // Double @
        '', // Empty string
        'user@   ', // Whitespace domain
      ];

      for (const email of invalidEmails) {
        const result = await checkDomainOrganizations(email);
        expect(result).toEqual({
          isPublicDomain: true,
          domain: null,
          hasOrganization: false,
          organizations: [],
          canAutoJoin: false,
        });
      }
    });

    it('should detect public domain', async () => {
      isPublicDomain.mockReturnValue(true);

      const result = await checkDomainOrganizations('user@gmail.com');

      expect(isPublicDomain).toHaveBeenCalledWith('gmail.com');
      expect(result).toEqual({
        isPublicDomain: true,
        domain: 'gmail.com',
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false,
      });
    });

    it('should handle corporate domain with organization (auto-join enabled)', async () => {
      isPublicDomain.mockReturnValue(false);
      const mockOrg = {
        id: 'org1',
        name: 'Acme Corp',
        slug: 'acme-corp',
        metadata: {
          domain: 'acme.com',
          allowDomainJoin: true,
        },
      };
      mockOrganizationCollection.toArray.mockResolvedValue([mockOrg]);

      const result = await checkDomainOrganizations('user@acme.com');

      expect(isPublicDomain).toHaveBeenCalledWith('acme.com');
      expect(mockOrganizationCollection.find).toHaveBeenCalledWith({
        'metadata.domain': 'acme.com',
      });
      expect(result).toEqual({
        isPublicDomain: false,
        domain: 'acme.com',
        hasOrganization: true,
        organizations: [
          {
            _id: 'org1',
            name: 'Acme Corp',
            domain: 'acme.com',
            allowDomainJoin: true,
            slug: 'acme-corp',
          },
        ],
        canAutoJoin: true,
      });
    });

    it('should handle corporate domain with organization (auto-join disabled - manual approval)', async () => {
      isPublicDomain.mockReturnValue(false);
      const mockOrg = {
        id: 'org2',
        name: 'TestCorp Engineering',
        slug: 'testcorp-engineering',
        metadata: {
          domain: 'testcorp.com',
          allowDomainJoin: false, // Manual approval required
        },
      };
      mockOrganizationCollection.toArray.mockResolvedValue([mockOrg]);

      const result = await checkDomainOrganizations('user@testcorp.com');

      expect(isPublicDomain).toHaveBeenCalledWith('testcorp.com');
      expect(mockOrganizationCollection.find).toHaveBeenCalledWith({
        'metadata.domain': 'testcorp.com',
      });
      expect(result).toEqual({
        isPublicDomain: false,
        domain: 'testcorp.com',
        hasOrganization: true,
        organizations: [
          {
            _id: 'org2',
            name: 'TestCorp Engineering',
            domain: 'testcorp.com',
            allowDomainJoin: false,
            slug: 'testcorp-engineering',
          },
        ],
        canAutoJoin: false, // Should be false because allowDomainJoin is false
      });
    });

    it('should handle invitation context bypassing domain detection', async () => {
      const inviteContext = {
        inviteToken: 'valid-token-123',
      };

      const mockValidatedInvitation = {
        id: 'valid-token-123',
        email: 'user@gmail.com',
        organizationId: 'invited-org-123',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
        organization: {
          id: 'invited-org-123',
          name: 'Invited Company',
          domain: 'invitedcompany.com',
        },
      };

      // Mock invitation validation service
      validateInvitationToken.mockResolvedValue(mockValidatedInvitation);

      // Mock PublicDomainService to return true for gmail.com
      isPublicDomain.mockReturnValue(true);

      // Even with a public domain email, invitation takes precedence
      const result = await checkDomainOrganizations('user@gmail.com', inviteContext);

      // Verify invitation token was validated
      expect(validateInvitationToken).toHaveBeenCalledWith('valid-token-123');

      // PublicDomainService should still be called to determine actual domain status
      expect(isPublicDomain).toHaveBeenCalledWith('gmail.com');

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
        invitation: mockValidatedInvitation,
      });
    });

    it('should handle invalid invitation context gracefully', async () => {
      const inviteContext = {
        inviteToken: 'invalid-token-123',
      };

      // Mock invitation validation to return null (invalid token)
      validateInvitationToken.mockResolvedValue(null);

      isPublicDomain.mockReturnValue(true);

      // Mock no organizations found for gmail.com domain (fallback case)
      mockOrganizationCollection.toArray.mockResolvedValue([]);

      // Should fall back to normal domain detection when invitation is invalid
      const result = await checkDomainOrganizations('user@gmail.com', inviteContext);

      expect(validateInvitationToken).toHaveBeenCalledWith('invalid-token-123');
      expect(isPublicDomain).toHaveBeenCalledWith('gmail.com');
      expect(result).toEqual({
        isPublicDomain: true,
        domain: 'gmail.com',
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false,
        invitationError: 'Invalid or expired invitation',
      });
    });

    it('should validate invitation token expiration', async () => {
      const expiredInviteContext = {
        inviteToken: 'expired-token-456',
      };

      // Mock invitation validation to return null (expired invitation)
      validateInvitationToken.mockResolvedValue(null);

      isPublicDomain.mockReturnValue(false);

      // Mock no organizations found for company.com domain
      mockOrganizationCollection.toArray.mockResolvedValue([]);

      // Should fall back to normal domain detection when invitation is expired
      const result = await checkDomainOrganizations('user@company.com', expiredInviteContext);

      expect(validateInvitationToken).toHaveBeenCalledWith('expired-token-456');
      expect(mockOrganizationCollection.find).toHaveBeenCalledWith({
        'metadata.domain': 'company.com',
      });
      expect(result).toEqual({
        isPublicDomain: false,
        domain: 'company.com',
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false,
        invitationError: 'Invalid or expired invitation',
      });
    });

    it('should validate real invitation token and get organization details', async () => {
      const inviteContext = {
        inviteToken: 'real-invitation-id-123',
      };

      // Mock the invitation validation service we'll create
      const mockInvitation = {
        id: 'real-invitation-id-123',
        email: 'user@gmail.com',
        organizationId: 'org-456',
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
        organization: {
          id: 'org-456',
          name: 'Real Company Inc',
          domain: 'realcompany.com',
        },
      };

      // Mock the invitation validation service
      validateInvitationToken.mockResolvedValue(mockInvitation);

      isPublicDomain.mockReturnValue(true);

      const result = await checkDomainOrganizations('user@gmail.com', inviteContext);

      expect(validateInvitationToken).toHaveBeenCalledWith('real-invitation-id-123');
      expect(result).toEqual({
        isPublicDomain: true,
        bypassDomainCheck: true,
        domain: 'gmail.com',
        hasOrganization: true,
        organizations: [
          {
            _id: 'org-456',
            name: 'Real Company Inc',
          },
        ],
        canAutoJoin: true,
        isInvited: true,
        invitation: mockInvitation,
      });
    });
  });
});
