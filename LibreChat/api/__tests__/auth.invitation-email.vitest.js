/**
 * @fileoverview Tests for Better Auth organization plugin sendInvitationEmail function
 * @module auth.invitation-email.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendInvitationEmail } from '../auth.js';

// Mock the sendEmail utility
const mockSendEmail = vi.fn();
vi.mock('../server/utils/sendEmail.js', () => ({
  default: mockSendEmail,
}));

// Mock the logger
vi.mock('../config/winston.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Better Auth Organization Plugin - sendInvitationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call sendEmail with correct parameters', async () => {
    // GREEN PHASE: This test should now pass with the implementation

    // Mock invitation data that would be passed to sendInvitationEmail
    const invitationData = {
      id: 'invitation-123',
      email: 'colleague@company.com',
      organizationId: 'org-456',
      inviterId: 'user-789',
      inviterName: 'John Doe',
      inviterEmail: 'john@company.com',
      organizationName: 'Test Organization',
      inviteLink: 'http://localhost:3080/invite/accept?token=abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    // Mock request object (Better Auth context)
    const mockRequest = {
      headers: {
        'user-agent': 'test-user-agent',
        host: 'localhost:3080',
      },
    };

    // Call the function
    await sendInvitationEmail(invitationData, mockRequest);

    // Verify sendEmail was called with correct template and parameters
    expect(mockSendEmail).toHaveBeenCalledWith({
      email: 'colleague@company.com',
      subject: "Join John Doe's team at Test Organization",
      template: 'organizationInvite.handlebars',
      payload: {
        name: 'colleague', // Extract username portion from email
        inviterName: 'John Doe',
        organizationName: 'Test Organization',
        inviteLink: 'http://localhost:3080/invite/accept?token=abc123',
        appName: process.env.APP_TITLE || 'Agentis',
        year: new Date().getFullYear(),
      },
    });
  });

  it('should handle missing inviter name gracefully', async () => {
    // GREEN PHASE: This test should now pass with the implementation

    const invitationData = {
      id: 'invitation-123',
      email: 'colleague@company.com',
      organizationId: 'org-456',
      inviterId: 'user-789',
      // Missing inviterName - should fallback to email
      inviterEmail: 'john@company.com',
      organizationName: 'Test Organization',
      inviteLink: 'http://localhost:3080/invite/accept?token=abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const mockRequest = {};

    await sendInvitationEmail(invitationData, mockRequest);

    // Should fallback to email prefix as inviter name
    expect(mockSendEmail).toHaveBeenCalledWith({
      email: 'colleague@company.com',
      subject: "Join john's team at Test Organization",
      template: 'organizationInvite.handlebars',
      payload: {
        name: 'colleague', // Extract username portion from email
        inviterName: 'john', // Should fallback to email prefix
        organizationName: 'Test Organization',
        inviteLink: 'http://localhost:3080/invite/accept?token=abc123',
        appName: process.env.APP_TITLE || 'Agentis',
        year: new Date().getFullYear(),
      },
    });
  });

  it('should handle email sending errors', async () => {
    // GREEN PHASE: This test should now pass with the implementation

    const invitationData = {
      id: 'invitation-123',
      email: 'colleague@company.com',
      organizationId: 'org-456',
      inviterId: 'user-789',
      inviterName: 'John Doe',
      inviterEmail: 'john@company.com',
      organizationName: 'Test Organization',
      inviteLink: 'http://localhost:3080/invite/accept?token=abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const mockRequest = {};

    // Mock sendEmail to throw an error
    mockSendEmail.mockRejectedValue(new Error('SMTP connection failed'));

    // Should handle error gracefully and return error info
    const result = await sendInvitationEmail(invitationData, mockRequest);

    expect(result).toEqual({
      success: false,
      error: 'SMTP connection failed',
    });
  });

  it('should use Mailhog in development', async () => {
    // GREEN PHASE: This test should now pass with the implementation

    // Set development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const invitationData = {
      id: 'invitation-123',
      email: 'colleague@company.com',
      organizationId: 'org-456',
      inviterId: 'user-789',
      inviterName: 'John Doe',
      inviterEmail: 'john@company.com',
      organizationName: 'Test Organization',
      inviteLink: 'http://localhost:3080/invite/accept?token=abc123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const mockRequest = {};

    await sendInvitationEmail(invitationData, mockRequest);

    // Verify sendEmail was called (sendEmail internally handles Mailhog routing)
    expect(mockSendEmail).toHaveBeenCalled();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });
});
