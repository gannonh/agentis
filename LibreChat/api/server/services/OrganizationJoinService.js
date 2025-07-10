/**
 * @fileoverview Organization Join Service - TDD implementation for Issue #104
 * @module server/services/OrganizationJoinService
 *
 * Implements auto-join and request-to-join flows for organizations
 * with domain-based membership and admin approval workflows.
 *
 * TODO: Implement unique constraint on Organization.metadata.domain
 * Business rule: Only 1 organization per domain should be allowed.
 * This requires:
 * 1. MongoDB unique index on Organization.metadata.domain
 * 2. Proper error handling for constraint violations
 * 3. Clear error messages when duplicate domain creation is attempted
 * 4. Update tests to validate constraint behavior
 */

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '#config/index.js';

/**
 * Service class for handling organization join operations
 */
class OrganizationJoinService {
  /**
   * Auto-join a user to an organization if domain join is enabled
   * @param {Object} params - Join parameters
   * @param {string} params.userId - User ID to add as member
   * @param {string} params.organizationId - Organization ID to join
   * @param {string} params.userEmail - User's email for domain validation
   * @returns {Promise<Object>} Join result with success status and membership info
   */
  static async autoJoinOrganization({ userId, organizationId, userEmail }) {
    logger.info('Attempting auto-join to organization', {
      userId,
      organizationId,
      userEmail,
    });

    try {
      // 1. Validate organization exists and allows domain join
      const organization = await this._getOrganization(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // 2. Check if domain join is enabled
      if (!organization.metadata?.allowDomainJoin) {
        throw new Error('Organization does not allow automatic domain joining');
      }

      // 3. Validate user email domain matches organization domain
      const userDomain = userEmail.split('@')[1]?.toLowerCase();
      const orgDomain = organization.metadata?.domain?.toLowerCase();

      if (userDomain !== orgDomain) {
        throw new Error('User email domain does not match organization domain');
      }

      // 4. Check if user is already a member
      const db = mongoose.connection.db;
      const existingMember = await db.collection('member').findOne({
        organizationId,
        userId,
      });

      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }

      // 5. Add user as member via direct MongoDB
      const memberCollection = db.collection('member');
      const memberResult = await memberCollection.insertOne({
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

      if (!memberResult.insertedId) {
        throw new Error('Failed to create membership');
      }

      logger.info('Successfully auto-joined user to organization', {
        userId,
        organizationId,
        membershipId: memberResult.insertedId.toString(),
      });

      return {
        success: true,
        membershipId: memberResult.insertedId.toString(),
        role: 'member',
        organizationId,
      };
    } catch (error) {
      logger.error('Auto-join failed', {
        userId,
        organizationId,
        error: error.message,
      });

      // Re-throw with more context for all errors
      throw new Error(`Failed to add user to organization: ${error.message}`);
    }
  }

  /**
   * Validate if a user is eligible for auto-join to an organization
   * @param {Object} params - Validation parameters
   * @param {string} params.userEmail - User's email for domain validation
   * @param {string} params.organizationId - Organization ID to check
   * @returns {Promise<Object>} Eligibility result with organization details
   */
  static async validateAutoJoinEligibility({ userEmail, organizationId }) {
    logger.info('Validating auto-join eligibility', {
      userEmail,
      organizationId,
    });

    try {
      const organization = await this._getOrganization(organizationId);
      if (!organization) {
        return {
          eligible: false,
          reason: 'Organization not found',
        };
      }

      const orgData = {
        id: organization.id,
        name: organization.name,
        domain: organization.metadata?.domain,
        allowDomainJoin: organization.metadata?.allowDomainJoin || false,
      };

      // Check if domain join is enabled
      if (!organization.metadata?.allowDomainJoin) {
        return {
          eligible: false,
          reason: 'Organization does not allow automatic domain joining',
          organization: orgData,
        };
      }

      // Validate email domain matches organization domain
      const userDomain = userEmail.split('@')[1]?.toLowerCase();
      const orgDomain = organization.metadata?.domain?.toLowerCase();

      if (userDomain !== orgDomain) {
        return {
          eligible: false,
          reason: 'User email domain does not match organization domain',
          organization: orgData,
        };
      }

      return {
        eligible: true,
        organization: orgData,
      };
    } catch (error) {
      logger.error('Error validating auto-join eligibility', {
        userEmail,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create a join request for an organization (when auto-join is not available)
   * @param {Object} params - Request parameters
   * @param {string} params.userId - User ID requesting to join
   * @param {string} params.organizationId - Organization ID to join
   * @param {string} params.userEmail - User's email
   * @param {string} [params.requestMessage] - Optional message to admins
   * @returns {Promise<Object>} Request result with request ID and status
   */
  static async createJoinRequest({ userId, organizationId, userEmail, requestMessage }) {
    logger.info('Creating join request', {
      userId,
      organizationId,
      userEmail,
    });

    try {
      const db = mongoose.connection.db;
      const organization = await this._getOrganization(organizationId);

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Check for existing pending request
      const existingRequests = organization.metadata?.joinRequests || [];
      const pendingRequest = existingRequests.find(
        (req) => req.userId === userId && req.status === 'pending',
      );

      if (pendingRequest) {
        throw new Error('User already has a pending join request for this organization');
      }

      // Create new join request
      const requestId = uuidv4();
      const joinRequest = {
        id: requestId,
        userId,
        userEmail,
        requestMessage: requestMessage || '',
        status: 'pending',
        requestedAt: new Date(),
      };

      // Add request to organization metadata
      // Use same fallback strategy as domain metadata update
      let result = await db.collection('organization').updateOne(
        { id: organizationId },
        {
          $push: {
            'metadata.joinRequests': joinRequest,
          },
        },
      );

      // If no match, try converting to ObjectId for _id field
      if (result.matchedCount === 0) {
        try {
          const objectId = new mongoose.Types.ObjectId(organizationId);
          result = await db.collection('organization').updateOne(
            { _id: objectId },
            {
              $push: {
                'metadata.joinRequests': joinRequest,
              },
            },
          );
          logger.info(`Used _id field for join request: ${organizationId}`);
        } catch (convertError) {
          logger.error(
            `Failed to convert organizationId to ObjectId: ${organizationId}`,
            convertError,
          );
        }
      } else {
        logger.info(`Used id field for join request: ${organizationId}`);
      }

      if (result.matchedCount === 0) {
        throw new Error('Organization not found for join request update');
      }

      logger.info('Join request created successfully', {
        requestId,
        userId,
        organizationId,
      });

      return {
        success: true,
        requestId,
        status: 'pending',
        organizationId,
        userId,
      };
    } catch (error) {
      logger.error('Failed to create join request', {
        userId,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Approve a join request and add user as member
   * @param {Object} params - Approval parameters
   * @param {string} params.requestId - Join request ID to approve
   * @param {string} params.organizationId - Organization ID
   * @param {string} params.reviewerId - Admin user ID approving the request
   * @returns {Promise<Object>} Approval result with membership info
   */
  static async approveJoinRequest({ requestId, organizationId, reviewerId }) {
    logger.info('Approving join request', {
      requestId,
      organizationId,
      reviewerId,
    });

    try {
      const db = mongoose.connection.db;
      const organization = await this._getOrganization(organizationId);

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Find the join request
      const joinRequests = organization.metadata?.joinRequests || [];
      const request = joinRequests.find((req) => req.id === requestId);

      if (!request) {
        throw new Error('Join request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Join request is already ${request.status}`);
      }

      // Add user as member via direct MongoDB
      const memberCollection = db.collection('member');
      const memberResult = await memberCollection.insertOne({
        _id: new mongoose.Types.ObjectId(),
        userId: mongoose.Types.ObjectId.isValid(request.userId)
          ? new mongoose.Types.ObjectId(request.userId)
          : request.userId,
        organizationId: mongoose.Types.ObjectId.isValid(organizationId)
          ? new mongoose.Types.ObjectId(organizationId)
          : organizationId,
        role: 'member',
        createdAt: new Date(),
      });

      if (!memberResult.insertedId) {
        throw new Error('Failed to add user as member');
      }

      // Update request status
      await db.collection('organization').updateOne(
        {
          id: organizationId,
          'metadata.joinRequests.id': requestId,
        },
        {
          $set: {
            'metadata.joinRequests.$.status': 'approved',
            'metadata.joinRequests.$.reviewedBy': reviewerId,
            'metadata.joinRequests.$.reviewedAt': new Date(),
          },
        },
      );

      logger.info('Join request approved successfully', {
        requestId,
        userId: request.userId,
        organizationId,
        membershipId: memberResult.insertedId.toString(),
      });

      return {
        success: true,
        membershipId: memberResult.insertedId.toString(),
        userId: request.userId,
        organizationId,
      };
    } catch (error) {
      logger.error('Failed to approve join request', {
        requestId,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Reject a join request
   * @param {Object} params - Rejection parameters
   * @param {string} params.requestId - Join request ID to reject
   * @param {string} params.organizationId - Organization ID
   * @param {string} params.reviewerId - Admin user ID rejecting the request
   * @param {string} [params.rejectionReason] - Optional reason for rejection
   * @returns {Promise<Object>} Rejection result
   */
  static async rejectJoinRequest({ requestId, organizationId, reviewerId, rejectionReason }) {
    logger.info('Rejecting join request', {
      requestId,
      organizationId,
      reviewerId,
    });

    try {
      const db = mongoose.connection.db;
      const organization = await this._getOrganization(organizationId);

      if (!organization) {
        throw new Error('Organization not found');
      }

      // Find the join request
      const joinRequests = organization.metadata?.joinRequests || [];
      const request = joinRequests.find((req) => req.id === requestId);

      if (!request) {
        throw new Error('Join request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Join request is already ${request.status}`);
      }

      // Update request status
      const updateFields = {
        'metadata.joinRequests.$.status': 'rejected',
        'metadata.joinRequests.$.reviewedBy': reviewerId,
        'metadata.joinRequests.$.reviewedAt': new Date(),
      };

      if (rejectionReason) {
        updateFields['metadata.joinRequests.$.rejectionReason'] = rejectionReason;
      }

      await db.collection('organization').updateOne(
        {
          id: organizationId,
          'metadata.joinRequests.id': requestId,
        },
        { $set: updateFields },
      );

      logger.info('Join request rejected successfully', {
        requestId,
        organizationId,
      });

      return {
        success: true,
        requestId,
        status: 'rejected',
      };
    } catch (error) {
      logger.error('Failed to reject join request', {
        requestId,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get join requests for an organization
   * @param {Object} params - Query parameters
   * @param {string} params.organizationId - Organization ID
   * @param {string} [params.status] - Optional status filter ('pending', 'approved', 'rejected')
   * @returns {Promise<Object>} List of join requests
   */
  static async getJoinRequests({ organizationId, status }) {
    logger.info('Getting join requests', {
      organizationId,
      status,
    });

    try {
      const organization = await this._getOrganization(organizationId);

      if (!organization) {
        throw new Error('Organization not found');
      }

      let requests = organization.metadata?.joinRequests || [];

      // Filter by status if provided
      if (status) {
        requests = requests.filter((req) => req.status === status);
      }

      // Sort by request date (newest first)
      requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

      return {
        requests,
        total: requests.length,
      };
    } catch (error) {
      logger.error('Failed to get join requests', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private helper to get organization from database
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object|null>} Organization document or null
   * @private
   */
  static async _getOrganization(organizationId) {
    try {
      const db = mongoose.connection.db;

      // Try by Better Auth string ID first
      let organization = await db.collection('organization').findOne({ id: organizationId });

      // If not found, try by MongoDB ObjectId
      if (!organization && mongoose.Types.ObjectId.isValid(organizationId)) {
        organization = await db.collection('organization').findOne({
          _id: new mongoose.Types.ObjectId(organizationId),
        });
      }

      return organization;
    } catch (error) {
      logger.error('Error retrieving organization', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if a user is a member of an organization
   * @param {Object} params - Check parameters
   * @param {string} params.userId - User ID to check
   * @param {string} params.organizationId - Organization ID to check
   * @returns {Promise<boolean>} True if user is a member, false otherwise
   */
  static async checkUserMembership({ userId, organizationId }) {
    logger.info('Checking user membership', {
      userId,
      organizationId,
    });

    try {
      const db = mongoose.connection.db;
      const memberCollection = db.collection('member');

      // Normalize IDs to handle both string and ObjectId formats
      const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;
      const normalizedOrgId = mongoose.Types.ObjectId.isValid(organizationId)
        ? new mongoose.Types.ObjectId(organizationId)
        : organizationId;

      // Check if user is a member of the organization
      const membership = await memberCollection.findOne({
        $or: [
          { userId: normalizedUserId, organizationId: normalizedOrgId },
          { userId: userId, organizationId: organizationId },
        ],
      });

      const isMember = !!membership;

      logger.info('User membership checked', {
        userId,
        organizationId,
        isMember,
      });

      return isMember;
    } catch (error) {
      logger.error('Error checking user membership', {
        userId,
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }
}

export default OrganizationJoinService;
