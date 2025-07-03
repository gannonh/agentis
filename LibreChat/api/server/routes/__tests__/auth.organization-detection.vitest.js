/**
 * @fileoverview Tests for Organization Detection API endpoint
 * @module routes/auth.organization-detection.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the OrganizationDetectionService
vi.mock('../../services/OrganizationDetectionService.js', () => ({
  checkDomainOrganizations: vi.fn(),
}));

import { checkDomainOrganizations } from '../../services/OrganizationDetectionService.js';

describe('POST /api/auth/organization/detect-domain', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Add the endpoint we're testing
    app.post('/api/auth/organization/detect-domain', async (req, res) => {
      try {
        const { email, inviteToken } = req.body;

        if (!email) {
          return res.status(400).json({
            error: 'Email is required',
          });
        }

        // Build invite context if token is provided
        let inviteContext = null;
        if (inviteToken) {
          inviteContext = {
            inviteToken,
            organizationId: 'invited-org-123',
            organizationName: 'Invited Company',
          };
        }

        const result = await checkDomainOrganizations(email, inviteContext);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to detect organization',
          message: error.message,
        });
      }
    });
  });

  it('should return 400 when email is missing', async () => {
    const response = await request(app).post('/api/auth/organization/detect-domain').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Email is required',
    });
  });

  it('should return detection result for valid email', async () => {
    const mockResult = {
      isPublicDomain: true,
      domain: 'gmail.com',
      hasOrganization: false,
      organizations: [],
      canAutoJoin: false,
    };

    checkDomainOrganizations.mockResolvedValue(mockResult);

    const response = await request(app)
      .post('/api/auth/organization/detect-domain')
      .send({ email: 'user@gmail.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResult);
    expect(checkDomainOrganizations).toHaveBeenCalledWith('user@gmail.com', null);
  });

  it('should return 500 when service throws error', async () => {
    const errorMessage = 'Database connection failed';
    checkDomainOrganizations.mockRejectedValue(new Error(errorMessage));

    const response = await request(app)
      .post('/api/auth/organization/detect-domain')
      .send({ email: 'user@gmail.com' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: 'Failed to detect organization',
      message: errorMessage,
    });
  });

  it('should handle invitation token in request', async () => {
    const mockResult = {
      isPublicDomain: true,
      bypassDomainCheck: true,
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
      invitation: {
        organizationId: 'invited-org-123',
        organizationName: 'Invited Company',
        inviteToken: 'valid-token-123',
      },
    };

    checkDomainOrganizations.mockResolvedValue(mockResult);

    const response = await request(app).post('/api/auth/organization/detect-domain').send({
      email: 'user@gmail.com',
      inviteToken: 'valid-token-123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResult);
    expect(checkDomainOrganizations).toHaveBeenCalledWith(
      'user@gmail.com',
      expect.objectContaining({
        inviteToken: 'valid-token-123',
      }),
    );
  });
});
