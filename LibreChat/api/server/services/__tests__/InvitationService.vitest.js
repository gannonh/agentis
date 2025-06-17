/**
 * @fileoverview Tests for InvitationService
 * @module server/services/InvitationService.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationService } from '../InvitationService.js';

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

describe('InvitationService', () => {
  let mockAuth;

  beforeEach(async () => {
    mockAuth = {
      api: {
        createInvitation: vi.fn(),
        listInvitations: vi.fn(),
        cancelInvitation: vi.fn(),
        acceptInvitation: vi.fn(),
        rejectInvitation: vi.fn(),
        getInvitation: vi.fn(),
        updateInvitation: vi.fn(),
        getMember: vi.fn(),
      },
    };

    // Mock getAuth to return our mock
    const { getAuth } = await import('#/auth.js');
    getAuth.mockReturnValue(mockAuth);
  });

  describe('createInvitation', () => {
    it('should create invitation successfully', async () => {
      const mockInvitation = {
        id: 'inv123',
        organizationId: 'org123',
        email: 'user@company.com',
        role: 'member',
        status: 'pending',
      };
      
      mockAuth.api.createInvitation.mockResolvedValue(mockInvitation);

      const result = await invitationService.createInvitation(
        'org123',
        'user@company.com',
        'member',
        'user123'
      );

      expect(result).toEqual(mockInvitation);
      expect(mockAuth.api.createInvitation).toHaveBeenCalledWith({
        body: {
          organizationId: 'org123',
          email: 'user@company.com',
          role: 'member',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle creation errors', async () => {
      mockAuth.api.createInvitation.mockRejectedValue(new Error('User already invited'));

      await expect(
        invitationService.createInvitation('org123', 'user@company.com', 'member', 'user123')
      ).rejects.toThrow('User already invited');
    });
  });

  describe('listInvitations', () => {
    it('should list invitations for organization', async () => {
      const mockInvitations = [
        {
          id: 'inv123',
          email: 'user1@company.com',
          role: 'member',
          status: 'pending',
        },
        {
          id: 'inv124',
          email: 'user2@company.com',
          role: 'admin',
          status: 'pending',
        },
      ];
      
      mockAuth.api.listInvitations.mockResolvedValue(mockInvitations);

      const result = await invitationService.listInvitations('org123', 'user123');

      expect(result).toEqual(mockInvitations);
      expect(mockAuth.api.listInvitations).toHaveBeenCalledWith({
        body: {
          organizationId: 'org123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should return empty array when no invitations', async () => {
      mockAuth.api.listInvitations.mockResolvedValue(null);

      const result = await invitationService.listInvitations('org123', 'user123');

      expect(result).toEqual([]);
    });

    it('should handle listing errors', async () => {
      mockAuth.api.listInvitations.mockRejectedValue(new Error('Access denied'));

      await expect(
        invitationService.listInvitations('org123', 'user123')
      ).rejects.toThrow('Access denied');
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      const mockResult = { success: true };
      mockAuth.api.cancelInvitation.mockResolvedValue(mockResult);

      const result = await invitationService.cancelInvitation('inv123', 'user123');

      expect(result).toEqual(mockResult);
      expect(mockAuth.api.cancelInvitation).toHaveBeenCalledWith({
        body: {
          invitationId: 'inv123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle cancellation errors', async () => {
      mockAuth.api.cancelInvitation.mockRejectedValue(new Error('Invitation not found'));

      await expect(
        invitationService.cancelInvitation('inv123', 'user123')
      ).rejects.toThrow('Invitation not found');
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation successfully', async () => {
      const mockResult = {
        organizationId: 'org123',
        role: 'member',
        success: true,
      };
      
      mockAuth.api.acceptInvitation.mockResolvedValue(mockResult);

      const result = await invitationService.acceptInvitation('inv123', 'user123');

      expect(result).toEqual(mockResult);
      expect(mockAuth.api.acceptInvitation).toHaveBeenCalledWith({
        body: {
          invitationId: 'inv123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle acceptance errors', async () => {
      mockAuth.api.acceptInvitation.mockRejectedValue(new Error('Invitation expired'));

      await expect(
        invitationService.acceptInvitation('inv123', 'user123')
      ).rejects.toThrow('Invitation expired');
    });
  });

  describe('rejectInvitation', () => {
    it('should reject invitation successfully', async () => {
      const mockResult = { success: true };
      mockAuth.api.rejectInvitation.mockResolvedValue(mockResult);

      const result = await invitationService.rejectInvitation('inv123', 'user123');

      expect(result).toEqual(mockResult);
      expect(mockAuth.api.rejectInvitation).toHaveBeenCalledWith({
        body: {
          invitationId: 'inv123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle rejection errors', async () => {
      mockAuth.api.rejectInvitation.mockRejectedValue(new Error('Invitation not found'));

      await expect(
        invitationService.rejectInvitation('inv123', 'user123')
      ).rejects.toThrow('Invitation not found');
    });
  });

  describe('getInvitation', () => {
    it('should get invitation details successfully', async () => {
      const mockInvitation = {
        id: 'inv123',
        email: 'user@company.com',
        organizationId: 'org123',
        role: 'member',
        status: 'pending',
      };
      
      mockAuth.api.getInvitation.mockResolvedValue(mockInvitation);

      const result = await invitationService.getInvitation('inv123', 'user123');

      expect(result).toEqual(mockInvitation);
      expect(mockAuth.api.getInvitation).toHaveBeenCalledWith({
        body: {
          invitationId: 'inv123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle get invitation errors', async () => {
      mockAuth.api.getInvitation.mockRejectedValue(new Error('Invitation not found'));

      await expect(
        invitationService.getInvitation('inv123', 'user123')
      ).rejects.toThrow('Invitation not found');
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation successfully', async () => {
      const mockInvitation = {
        id: 'inv123',
        email: 'user@company.com',
        status: 'pending',
      };
      const mockResult = { success: true };
      
      mockAuth.api.getInvitation.mockResolvedValue(mockInvitation);
      mockAuth.api.updateInvitation.mockResolvedValue(mockResult);

      const result = await invitationService.resendInvitation('inv123', 'user123');

      expect(result).toEqual(mockResult);
      expect(mockAuth.api.getInvitation).toHaveBeenCalled();
      expect(mockAuth.api.updateInvitation).toHaveBeenCalledWith({
        body: {
          invitationId: 'inv123',
          status: 'pending',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should not resend non-pending invitation', async () => {
      const mockInvitation = {
        id: 'inv123',
        email: 'user@company.com',
        status: 'accepted',
      };
      
      mockAuth.api.getInvitation.mockResolvedValue(mockInvitation);

      await expect(
        invitationService.resendInvitation('inv123', 'user123')
      ).rejects.toThrow('Cannot resend invitation with status: accepted');
    });

    it('should handle resend errors', async () => {
      mockAuth.api.getInvitation.mockRejectedValue(new Error('Invitation not found'));

      await expect(
        invitationService.resendInvitation('inv123', 'user123')
      ).rejects.toThrow('Invitation not found');
    });
  });

  describe('hasInvitationPermission', () => {
    it('should return true for organization owner', async () => {
      const mockMember = {
        role: 'owner',
        organizationId: 'org123',
        userId: 'user123',
      };
      
      mockAuth.api.getMember.mockResolvedValue(mockMember);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toBe(true);
      expect(mockAuth.api.getMember).toHaveBeenCalledWith({
        body: {
          organizationId: 'org123',
          userId: 'user123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should return true for organization admin', async () => {
      const mockMember = {
        role: 'admin',
        organizationId: 'org123',
        userId: 'user123',
      };
      
      mockAuth.api.getMember.mockResolvedValue(mockMember);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toBe(true);
    });

    it('should return false for regular member', async () => {
      const mockMember = {
        role: 'member',
        organizationId: 'org123',
        userId: 'user123',
      };
      
      mockAuth.api.getMember.mockResolvedValue(mockMember);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toBe(false);
    });

    it('should return false for non-member', async () => {
      mockAuth.api.getMember.mockResolvedValue(null);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toBe(false);
    });

    it('should return false on errors', async () => {
      mockAuth.api.getMember.mockRejectedValue(new Error('Access denied'));

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toBe(false);
    });
  });
});