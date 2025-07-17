/**
 * @fileoverview Integration tests for invitation routes
 * @module server/routes/__tests__/invitations.integration.vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock services using vi.fn() directly in the mock
vi.mock('#server/services/InvitationService.js', () => ({
  invitationService: {
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
    getInvitation: vi.fn(),
    cancelInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    rejectInvitation: vi.fn(),
    resendInvitation: vi.fn(),
    hasInvitationPermission: vi.fn(),
  },
}));

vi.mock('#server/services/OrganizationService.js', () => ({
  organizationService: {},
}));

// Mock logger
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock middleware
vi.mock('#server/middleware/index.js', () => ({
  requireBetterAuth: vi.fn(),
}));

// Import after mocks
import invitationRoutes from '../invitations.js';
import { invitationService } from '#server/services/InvitationService.js';
import { requireBetterAuth } from '#server/middleware/index.js';

describe('Invitation Routes Integration Tests', () => {
  let app;

  // Test data
  const testOrganizationId = '507f1f77bcf86cd799439011';
  const testInvitationId = '507f1f77bcf86cd799439012';
  const testUserId = 'authenticated-user-id';
  const testEmail = 'test@example.com';
  const testInvitation = {
    id: testInvitationId,
    organizationId: testOrganizationId,
    email: testEmail,
    role: 'member',
    status: 'pending',
    invitedBy: testUserId,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api', invitationRoutes);

    // Reset mocks
    vi.clearAllMocks();
    
    // Default auth middleware - authenticated user
    requireBetterAuth.mockImplementation((req, res, next) => {
      req.user = { id: testUserId };
      next();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/:organizationId/invitations', () => {
    it('should create an invitation successfully', async () => {
      // Setup mocks
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.createInvitation.mockResolvedValue(testInvitation);

      const response = await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ email: testEmail })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(testInvitation);
      expect(response.body.message).toBe('Invitation created and sent successfully');
    });

    it('should require email field', async () => {
      const response = await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ role: 'member' })
        .expect(400);

      expect(response.body.error).toBe('Email is required');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    it('should deny access without permission', async () => {
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: false,
      });

      const response = await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ email: testEmail })
        .expect(403);

      expect(response.body.error).toBe('You do not have permission to invite members to this organization');
    });

    it('should handle already member error', async () => {
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.createInvitation.mockRejectedValue(
        new Error('User is already a member of this organization')
      );

      const response = await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ email: testEmail })
        .expect(409);

      expect(response.body.error).toBe('User is already a member of this organization');
    });

    it('should handle already invited error', async () => {
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.createInvitation.mockRejectedValue(
        new Error('User has already invited to this organization')
      );

      const response = await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ email: testEmail })
        .expect(409);

      expect(response.body.error).toBe('User has already been invited to this organization');
    });

    it('should deny access to unauthenticated users', async () => {
      requireBetterAuth.mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const response = await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ email: testEmail })
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('GET /api/:organizationId/invitations', () => {
    it('should list invitations successfully', async () => {
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.listInvitations.mockResolvedValue([testInvitation]);

      const response = await request(app)
        .get(`/api/${testOrganizationId}/invitations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([testInvitation]);
    });

    it('should deny access without permission', async () => {
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: false,
      });

      const response = await request(app)
        .get(`/api/${testOrganizationId}/invitations`)
        .expect(403);

      expect(response.body.error).toBe('You do not have permission to view invitations for this organization');
    });
  });

  describe('POST /api/invitations/:invitationId/accept', () => {
    it('should accept invitation successfully', async () => {
      const acceptResult = { 
        membership: { 
          userId: testUserId, 
          organizationId: testOrganizationId,
          role: 'member' 
        } 
      };
      invitationService.acceptInvitation.mockResolvedValue(acceptResult);

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/accept`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(acceptResult);
      expect(response.body.message).toBe('Invitation accepted successfully');
    });

    it('should handle invitation not found', async () => {
      invitationService.acceptInvitation.mockRejectedValue(
        new Error('Invitation not found or has expired')
      );

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/accept`)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found or has expired');
    });

    it('should handle already accepted invitation', async () => {
      invitationService.acceptInvitation.mockRejectedValue(
        new Error('Invitation has already accepted')
      );

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/accept`)
        .expect(409);

      expect(response.body.error).toBe('Invitation has already been accepted');
    });
  });

  describe('POST /api/invitations/:invitationId/reject', () => {
    it('should reject invitation successfully', async () => {
      invitationService.rejectInvitation.mockResolvedValue();

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/reject`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation rejected successfully');
    });

    it('should handle invitation not found', async () => {
      invitationService.rejectInvitation.mockRejectedValue(
        new Error('Invitation not found or has expired')
      );

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/reject`)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found or has expired');
    });
  });

  describe('GET /api/invitations/:invitationId', () => {
    it('should get invitation details successfully', async () => {
      invitationService.getInvitation.mockResolvedValue(testInvitation);

      const response = await request(app)
        .get(`/api/invitations/${testInvitationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(testInvitation);
    });

    it('should handle invitation not found', async () => {
      invitationService.getInvitation.mockRejectedValue(
        new Error('Invitation not found')
      );

      const response = await request(app)
        .get(`/api/invitations/${testInvitationId}`)
        .expect(404);

      expect(response.body.error).toBe('Invitation not found');
    });
  });

  describe('DELETE /api/invitations/:invitationId', () => {
    it('should cancel invitation successfully', async () => {
      invitationService.getInvitation.mockResolvedValue(testInvitation);
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.cancelInvitation.mockResolvedValue();

      const response = await request(app)
        .delete(`/api/invitations/${testInvitationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation canceled successfully');
    });

    it('should deny access without permission', async () => {
      invitationService.getInvitation.mockResolvedValue(testInvitation);
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: false,
      });

      const response = await request(app)
        .delete(`/api/invitations/${testInvitationId}`)
        .expect(403);

      expect(response.body.error).toBe('You do not have permission to cancel this invitation');
    });
  });

  describe('POST /api/invitations/:invitationId/resend', () => {
    it('should resend invitation successfully', async () => {
      invitationService.getInvitation.mockResolvedValue(testInvitation);
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.resendInvitation.mockResolvedValue();

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/resend`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation resent successfully');
    });

    it('should handle cannot resend error', async () => {
      invitationService.getInvitation.mockResolvedValue(testInvitation);
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.resendInvitation.mockRejectedValue(
        new Error('Cannot resend invitation that has already been accepted')
      );

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/resend`)
        .expect(400);

      expect(response.body.error).toBe('Cannot resend invitation that has already been accepted');
    });

    it('should deny access without permission', async () => {
      invitationService.getInvitation.mockResolvedValue(testInvitation);
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: false,
      });

      const response = await request(app)
        .post(`/api/invitations/${testInvitationId}/resend`)
        .expect(403);

      expect(response.body.error).toBe('You do not have permission to resend this invitation');
    });
  });

  describe('Service Integration', () => {
    it('should pass correct parameters to createInvitation', async () => {
      invitationService.hasInvitationPermission.mockResolvedValue({
        ok: true,
        hasPermission: true,
      });
      invitationService.createInvitation.mockResolvedValue(testInvitation);

      await request(app)
        .post(`/api/${testOrganizationId}/invitations`)
        .send({ email: testEmail, role: 'admin' })
        .expect(201);

      expect(invitationService.createInvitation).toHaveBeenCalledWith(
        testOrganizationId,
        testEmail,
        'admin',
        testUserId
      );
    });

    it('should pass correct parameters to acceptInvitation', async () => {
      const acceptResult = { membership: { userId: testUserId, organizationId: testOrganizationId, role: 'member' } };
      invitationService.acceptInvitation.mockResolvedValue(acceptResult);

      await request(app)
        .post(`/api/invitations/${testInvitationId}/accept`)
        .expect(200);

      expect(invitationService.acceptInvitation).toHaveBeenCalledWith(
        testInvitationId,
        testUserId
      );
    });

    it('should pass correct parameters to rejectInvitation', async () => {
      invitationService.rejectInvitation.mockResolvedValue();

      await request(app)
        .post(`/api/invitations/${testInvitationId}/reject`)
        .expect(200);

      expect(invitationService.rejectInvitation).toHaveBeenCalledWith(
        testInvitationId,
        testUserId
      );
    });
  });
});