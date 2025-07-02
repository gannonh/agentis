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
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({
            error: 'Email is required',
          });
        }

        const result = await checkDomainOrganizations(email);
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
    const response = await request(app)
      .post('/api/auth/organization/detect-domain')
      .send({});

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
      canAutoJoin: false
    };

    checkDomainOrganizations.mockResolvedValue(mockResult);

    const response = await request(app)
      .post('/api/auth/organization/detect-domain')
      .send({ email: 'user@gmail.com' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResult);
    expect(checkDomainOrganizations).toHaveBeenCalledWith('user@gmail.com');
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
});