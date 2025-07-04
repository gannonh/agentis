/**
 * @fileoverview Tests for InvitationValidationService
 * @module services/InvitationValidationService.test
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

// Mock logger
vi.mock('#config/index.js', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { validateInvitationToken } from '../InvitationValidationService.js';
import { logger } from '#config/index.js';

describe('InvitationValidationService', () => {
  let mockDb;
  let mockInvitationCollection;
  let mockOrganizationCollection;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock database collections
    mockInvitationCollection = {
      findOne: vi.fn(),
    };

    mockOrganizationCollection = {
      findOne: vi.fn(),
    };

    mockDb = {
      collection: vi.fn((name) => {
        if (name === 'invitation') return mockInvitationCollection;
        if (name === 'organization') return mockOrganizationCollection;
        return null;
      }),
    };

    // Mock mongoose connection
    mongoose.connection.db = mockDb;
  });

  describe('validateInvitationToken', () => {
    it('should return null when no invitation ID provided', async () => {
      const result = await validateInvitationToken(null);

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('No invitation ID provided for validation');
    });

    it('should return null when database connection not available', async () => {
      mongoose.connection.db = null;

      await expect(validateInvitationToken('invite-123')).rejects.toThrow(
        'Database connection not available',
      );
    });

    it('should return null when invitation not found', async () => {
      mockInvitationCollection.findOne.mockResolvedValue(null);

      const result = await validateInvitationToken('invalid-invite-id');

      expect(mockInvitationCollection.findOne).toHaveBeenCalledWith({
        id: 'invalid-invite-id',
        status: 'pending',
      });

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('Invitation not found or not pending', {
        invitationId: 'invalid-invite-id',
      });
    });

    it('should return null when invitation has expired', async () => {
      const expiredDate = new Date('2024-01-01'); // Past date
      const mockInvitation = {
        id: 'expired-invite-123',
        email: 'user@company.com',
        organizationId: 'org-456',
        status: 'pending',
        expiresAt: expiredDate,
      };

      mockInvitationCollection.findOne.mockResolvedValue(mockInvitation);

      const result = await validateInvitationToken('expired-invite-123');

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('Invitation has expired', {
        invitationId: 'expired-invite-123',
        expiresAt: expiredDate,
        now: expect.any(String),
      });
    });

    it('should return null when organization not found', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 24 hours from now
      const mockInvitation = {
        id: 'invite-123',
        email: 'user@company.com',
        organizationId: 'non-existent-org',
        status: 'pending',
        expiresAt: futureDate,
      };

      mockInvitationCollection.findOne.mockResolvedValue(mockInvitation);
      mockOrganizationCollection.findOne.mockResolvedValue(null);

      const result = await validateInvitationToken('invite-123');

      expect(mockOrganizationCollection.findOne).toHaveBeenCalledWith({
        id: 'non-existent-org',
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Organization not found for invitation', {
        invitationId: 'invite-123',
        organizationId: 'non-existent-org',
      });
    });

    it('should return invitation details with organization when valid', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 24 hours from now
      const createdDate = new Date('2024-12-01');

      const mockInvitation = {
        id: 'valid-invite-123',
        email: 'user@company.com',
        organizationId: 'org-456',
        role: 'member',
        status: 'pending',
        expiresAt: futureDate,
        createdAt: createdDate,
      };

      const mockOrganization = {
        id: 'org-456',
        name: 'Company Inc',
        domain: 'company.com',
        slug: 'company-inc',
      };

      mockInvitationCollection.findOne.mockResolvedValue(mockInvitation);
      mockOrganizationCollection.findOne.mockResolvedValue(mockOrganization);

      const result = await validateInvitationToken('valid-invite-123');

      expect(mockInvitationCollection.findOne).toHaveBeenCalledWith({
        id: 'valid-invite-123',
        status: 'pending',
      });

      expect(mockOrganizationCollection.findOne).toHaveBeenCalledWith({
        id: 'org-456',
      });

      expect(result).toEqual({
        id: 'valid-invite-123',
        email: 'user@company.com',
        organizationId: 'org-456',
        role: 'member',
        status: 'pending',
        expiresAt: futureDate,
        createdAt: createdDate,
        organization: {
          id: 'org-456',
          name: 'Company Inc',
          domain: 'company.com',
          slug: 'company-inc',
        },
      });

      expect(logger.debug).toHaveBeenCalledWith('Invitation validated successfully', {
        invitationId: 'valid-invite-123',
        email: 'user@company.com',
        organizationId: 'org-456',
        organizationName: 'Company Inc',
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockInvitationCollection.findOne.mockRejectedValue(dbError);

      await expect(validateInvitationToken('invite-123')).rejects.toThrow(
        'Database connection failed',
      );

      expect(logger.error).toHaveBeenCalledWith('Error validating invitation token', {
        error: 'Database connection failed',
        invitationId: 'invite-123',
        stack: expect.any(String),
      });
    });

    it('should handle organization lookup errors gracefully', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockInvitation = {
        id: 'invite-123',
        email: 'user@company.com',
        organizationId: 'org-456',
        status: 'pending',
        expiresAt: futureDate,
      };

      const orgError = new Error('Organization lookup failed');
      mockInvitationCollection.findOne.mockResolvedValue(mockInvitation);
      mockOrganizationCollection.findOne.mockRejectedValue(orgError);

      await expect(validateInvitationToken('invite-123')).rejects.toThrow(
        'Organization lookup failed',
      );

      expect(logger.error).toHaveBeenCalledWith('Error validating invitation token', {
        error: 'Organization lookup failed',
        invitationId: 'invite-123',
        stack: expect.any(String),
      });
    });

    it('should handle empty invitation ID', async () => {
      const result = await validateInvitationToken('');

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('No invitation ID provided for validation');
    });

    it('should handle undefined invitation ID', async () => {
      const result = await validateInvitationToken(undefined);

      expect(result).toBeNull();
      expect(logger.debug).toHaveBeenCalledWith('No invitation ID provided for validation');
    });

    it('should only find pending invitations', async () => {
      mockInvitationCollection.findOne.mockResolvedValue(null);

      await validateInvitationToken('accepted-invite-123');

      expect(mockInvitationCollection.findOne).toHaveBeenCalledWith({
        id: 'accepted-invite-123',
        status: 'pending', // Only looks for pending invitations
      });
    });
  });
});
