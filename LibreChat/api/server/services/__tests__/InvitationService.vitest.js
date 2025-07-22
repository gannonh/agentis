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
        organization: {
          inviteMember: vi.fn(),
          listInvitations: vi.fn(),
          cancelInvitation: vi.fn(),
          getInvitation: vi.fn(),
          updateInvitation: vi.fn(),
        },
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

      mockAuth.api.organization.inviteMember.mockResolvedValue(mockInvitation);

      const result = await invitationService.createInvitation(
        'org123',
        'user@company.com',
        'member',
        'user123',
      );

      expect(result).toEqual(mockInvitation);
      
      // Verify the call was made with server-generated timestamps
      const callArgs = mockAuth.api.organization.inviteMember.mock.calls[0][0];
      expect(callArgs.headers).toEqual({ 'user-id': 'user123' });
      expect(callArgs.body.organizationId).toBe('org123');
      expect(callArgs.body.email).toBe('user@company.com');
      expect(callArgs.body.role).toBe('member');
      
      // Verify that server-side timestamps are included
      expect(callArgs.body.invitedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(callArgs.body.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify expiration is 7 days after invitation
      const invitedTime = new Date(callArgs.body.invitedAt);
      const expirationTime = new Date(callArgs.body.expiresAt);
      const diffDays = (expirationTime - invitedTime) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    it('should handle creation errors', async () => {
      mockAuth.api.organization.inviteMember.mockRejectedValue(new Error('User already invited'));

      await expect(
        invitationService.createInvitation('org123', 'user@company.com', 'member', 'user123'),
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

      mockAuth.api.organization.listInvitations.mockResolvedValue(mockInvitations);

      const result = await invitationService.listInvitations('org123', 'user123');

      expect(result).toEqual(mockInvitations);
      expect(mockAuth.api.organization.listInvitations).toHaveBeenCalledWith({
        query: {
          organizationId: 'org123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should return empty array when no invitations', async () => {
      mockAuth.api.organization.listInvitations.mockResolvedValue(null);

      const result = await invitationService.listInvitations('org123', 'user123');

      expect(result).toEqual([]);
    });

    it('should handle listing errors', async () => {
      mockAuth.api.organization.listInvitations.mockRejectedValue(new Error('Access denied'));

      await expect(invitationService.listInvitations('org123', 'user123')).rejects.toThrow(
        'Access denied',
      );
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      const mockResult = { success: true };
      mockAuth.api.organization.cancelInvitation.mockResolvedValue(mockResult);

      const result = await invitationService.cancelInvitation('inv123', 'user123');

      expect(result).toEqual(mockResult);
      expect(mockAuth.api.organization.cancelInvitation).toHaveBeenCalledWith({
        body: {
          invitationId: 'inv123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle cancellation errors', async () => {
      mockAuth.api.organization.cancelInvitation.mockRejectedValue(new Error('Invitation not found'));

      await expect(invitationService.cancelInvitation('inv123', 'user123')).rejects.toThrow(
        'Invitation not found',
      );
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

      mockAuth.api.organization.getInvitation.mockResolvedValue(mockInvitation);

      const result = await invitationService.getInvitation('inv123', 'user123');

      expect(result).toEqual(mockInvitation);
      expect(mockAuth.api.organization.getInvitation).toHaveBeenCalledWith({
        query: {
          id: 'inv123',
        },
        headers: {
          'user-id': 'user123',
        },
      });
    });

    it('should handle get invitation errors', async () => {
      mockAuth.api.organization.getInvitation.mockRejectedValue(new Error('Invitation not found'));

      await expect(invitationService.getInvitation('inv123', 'user123')).rejects.toThrow(
        'Invitation not found',
      );
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

      mockAuth.api.organization.getInvitation.mockResolvedValue(mockInvitation);
      mockAuth.api.organization.updateInvitation.mockResolvedValue(mockResult);

      const result = await invitationService.resendInvitation('inv123', 'user123');

      expect(result).toEqual(mockResult);
      expect(mockAuth.api.organization.getInvitation).toHaveBeenCalled();
      expect(mockAuth.api.organization.updateInvitation).toHaveBeenCalledWith({
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

      mockAuth.api.organization.getInvitation.mockResolvedValue(mockInvitation);

      await expect(invitationService.resendInvitation('inv123', 'user123')).rejects.toThrow(
        'Cannot resend invitation with status: accepted',
      );
    });

    it('should handle resend errors', async () => {
      mockAuth.api.organization.getInvitation.mockRejectedValue(new Error('Invitation not found'));

      await expect(invitationService.resendInvitation('inv123', 'user123')).rejects.toThrow(
        'Invitation not found',
      );
    });
  });

  describe('hasInvitationPermission', () => {
    it('should return {ok: true, hasPermission: true} for organization owner', async () => {
      const mockMember = {
        role: 'owner',
        organizationId: 'org123',
        userId: 'user123',
      };

      mockAuth.api.getMember.mockResolvedValue(mockMember);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({ ok: true, hasPermission: true });
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

    it('should return {ok: true, hasPermission: true} for organization admin', async () => {
      const mockMember = {
        role: 'admin',
        organizationId: 'org123',
        userId: 'user123',
      };

      mockAuth.api.getMember.mockResolvedValue(mockMember);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({ ok: true, hasPermission: true });
    });

    it('should return {ok: true, hasPermission: false} for regular member', async () => {
      const mockMember = {
        role: 'member',
        organizationId: 'org123',
        userId: 'user123',
      };

      mockAuth.api.getMember.mockResolvedValue(mockMember);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({ ok: true, hasPermission: false });
    });

    it('should return {ok: true, hasPermission: false} for non-member', async () => {
      mockAuth.api.getMember.mockResolvedValue(null);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({ ok: true, hasPermission: false });
    });

    it('should return {ok: false, error} on service errors', async () => {
      mockAuth.api.getMember.mockRejectedValue(new Error('Access denied'));

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({ ok: false, error: 'Access denied' });
    });
  });
});
