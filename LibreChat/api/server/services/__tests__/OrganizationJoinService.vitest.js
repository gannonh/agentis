/**
 * @fileoverview Unit tests for OrganizationJoinService - TDD approach for Issue #104
 * @module api/server/services/__tests__/OrganizationJoinService.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import OrganizationJoinService from '../OrganizationJoinService.js';

// Mock Better Auth
const mockAuth = {
  api: {
    organization: {
      addMember: vi.fn(),
      getMember: vi.fn(),
    },
  },
};

vi.mock('#auth.js', () => ({
  getAuth: () => mockAuth,
}));

// Mock logger
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OrganizationJoinService - TDD for Issue #104', () => {
  let mongoServer;
  let db;

  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    db = mongoose.connection.db;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Auto-Join Flow', () => {
    describe('autoJoinOrganization', () => {
      it('should successfully auto-join user to organization with domain join enabled', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userEmail = 'john@acme.com';

        // Create test organization with domain join enabled
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: true,
          },
        });

        // Act
        const result = await OrganizationJoinService.autoJoinOrganization({
          userId,
          organizationId,
          userEmail,
        });

        // Assert
        expect(result).toMatchObject({
          success: true,
          membershipId: expect.any(String),
          role: 'member',
          organizationId,
        });

        // Verify member was added to database
        const member = await db.collection('member').findOne({
          userId: mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId,
          organizationId: mongoose.Types.ObjectId.isValid(organizationId)
            ? new mongoose.Types.ObjectId(organizationId)
            : organizationId,
        });
        expect(member).toBeTruthy();
        expect(member.role).toBe('member');

        // Verify Better Auth API was called to add member
        expect(mockAuth.api.organization.addMember).toHaveBeenCalledWith({
          userId,
          organizationId,
          role: 'member',
        });
      });

      it('should reject auto-join when organization does not allow domain join', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userEmail = 'john@acme.com';

        // Create test organization with domain join disabled
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: false,
          },
        });

        // Act & Assert
        await expect(
          OrganizationJoinService.autoJoinOrganization({
            userId,
            organizationId,
            userEmail,
          }),
        ).rejects.toThrow('Organization does not allow automatic domain joining');

        expect(mockAuth.api.organization.addMember).not.toHaveBeenCalled();
      });

      it('should reject auto-join when user email domain does not match organization domain', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userEmail = 'john@wrongdomain.com';

        // Create test organization
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: true,
          },
        });

        // Act & Assert
        await expect(
          OrganizationJoinService.autoJoinOrganization({
            userId,
            organizationId,
            userEmail,
          }),
        ).rejects.toThrow('User email domain does not match organization domain');

        expect(mockAuth.api.organization.addMember).not.toHaveBeenCalled();
      });

      it('should reject auto-join when organization does not exist', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'nonexistent-org';
        const userEmail = 'john@acme.com';

        // Act & Assert
        await expect(
          OrganizationJoinService.autoJoinOrganization({
            userId,
            organizationId,
            userEmail,
          }),
        ).rejects.toThrow('Organization not found');

        expect(mockAuth.api.organization.addMember).not.toHaveBeenCalled();
      });

      it('should reject auto-join when user is already a member', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userEmail = 'john@acme.com';

        // Create test organization
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: true,
          },
        });

        // Create existing member record
        await db.collection('member').insertOne({
          _id: new mongoose.Types.ObjectId(),
          userId: mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId,
          organizationId: mongoose.Types.ObjectId.isValid(organizationId)
            ? new mongoose.Types.ObjectId(organizationId)
            : organizationId,
          role: 'member',
          createdAt: new Date(),
        });

        // Act & Assert
        await expect(
          OrganizationJoinService.autoJoinOrganization({
            userId,
            organizationId,
            userEmail,
          }),
        ).rejects.toThrow('User is already a member of this organization');

        expect(mockAuth.api.organization.addMember).not.toHaveBeenCalled();
      });

      it('should handle invalid ObjectId format gracefully', async () => {
        // Arrange
        const userId = 'invalid-id-format';
        const organizationId = 'org-456';
        const userEmail = 'john@acme.com';

        // Create test organization
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: true,
          },
        });

        // Act - should still succeed with string IDs
        const result = await OrganizationJoinService.autoJoinOrganization({
          userId,
          organizationId,
          userEmail,
        });

        // Assert - should handle non-ObjectId strings gracefully
        expect(result).toMatchObject({
          success: true,
          membershipId: expect.any(String),
          role: 'member',
          organizationId,
        });

        // Verify Better Auth API was called to add member
        expect(mockAuth.api.organization.addMember).toHaveBeenCalledWith({
          userId,
          organizationId,
          role: 'member',
        });
      });
    });

    describe('validateAutoJoinEligibility', () => {
      it('should return true for valid auto-join scenario', async () => {
        // Arrange
        const userEmail = 'john@acme.com';
        const organizationId = 'org-456';

        // Create test organization
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: true,
          },
        });

        // Act
        const result = await OrganizationJoinService.validateAutoJoinEligibility({
          userEmail,
          organizationId,
        });

        // Assert
        expect(result).toEqual({
          eligible: true,
          organization: {
            id: organizationId,
            name: 'ACME Corp',
            domain: 'acme.com',
            allowDomainJoin: true,
          },
        });
      });

      it('should return false when domain join is disabled', async () => {
        // Arrange
        const userEmail = 'john@acme.com';
        const organizationId = 'org-456';

        // Create test organization with domain join disabled
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: false,
          },
        });

        // Act
        const result = await OrganizationJoinService.validateAutoJoinEligibility({
          userEmail,
          organizationId,
        });

        // Assert
        expect(result).toEqual({
          eligible: false,
          reason: 'Organization does not allow automatic domain joining',
          organization: {
            id: organizationId,
            name: 'ACME Corp',
            domain: 'acme.com',
            allowDomainJoin: false,
          },
        });
      });
    });
  });

  describe('Request-to-Join Flow', () => {
    describe('createJoinRequest', () => {
      it('should successfully create a join request', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userEmail = 'john@acme.com';
        const requestMessage = 'I would like to join your team.';

        // Create test organization
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: false,
          },
        });

        // Act
        const result = await OrganizationJoinService.createJoinRequest({
          userId,
          organizationId,
          userEmail,
          requestMessage,
        });

        // Assert
        expect(result).toEqual({
          success: true,
          requestId: expect.any(String),
          status: 'pending',
          organizationId,
          userId,
        });

        // Verify request was saved to database
        const organization = await db.collection('organization').findOne({ id: organizationId });
        expect(organization.metadata.joinRequests).toHaveLength(1);
        expect(organization.metadata.joinRequests[0]).toMatchObject({
          userId,
          userEmail,
          requestMessage,
          status: 'pending',
          requestedAt: expect.any(Date),
        });
      });

      it('should reject duplicate join requests from same user', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userEmail = 'john@acme.com';

        // Create test organization with existing join request
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: false,
            joinRequests: [
              {
                id: 'request-123',
                userId,
                userEmail,
                status: 'pending',
                requestedAt: new Date(),
              },
            ],
          },
        });

        // Act & Assert
        await expect(
          OrganizationJoinService.createJoinRequest({
            userId,
            organizationId,
            userEmail,
          }),
        ).rejects.toThrow('User already has a pending join request for this organization');
      });

      it('should allow new request if previous request was rejected', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';
        const userEmail = 'john@acme.com';

        // Create test organization with rejected join request
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            allowDomainJoin: false,
            joinRequests: [
              {
                id: 'request-123',
                userId,
                userEmail,
                status: 'rejected',
                requestedAt: new Date(),
                reviewedAt: new Date(),
              },
            ],
          },
        });

        // Act
        const result = await OrganizationJoinService.createJoinRequest({
          userId,
          organizationId,
          userEmail,
          requestMessage: 'Please reconsider my application.',
        });

        // Assert
        expect(result.success).toBe(true);

        // Verify new request was added
        const organization = await db.collection('organization').findOne({ id: organizationId });
        const pendingRequests = organization.metadata.joinRequests.filter(
          (r) => r.status === 'pending',
        );
        expect(pendingRequests).toHaveLength(1);
      });
    });

    describe('approveJoinRequest', () => {
      it('should successfully approve join request and add user as member', async () => {
        // Arrange
        const requestId = 'request-123';
        const organizationId = 'org-456';
        const userId = 'user-123';
        const reviewerId = 'admin-789';

        // Create test organization with pending request
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            joinRequests: [
              {
                id: requestId,
                userId,
                userEmail: 'john@acme.com',
                status: 'pending',
                requestedAt: new Date(),
              },
            ],
          },
        });

        // Act
        const result = await OrganizationJoinService.approveJoinRequest({
          requestId,
          organizationId,
          reviewerId,
        });

        // Assert
        expect(result).toMatchObject({
          success: true,
          membershipId: expect.any(String),
          userId,
          organizationId,
        });

        // Verify request status updated
        const organization = await db.collection('organization').findOne({ id: organizationId });
        const request = organization.metadata.joinRequests.find((r) => r.id === requestId);
        expect(request.status).toBe('approved');
        expect(request.reviewedBy).toBe(reviewerId);
        expect(request.reviewedAt).toBeInstanceOf(Date);

        // Verify member was added to database
        const member = await db.collection('member').findOne({
          userId: mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId,
          organizationId: mongoose.Types.ObjectId.isValid(organizationId)
            ? new mongoose.Types.ObjectId(organizationId)
            : organizationId,
        });
        expect(member).toBeTruthy();
        expect(member.role).toBe('member');

        // Verify Better Auth API was called to add member
        expect(mockAuth.api.organization.addMember).toHaveBeenCalledWith({
          userId,
          organizationId,
          role: 'member',
        });
      });

      it('should reject approval of non-existent request', async () => {
        // Arrange
        const requestId = 'nonexistent-request';
        const organizationId = 'org-456';
        const reviewerId = 'admin-789';

        // Create test organization without the request
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            joinRequests: [],
          },
        });

        // Act & Assert
        await expect(
          OrganizationJoinService.approveJoinRequest({
            requestId,
            organizationId,
            reviewerId,
          }),
        ).rejects.toThrow('Join request not found');
      });
    });

    describe('rejectJoinRequest', () => {
      it('should successfully reject join request', async () => {
        // Arrange
        const requestId = 'request-123';
        const organizationId = 'org-456';
        const reviewerId = 'admin-789';
        const rejectionReason = 'Not a good fit for the team at this time.';

        // Create test organization with pending request
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            joinRequests: [
              {
                id: requestId,
                userId: 'user-123',
                userEmail: 'john@acme.com',
                status: 'pending',
                requestedAt: new Date(),
              },
            ],
          },
        });

        // Act
        const result = await OrganizationJoinService.rejectJoinRequest({
          requestId,
          organizationId,
          reviewerId,
          rejectionReason,
        });

        // Assert
        expect(result).toEqual({
          success: true,
          requestId,
          status: 'rejected',
        });

        // Verify request status updated
        const organization = await db.collection('organization').findOne({ id: organizationId });
        const request = organization.metadata.joinRequests.find((r) => r.id === requestId);
        expect(request.status).toBe('rejected');
        expect(request.reviewedBy).toBe(reviewerId);
        expect(request.reviewedAt).toBeInstanceOf(Date);
        expect(request.rejectionReason).toBe(rejectionReason);
      });
    });

    describe('getJoinRequests', () => {
      it('should return pending join requests for organization', async () => {
        // Arrange
        const organizationId = 'org-456';
        const pendingRequest = {
          id: 'request-123',
          userId: 'user-123',
          userEmail: 'john@acme.com',
          status: 'pending',
          requestedAt: new Date(),
        };
        const approvedRequest = {
          id: 'request-456',
          userId: 'user-456',
          userEmail: 'jane@acme.com',
          status: 'approved',
          requestedAt: new Date(),
        };

        // Create test organization with requests
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            joinRequests: [pendingRequest, approvedRequest],
          },
        });

        // Act
        const result = await OrganizationJoinService.getJoinRequests({
          organizationId,
          status: 'pending',
        });

        // Assert
        expect(result).toEqual({
          requests: [
            expect.objectContaining({
              id: 'request-123',
              userId: 'user-123',
              userEmail: 'john@acme.com',
              status: 'pending',
            }),
          ],
          total: 1,
        });
      });

      it('should return all join requests when no status filter provided', async () => {
        // Arrange
        const organizationId = 'org-456';

        // Create test organization with multiple requests
        await db.collection('organization').insertOne({
          id: organizationId,
          name: 'ACME Corp',
          metadata: {
            domain: 'acme.com',
            joinRequests: [
              { id: 'request-1', status: 'pending' },
              { id: 'request-2', status: 'approved' },
              { id: 'request-3', status: 'rejected' },
            ],
          },
        });

        // Act
        const result = await OrganizationJoinService.getJoinRequests({
          organizationId,
        });

        // Assert
        expect(result.total).toBe(3);
        expect(result.requests).toHaveLength(3);
      });
    });
  });

  describe('Membership Status Check', () => {
    describe('checkUserMembership', () => {
      it('should return true when user is a member', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';

        // Create test membership
        await db.collection('member').insertOne({
          userId,
          organizationId,
          role: 'member',
        });

        // Act
        const result = await OrganizationJoinService.checkUserMembership({
          userId,
          organizationId,
        });

        // Assert
        expect(result).toBe(true);
      });

      it('should return false when user is not a member', async () => {
        // Arrange
        const userId = 'user-123';
        const organizationId = 'org-456';

        // Act (no membership record created)
        const result = await OrganizationJoinService.checkUserMembership({
          userId,
          organizationId,
        });

        // Assert
        expect(result).toBe(false);
      });

      it('should return true for admin members', async () => {
        // Arrange
        const userId = 'admin-123';
        const organizationId = 'org-456';

        // Create test admin membership
        await db.collection('member').insertOne({
          userId,
          organizationId,
          role: 'admin',
        });

        // Act
        const result = await OrganizationJoinService.checkUserMembership({
          userId,
          organizationId,
        });

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for owner members', async () => {
        // Arrange
        const userId = 'owner-123';
        const organizationId = 'org-456';

        // Create test owner membership
        await db.collection('member').insertOne({
          userId,
          organizationId,
          role: 'owner',
        });

        // Act
        const result = await OrganizationJoinService.checkUserMembership({
          userId,
          organizationId,
        });

        // Assert
        expect(result).toBe(true);
      });

      it('should handle ObjectId format consistently', async () => {
        // Arrange
        const userId = new mongoose.Types.ObjectId();
        const organizationId = new mongoose.Types.ObjectId();

        // Create test membership with ObjectId
        await db.collection('member').insertOne({
          userId,
          organizationId,
          role: 'member',
        });

        // Act - test with string representation
        const result = await OrganizationJoinService.checkUserMembership({
          userId: userId.toString(),
          organizationId: organizationId.toString(),
        });

        // Assert
        expect(result).toBe(true);
      });
    });
  });

  /**
   * Race Condition Prevention Tests
   * Tests to verify that the atomic upsert operation prevents race conditions
   */
  describe('Race Condition Prevention', () => {
    it('should prevent duplicate memberships when multiple requests happen simultaneously', async () => {
      // Arrange
      const userId = new mongoose.Types.ObjectId().toString();
      const organizationId = new mongoose.Types.ObjectId().toString();
      const userEmail = 'user@example.com';
      const orgDomain = 'example.com';

      // Create test organization with domain join enabled
      await db.collection('organization').insertOne({
        _id: new mongoose.Types.ObjectId(organizationId),
        name: 'Test Organization',
        slug: 'test-org-race',
        metadata: {
          domain: orgDomain,
          allowDomainJoin: true,
        },
      });

      // Create test user
      await db.collection('users').insertOne({
        _id: new mongoose.Types.ObjectId(userId),
        email: userEmail,
        name: 'Test User',
      });

      // Act - Simulate concurrent requests
      const concurrentRequests = Array.from({ length: 5 }, () =>
        OrganizationJoinService.autoJoinOrganization({
          userId,
          organizationId,
          userEmail,
        }),
      );

      // Execute all requests simultaneously
      const results = await Promise.allSettled(concurrentRequests);

      // Assert
      const successfulResults = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success,
      );
      const failedResults = results.filter(
        (result) =>
          result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success),
      );

      // At least one should succeed and the rest should fail
      expect(successfulResults.length).toBeGreaterThanOrEqual(1);
      expect(failedResults.length).toBeGreaterThanOrEqual(4);

      // Verify only one membership was created using flexible ID search
      const { findMembershipFlexible } = await import('../../utils/flexibleId.js');
      const membership = await findMembershipFlexible(db, userId, organizationId);

      expect(membership).toBeTruthy();
      expect(membership.role).toBe('member');

      // Verify failed results have correct error message
      const rejectedResults = results.filter((result) => result.status === 'rejected');
      rejectedResults.forEach((result) => {
        expect(result.reason.message).toContain('User is already a member of this organization');
      });
    });
  });
});
