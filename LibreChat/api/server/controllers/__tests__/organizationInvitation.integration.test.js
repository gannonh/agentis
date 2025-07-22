/**
 * @fileoverview Integration tests for organization invitation flow with Better Auth
 * @description Tests the complete invitation flow from API to database to email sending
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../index.js';
import { getAuth } from '../../../auth.js';
import User from '../../../models/User.js';

// Mock email service
const mockEmailService = {
  sendInvitationEmail: vi.fn(),
  sendMagicLink: vi.fn(),
  verifyTemplate: vi.fn(),
};

vi.mock('#server/services/EmailService.js', () => ({
  default: mockEmailService,
}));

describe('Organization Invitation Integration Tests', () => {
  let mongoServer;
  let auth;
  let testUser;
  let testOrganization;
  let userToken;

  beforeEach(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Initialize Better Auth
    auth = getAuth();

    // Create test user
    testUser = await User.create({
      name: 'John Doe',
      email: 'john.doe@example.com',
      emailVerified: true,
      role: 'user',
    });

    // Create test organization via Better Auth
    testOrganization = await auth.api.organization.create({
      name: 'Test Corporation',
      slug: 'test-corp',
      createdBy: testUser._id.toString(),
    });

    // Set the user as organization owner
    await auth.api.organization.addMember({
      organizationId: testOrganization.id,
      userId: testUser._id.toString(),
      role: 'owner',
    });

    // Generate JWT token for user
    userToken = 'mock-jwt-token';

    // Clear email service mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('POST /api/organization/invite-member', () => {
    it('should successfully invite a new member via Better Auth', async () => {
      const invitationData = {
        email: 'newmember@example.com',
        role: 'member',
        organizationId: testOrganization.id,
      };

      // Mock successful Better Auth invitation
      const mockInvitation = {
        id: 'invitation-123',
        email: 'newmember@example.com',
        role: 'member',
        organizationId: testOrganization.id,
        invitedBy: testUser._id.toString(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      vi.spyOn(auth.api.organization, 'inviteMember').mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue({ messageId: 'email-123' });

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        invitation: mockInvitation,
        emailSent: true,
      });

      // Verify Better Auth was called correctly
      expect(auth.api.organization.inviteMember).toHaveBeenCalledWith({
        email: 'newmember@example.com',
        role: 'member',
        organizationId: testOrganization.id,
        invitedBy: testUser._id.toString(),
      });

      // Verify email was sent with correct parameters
      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith({
        to: 'newmember@example.com',
        inviterName: 'John Doe',
        organizationName: 'Test Corporation',
        inviteLink: expect.stringContaining('invitation-123'),
        role: 'member',
      });
    });

    it('should handle Better Auth permission errors correctly', async () => {
      const invitationData = {
        email: 'restricted@example.com',
        role: 'admin',
        organizationId: testOrganization.id,
      };

      // Mock Better Auth permission error
      const permissionError = new Error('Insufficient permissions to invite admin');
      permissionError.code = 'INSUFFICIENT_PERMISSIONS';
      vi.spyOn(auth.api.organization, 'inviteMember').mockRejectedValue(permissionError);

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient permissions to invite admin',
        code: 'INSUFFICIENT_PERMISSIONS',
      });

      // Email should not be sent
      expect(mockEmailService.sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failures gracefully', async () => {
      const invitationData = {
        email: 'email-fail@example.com',
        role: 'member',
        organizationId: testOrganization.id,
      };

      const mockInvitation = {
        id: 'invitation-456',
        email: 'email-fail@example.com',
        role: 'member',
        organizationId: testOrganization.id,
        invitedBy: testUser._id.toString(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.spyOn(auth.api.organization, 'inviteMember').mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockRejectedValue(new Error('SMTP server unavailable'));

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        invitation: mockInvitation,
        emailSent: false,
        emailError: 'SMTP server unavailable',
      });

      // Better Auth invitation should still be created
      expect(auth.api.organization.inviteMember).toHaveBeenCalled();
    });

    it('should validate email format before processing', async () => {
      const invitationData = {
        email: 'invalid-email-format',
        role: 'member',
        organizationId: testOrganization.id,
      };

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid email format',
        field: 'email',
      });

      expect(auth.api.organization.inviteMember).not.toHaveBeenCalled();
      expect(mockEmailService.sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('should handle duplicate invitations correctly', async () => {
      const invitationData = {
        email: 'duplicate@example.com',
        role: 'member',
        organizationId: testOrganization.id,
      };

      // Mock Better Auth duplicate error
      const duplicateError = new Error('User already invited');
      duplicateError.code = 'DUPLICATE_INVITATION';
      vi.spyOn(auth.api.organization, 'inviteMember').mockRejectedValue(duplicateError);

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'User already invited',
        code: 'DUPLICATE_INVITATION',
      });

      expect(mockEmailService.sendInvitationEmail).not.toHaveBeenCalled();
    });

    it('should include inviter information in email template', async () => {
      const invitationData = {
        email: 'inviter-info@example.com',
        role: 'member',
        organizationId: testOrganization.id,
      };

      const mockInvitation = {
        id: 'invitation-789',
        email: 'inviter-info@example.com',
        role: 'member',
        organizationId: testOrganization.id,
        invitedBy: testUser._id.toString(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.spyOn(auth.api.organization, 'inviteMember').mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue({ messageId: 'email-789' });

      await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(200);

      // Verify inviter information is included in email
      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith({
        to: 'inviter-info@example.com',
        inviterName: 'John Doe',
        inviterEmail: 'john.doe@example.com',
        organizationName: 'Test Corporation',
        inviteLink: expect.stringContaining('invitation-789'),
        role: 'member',
      });
    });

    it('should handle organization not found errors', async () => {
      const invitationData = {
        email: 'nonexistent@example.com',
        role: 'member',
        organizationId: 'nonexistent-org-id',
      };

      const notFoundError = new Error('Organization not found');
      notFoundError.code = 'ORGANIZATION_NOT_FOUND';
      vi.spyOn(auth.api.organization, 'inviteMember').mockRejectedValue(notFoundError);

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Organization not found',
        code: 'ORGANIZATION_NOT_FOUND',
      });
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        role: 'member',
        organizationId: testOrganization.id,
        // Missing email
      };

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Email is required',
        field: 'email',
      });
    });

    it('should handle authentication errors', async () => {
      const invitationData = {
        email: 'unauthorized@example.com',
        role: 'member',
        organizationId: testOrganization.id,
      };

      const response = await request(app)
        .post('/api/organization/invite-member')
        // No Authorization header
        .send(invitationData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: 'Authentication required',
      });
    });
  });

  describe('GET /api/organization/:id/invitations', () => {
    it('should list pending invitations for organization admins', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'pending1@example.com',
          role: 'member',
          status: 'pending',
          invitedBy: testUser._id.toString(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'inv-2',
          email: 'pending2@example.com',
          role: 'admin',
          status: 'pending',
          invitedBy: testUser._id.toString(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      vi.spyOn(auth.api.organization, 'listInvitations').mockResolvedValue(mockInvitations);

      const response = await request(app)
        .get(`/api/organization/${testOrganization.id}/invitations`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        invitations: mockInvitations,
      });

      expect(auth.api.organization.listInvitations).toHaveBeenCalledWith({
        organizationId: testOrganization.id,
      });
    });

    it('should deny access to non-admin users', async () => {
      // Create a regular member user
      const memberUser = await User.create({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        emailVerified: true,
        role: 'user',
      });

      await auth.api.organization.addMember({
        organizationId: testOrganization.id,
        userId: memberUser._id.toString(),
        role: 'member',
      });

      const memberToken = 'member-jwt-token';

      const response = await request(app)
        .get(`/api/organization/${testOrganization.id}/invitations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient permissions to view invitations',
      });
    });
  });

  describe('POST /api/organization/invitations/:id/resend', () => {
    it('should resend invitation email for pending invitations', async () => {
      const invitationId = 'invitation-resend-123';
      const mockInvitation = {
        id: invitationId,
        email: 'resend@example.com',
        role: 'member',
        organizationId: testOrganization.id,
        invitedBy: testUser._id.toString(),
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.spyOn(auth.api.organization, 'getInvitation').mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue({ messageId: 'resend-email-123' });

      const response = await request(app)
        .post(`/api/organization/invitations/${invitationId}/resend`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Invitation email resent successfully',
      });

      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith({
        to: 'resend@example.com',
        inviterName: 'John Doe',
        inviterEmail: 'john.doe@example.com',
        organizationName: 'Test Corporation',
        inviteLink: expect.stringContaining(invitationId),
        role: 'member',
      });
    });

    it('should not resend email for accepted invitations', async () => {
      const invitationId = 'invitation-accepted-123';
      const mockInvitation = {
        id: invitationId,
        email: 'accepted@example.com',
        role: 'member',
        organizationId: testOrganization.id,
        invitedBy: testUser._id.toString(),
        status: 'accepted',
        acceptedAt: new Date(),
      };

      vi.spyOn(auth.api.organization, 'getInvitation').mockResolvedValue(mockInvitation);

      const response = await request(app)
        .post(`/api/organization/invitations/${invitationId}/resend`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot resend email for accepted invitation',
      });

      expect(mockEmailService.sendInvitationEmail).not.toHaveBeenCalled();
    });
  });

  describe('Database Integration', () => {
    it('should maintain data consistency between Better Auth and MongoDB', async () => {
      const invitationData = {
        email: 'consistency@example.com',
        role: 'member',
        organizationId: testOrganization.id,
      };

      const mockInvitation = {
        id: 'invitation-consistency-123',
        email: 'consistency@example.com',
        role: 'member',
        organizationId: testOrganization.id,
        invitedBy: testUser._id.toString(),
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.spyOn(auth.api.organization, 'inviteMember').mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue({ messageId: 'consistency-email' });

      await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(200);

      // Verify invitation exists in Better Auth
      expect(auth.api.organization.inviteMember).toHaveBeenCalled();

      // Verify user exists in MongoDB
      const user = await User.findById(testUser._id);
      expect(user).toBeTruthy();
      expect(user.email).toBe('john.doe@example.com');
    });

    it('should handle database connection errors gracefully', async () => {
      // Disconnect from MongoDB to simulate connection error
      await mongoose.connection.close();

      const invitationData = {
        email: 'db-error@example.com',
        role: 'member',
        organizationId: testOrganization.id,
      };

      const response = await request(app)
        .post('/api/organization/invite-member')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invitationData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Database connection error',
      });

      // Reconnect for cleanup
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });
});
