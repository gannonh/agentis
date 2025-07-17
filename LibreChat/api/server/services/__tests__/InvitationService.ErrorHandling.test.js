/**
 * @fileoverview Error handling tests for InvitationService
 * @description Tests comprehensive error scenarios for the invitation service layer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationService } from '../InvitationService.js';
import { getAuth } from '../../../auth.js';
import { logger } from '#config/index.js';

// Mock dependencies
vi.mock('../../../auth.js', () => ({
  getAuth: vi.fn(),
}));

vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InvitationService Error Handling', () => {
  let mockAuth;
  let mockApi;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApi = {
      createInvitation: vi.fn(),
      listInvitations: vi.fn(),
      cancelInvitation: vi.fn(),
      acceptInvitation: vi.fn(),
      rejectInvitation: vi.fn(),
      getInvitation: vi.fn(),
      updateInvitation: vi.fn(),
      getMember: vi.fn(),
    };

    mockAuth = {
      api: mockApi,
    };

    vi.mocked(getAuth).mockReturnValue(mockAuth);
  });

  describe('createInvitation Error Handling', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      authError.code = 'AUTH_FAILED';
      mockApi.createInvitation.mockRejectedValue(authError);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow('Authentication failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Authentication failed',
          organizationId: 'org123',
          email: 'test@example.com',
          role: 'member',
          inviterId: 'user123',
        })
      );
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      mockApi.createInvitation.mockRejectedValue(timeoutError);

      await expect(
        invitationService.createInvitation('org123', 'timeout@example.com', 'member', 'user123')
      ).rejects.toThrow('Request timeout');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Request timeout',
          email: 'timeout@example.com',
        })
      );
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Invalid email format');
      validationError.code = 'VALIDATION_ERROR';
      mockApi.createInvitation.mockRejectedValue(validationError);

      await expect(
        invitationService.createInvitation('org123', 'invalid-email', 'member', 'user123')
      ).rejects.toThrow('Invalid email format');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Invalid email format',
          email: 'invalid-email',
        })
      );
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Insufficient permissions');
      permissionError.code = 'INSUFFICIENT_PERMISSIONS';
      mockApi.createInvitation.mockRejectedValue(permissionError);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'admin', 'user123')
      ).rejects.toThrow('Insufficient permissions');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Insufficient permissions',
          role: 'admin',
        })
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      dbError.code = 'DB_ERROR';
      mockApi.createInvitation.mockRejectedValue(dbError);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow('Database connection failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Database connection failed',
        })
      );
    });

    it('should handle email service errors', async () => {
      const emailError = new Error('Email service unavailable');
      emailError.code = 'EMAIL_SERVICE_ERROR';
      mockApi.createInvitation.mockRejectedValue(emailError);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow('Email service unavailable');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Email service unavailable',
        })
      );
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
      mockApi.createInvitation.mockRejectedValue(rateLimitError);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow('Rate limit exceeded');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Rate limit exceeded',
        })
      );
    });

    it('should handle organization not found errors', async () => {
      const notFoundError = new Error('Organization not found');
      notFoundError.code = 'ORGANIZATION_NOT_FOUND';
      mockApi.createInvitation.mockRejectedValue(notFoundError);

      await expect(
        invitationService.createInvitation('invalid-org', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow('Organization not found');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Organization not found',
          organizationId: 'invalid-org',
        })
      );
    });
  });

  describe('listInvitations Error Handling', () => {
    it('should handle empty results gracefully', async () => {
      mockApi.listInvitations.mockResolvedValue(null);

      const result = await invitationService.listInvitations('org123', 'user123');

      expect(result).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith(
        'Retrieved organization invitations',
        expect.objectContaining({
          organizationId: 'org123',
          count: 0,
        })
      );
    });

    it('should handle undefined results gracefully', async () => {
      mockApi.listInvitations.mockResolvedValue(undefined);

      const result = await invitationService.listInvitations('org123', 'user123');

      expect(result).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith(
        'Retrieved organization invitations',
        expect.objectContaining({
          count: 0,
        })
      );
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication required');
      authError.code = 'AUTH_REQUIRED';
      mockApi.listInvitations.mockRejectedValue(authError);

      await expect(
        invitationService.listInvitations('org123', 'user123')
      ).rejects.toThrow('Authentication required');

      expect(logger.error).toHaveBeenCalledWith(
        'Error listing organization invitations',
        expect.objectContaining({
          error: 'Authentication required',
          organizationId: 'org123',
          requesterId: 'user123',
        })
      );
    });

    it('should handle large result sets', async () => {
      const largeResults = Array(10000).fill(null).map((_, i) => ({
        id: `inv-${i}`,
        email: `user${i}@example.com`,
        status: 'pending',
      }));
      
      mockApi.listInvitations.mockResolvedValue(largeResults);

      const result = await invitationService.listInvitations('org123', 'user123');

      expect(result).toHaveLength(10000);
      expect(logger.debug).toHaveBeenCalledWith(
        'Retrieved organization invitations',
        expect.objectContaining({
          count: 10000,
        })
      );
    });
  });

  describe('cancelInvitation Error Handling', () => {
    it('should handle invitation not found errors', async () => {
      const notFoundError = new Error('Invitation not found');
      notFoundError.code = 'INVITATION_NOT_FOUND';
      mockApi.cancelInvitation.mockRejectedValue(notFoundError);

      await expect(
        invitationService.cancelInvitation('invalid-inv', 'user123')
      ).rejects.toThrow('Invitation not found');

      expect(logger.error).toHaveBeenCalledWith(
        'Error canceling organization invitation',
        expect.objectContaining({
          error: 'Invitation not found',
          invitationId: 'invalid-inv',
          cancelerId: 'user123',
        })
      );
    });

    it('should handle invalid invitation state errors', async () => {
      const stateError = new Error('Cannot cancel accepted invitation');
      stateError.code = 'INVALID_INVITATION_STATE';
      mockApi.cancelInvitation.mockRejectedValue(stateError);

      await expect(
        invitationService.cancelInvitation('accepted-inv', 'user123')
      ).rejects.toThrow('Cannot cancel accepted invitation');

      expect(logger.error).toHaveBeenCalledWith(
        'Error canceling organization invitation',
        expect.objectContaining({
          error: 'Cannot cancel accepted invitation',
          invitationId: 'accepted-inv',
        })
      );
    });

    it('should handle concurrent modification errors', async () => {
      const concurrentError = new Error('Invitation was modified by another process');
      concurrentError.code = 'CONCURRENT_MODIFICATION';
      mockApi.cancelInvitation.mockRejectedValue(concurrentError);

      await expect(
        invitationService.cancelInvitation('inv123', 'user123')
      ).rejects.toThrow('Invitation was modified by another process');

      expect(logger.error).toHaveBeenCalledWith(
        'Error canceling organization invitation',
        expect.objectContaining({
          error: 'Invitation was modified by another process',
        })
      );
    });
  });

  describe('acceptInvitation Error Handling', () => {
    it('should handle expired invitation errors', async () => {
      const expiredError = new Error('Invitation has expired');
      expiredError.code = 'INVITATION_EXPIRED';
      mockApi.acceptInvitation.mockRejectedValue(expiredError);

      await expect(
        invitationService.acceptInvitation('expired-inv', 'user123')
      ).rejects.toThrow('Invitation has expired');

      expect(logger.error).toHaveBeenCalledWith(
        'Error accepting organization invitation',
        expect.objectContaining({
          error: 'Invitation has expired',
          invitationId: 'expired-inv',
          userId: 'user123',
        })
      );
    });

    it('should handle organization capacity errors', async () => {
      const capacityError = new Error('Organization member limit exceeded');
      capacityError.code = 'ORGANIZATION_CAPACITY_EXCEEDED';
      mockApi.acceptInvitation.mockRejectedValue(capacityError);

      await expect(
        invitationService.acceptInvitation('inv123', 'user123')
      ).rejects.toThrow('Organization member limit exceeded');

      expect(logger.error).toHaveBeenCalledWith(
        'Error accepting organization invitation',
        expect.objectContaining({
          error: 'Organization member limit exceeded',
        })
      );
    });

    it('should handle user already member errors', async () => {
      const memberError = new Error('User is already a member');
      memberError.code = 'USER_ALREADY_MEMBER';
      mockApi.acceptInvitation.mockRejectedValue(memberError);

      await expect(
        invitationService.acceptInvitation('inv123', 'user123')
      ).rejects.toThrow('User is already a member');

      expect(logger.error).toHaveBeenCalledWith(
        'Error accepting organization invitation',
        expect.objectContaining({
          error: 'User is already a member',
        })
      );
    });
  });

  describe('hasInvitationPermission Error Handling', () => {
    it('should handle service errors vs authorization failures', async () => {
      const serviceError = new Error('Service unavailable');
      serviceError.code = 'SERVICE_ERROR';
      mockApi.getMember.mockRejectedValue(serviceError);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({
        ok: false,
        error: 'Service unavailable',
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Error checking invitation permission',
        expect.objectContaining({
          error: 'Service unavailable',
          organizationId: 'org123',
          userId: 'user123',
        })
      );
    });

    it('should handle member not found as lack of permission', async () => {
      mockApi.getMember.mockResolvedValue(null);

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({
        ok: true,
        hasPermission: false,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Checked invitation permission',
        expect.objectContaining({
          organizationId: 'org123',
          userId: 'user123',
          role: undefined,
          hasPermission: false,
        })
      );
    });

    it('should handle member with insufficient role', async () => {
      mockApi.getMember.mockResolvedValue({
        id: 'member123',
        userId: 'user123',
        organizationId: 'org123',
        role: 'member',
      });

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({
        ok: true,
        hasPermission: false,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Checked invitation permission',
        expect.objectContaining({
          role: 'member',
          hasPermission: false,
        })
      );
    });

    it('should handle member with sufficient role', async () => {
      mockApi.getMember.mockResolvedValue({
        id: 'member123',
        userId: 'user123',
        organizationId: 'org123',
        role: 'admin',
      });

      const result = await invitationService.hasInvitationPermission('org123', 'user123');

      expect(result).toEqual({
        ok: true,
        hasPermission: true,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        'Checked invitation permission',
        expect.objectContaining({
          role: 'admin',
          hasPermission: true,
        })
      );
    });
  });

  describe('resendInvitation Error Handling', () => {
    it('should handle invitation not found during resend', async () => {
      const notFoundError = new Error('Invitation not found');
      notFoundError.code = 'INVITATION_NOT_FOUND';
      mockApi.getInvitation.mockRejectedValue(notFoundError);

      await expect(
        invitationService.resendInvitation('invalid-inv', 'user123')
      ).rejects.toThrow('Invitation not found');

      expect(logger.error).toHaveBeenCalledWith(
        'Error resending organization invitation',
        expect.objectContaining({
          error: 'Invitation not found',
          invitationId: 'invalid-inv',
          resenderId: 'user123',
        })
      );
    });

    it('should handle invalid invitation status for resend', async () => {
      mockApi.getInvitation.mockResolvedValue({
        id: 'inv123',
        email: 'test@example.com',
        status: 'accepted',
      });

      await expect(
        invitationService.resendInvitation('inv123', 'user123')
      ).rejects.toThrow('Cannot resend invitation with status: accepted');

      expect(logger.error).toHaveBeenCalledWith(
        'Error resending organization invitation',
        expect.objectContaining({
          error: 'Cannot resend invitation with status: accepted',
        })
      );
    });

    it('should handle email service failure during resend', async () => {
      mockApi.getInvitation.mockResolvedValue({
        id: 'inv123',
        email: 'test@example.com',
        status: 'pending',
      });

      const emailError = new Error('Email service down');
      emailError.code = 'EMAIL_SERVICE_DOWN';
      mockApi.updateInvitation.mockRejectedValue(emailError);

      await expect(
        invitationService.resendInvitation('inv123', 'user123')
      ).rejects.toThrow('Email service down');

      expect(logger.error).toHaveBeenCalledWith(
        'Error resending organization invitation',
        expect.objectContaining({
          error: 'Email service down',
        })
      );
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors with appropriate context', async () => {
      const contextualError = new Error('Context test error');
      contextualError.code = 'CONTEXT_TEST';
      mockApi.createInvitation.mockRejectedValue(contextualError);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow('Context test error');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'Context test error',
          organizationId: 'org123',
          email: 'test@example.com',
          role: 'member',
          inviterId: 'user123',
        })
      );
    });

    it('should log successful operations for monitoring', async () => {
      mockApi.createInvitation.mockResolvedValue({
        id: 'inv123',
        email: 'test@example.com',
        status: 'pending',
      });

      const result = await invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123');

      expect(logger.info).toHaveBeenCalledWith(
        'Organization invitation created successfully',
        expect.objectContaining({
          invitationId: 'inv123',
          organizationId: 'org123',
          email: 'test@example.com',
          role: 'member',
        })
      );

      expect(result).toEqual({
        id: 'inv123',
        email: 'test@example.com',
        status: 'pending',
      });
    });

    it('should handle errors without stack traces gracefully', async () => {
      const errorWithoutStack = new Error('No stack error');
      delete errorWithoutStack.stack;
      mockApi.createInvitation.mockRejectedValue(errorWithoutStack);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow('No stack error');

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: 'No stack error',
        })
      );
    });

    it('should handle null/undefined error messages', async () => {
      const nullError = new Error();
      nullError.message = null;
      mockApi.createInvitation.mockRejectedValue(nullError);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Error creating organization invitation',
        expect.objectContaining({
          error: null,
        })
      );
    });
  });

  describe('Service Initialization Errors', () => {
    it('should handle auth initialization failure', async () => {
      vi.mocked(getAuth).mockReturnValue(null);

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow();
    });

    it('should handle missing auth API', async () => {
      vi.mocked(getAuth).mockReturnValue({});

      await expect(
        invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123')
      ).rejects.toThrow();
    });

    it('should reinitialize auth on each method call', async () => {
      mockApi.createInvitation.mockResolvedValue({ id: 'inv123' });

      await invitationService.createInvitation('org123', 'test@example.com', 'member', 'user123');

      expect(getAuth).toHaveBeenCalledTimes(1);

      await invitationService.createInvitation('org123', 'test2@example.com', 'member', 'user123');

      expect(getAuth).toHaveBeenCalledTimes(2);
    });
  });
});