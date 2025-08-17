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
import { getAuth } from '#auth.js';
import {
  flexibleFindOne,
  flexibleUpdateOne,
  buildFlexibleIdQuery,
  normalizeId,
} from '#server/utils/flexibleId.js';

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

      // 4. Atomically create membership using upsert to prevent race condition
      // Handle both production and test environments
      let db;
      if (mongoose.connection.getClient) {
        const client = mongoose.connection.getClient();
        db = client.db();
      } else {
        // Fallback for test environments (MongoDB Memory Server)
        db = mongoose.connection.db;
      }
      const memberCollection = db.collection('member');

      // Use upsert with the unique compound index to prevent duplicates
      const memberResult = await memberCollection.updateOne(
        {
          userId: normalizeId(userId),
          organizationId: normalizeId(organizationId),
        },
        {
          $setOnInsert: {
            _id: new mongoose.Types.ObjectId(),
            userId: normalizeId(userId),
            organizationId: normalizeId(organizationId),
            role: 'member',
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
        },
      );

      // Check if the user was already a member (no new document created)
      if (memberResult.matchedCount > 0) {
        throw new Error('User is already a member of this organization');
      }

      if (!memberResult.upsertedId) {
        throw new Error('Failed to create membership');
      }

      // 5. Notify Better Auth about the new membership
      try {
        const auth = getAuth();
        if (auth?.api?.organization?.addMember) {
          await auth.api.organization.addMember({
            userId,
            organizationId,
            role: 'member',
          });
          logger.info('Successfully notified Better Auth of new membership', {
            userId,
            organizationId,
          });
        } else {
          logger.warn('Better Auth organization API not available, skipping notification', {
            userId,
            organizationId,
          });
        }
      } catch (authError) {
        logger.error('Failed to notify Better Auth of new membership', {
          userId,
          organizationId,
          error: authError.message,
        });
        // Don't fail the entire operation if Better Auth notification fails
        // The membership was successfully created in the database
      }

      logger.info('Successfully auto-joined user to organization', {
        userId,
        organizationId,
        membershipId: memberResult.upsertedId.toString(),
      });

      return {
        success: true,
        membershipId: memberResult.upsertedId.toString(),
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
      // Handle both production and test environments
      let db;
      if (mongoose.connection.getClient) {
        const client = mongoose.connection.getClient();
        db = client.db();
      } else {
        // Fallback for test environments (MongoDB Memory Server)
        db = mongoose.connection.db;
      }
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

      // Add request to organization metadata using flexible update
      const result = await flexibleUpdateOne(db.collection('organization'), organizationId, {
        $push: {
          'metadata.joinRequests': joinRequest,
        },
      });

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
      // Handle both production and test environments
      let db;
      if (mongoose.connection.getClient) {
        const client = mongoose.connection.getClient();
        db = client.db();
      } else {
        // Fallback for test environments (MongoDB Memory Server)
        db = mongoose.connection.db;
      }
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
        userId: normalizeId(request.userId),
        organizationId: normalizeId(organizationId),
        role: 'member',
        createdAt: new Date(),
      });

      if (!memberResult.insertedId) {
        throw new Error('Failed to add user as member');
      }

      // Notify Better Auth about the new membership
      try {
        const auth = getAuth();
        if (auth?.api?.organization?.addMember) {
          await auth.api.organization.addMember({
            userId: request.userId,
            organizationId,
            role: 'member',
          });
          logger.info('Successfully notified Better Auth of approved membership', {
            userId: request.userId,
            organizationId,
          });
        } else {
          logger.warn('Better Auth organization API not available, skipping notification', {
            userId: request.userId,
            organizationId,
          });
        }
      } catch (authError) {
        logger.error('Failed to notify Better Auth of approved membership', {
          userId: request.userId,
          organizationId,
          error: authError.message,
        });
        // Don't fail the entire operation if Better Auth notification fails
        // The membership was successfully created in the database
      }

      // Update request status using flexible query
      const query = {
        ...buildFlexibleIdQuery(organizationId),
        'metadata.joinRequests.id': requestId,
      };

      await db.collection('organization').updateOne(query, {
        $set: {
          'metadata.joinRequests.$.status': 'approved',
          'metadata.joinRequests.$.reviewedBy': reviewerId,
          'metadata.joinRequests.$.reviewedAt': new Date(),
        },
      });

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
      const client = mongoose.connection.getClient();
      const db = client.db();
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

      // Update request status using flexible query
      const query = {
        ...buildFlexibleIdQuery(organizationId),
        'metadata.joinRequests.id': requestId,
      };

      await db.collection('organization').updateOne(query, { $set: updateFields });

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
      const client = mongoose.connection.getClient();
      const db = client.db();
      const organizationCollection = db.collection('organization');

      // Use flexible find utility to handle both ID formats
      const organization = await flexibleFindOne(organizationCollection, organizationId, 'id', {
        deletedAt: { $exists: false },
      });

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
      const client = mongoose.connection.getClient();
      const db = client.db();
      const memberCollection = db.collection('member');

      // Check if user is a member of the organization using flexible query
      const membership = await memberCollection.findOne({
        $or: [
          { userId: normalizeId(userId), organizationId: normalizeId(organizationId) },
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
