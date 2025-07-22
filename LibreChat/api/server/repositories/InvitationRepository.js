/**
 * @fileoverview Repository for invitation data access operations
 * @module server/repositories/InvitationRepository
 */

import mongoose from 'mongoose';
import { logger } from '#config/index.js';

/**
 * Repository class for invitation database operations
 * Encapsulates all direct MongoDB access for invitation-related queries
 */
export class InvitationRepository {
  constructor() {
    this.db = null;
    this.collectionNames = {
      invitation: 'invitation',
      user: 'user',
      organization: 'organization',
    };
  }

  /**
   * Initialize repository with database connection
   * Uses existing mongoose connection to avoid duplicate connections
   * @throws {Error} If database connection is not available
   */
  initialize() {
    if (!this.db) {
      this.db = mongoose.connection.db;
      if (!this.db) {
        throw new Error('Database connection not available');
      }
    }
  }

  /**
   * Find invitation by ID with flexible ID format support
   * @param {string} invitationId - The invitation ID (ObjectId string or Better Auth string)
   * @returns {Promise<Object|null>} Invitation document or null if not found
   * @throws {Error} If invitationId format is invalid
   */
  async findById(invitationId) {
    this.initialize();

    if (!invitationId || typeof invitationId !== 'string') {
      throw new Error('Invalid invitation ID format');
    }

    const invitationCollection = this.db.collection(this.collectionNames.invitation);
    const { ObjectId } = mongoose.Types;

    // Try ObjectId format first (legacy format)
    if (ObjectId.isValid(invitationId)) {
      const invitation = await invitationCollection.findOne({
        _id: new ObjectId(invitationId),
      });
      if (invitation) {
        return invitation;
      }
    }

    // Try Better Auth string ID format
    const invitation = await invitationCollection.findOne({
      id: invitationId,
    });

    return invitation;
  }

  /**
   * Find organization by ID with flexible ID format support
   * @param {string} organizationId - The organization ID (ObjectId string or Better Auth string)
   * @returns {Promise<Object|null>} Organization document or null if not found
   */
  async findOrganizationById(organizationId) {
    this.initialize();

    if (!organizationId) {
      return null;
    }

    const organizationCollection = this.db.collection(this.collectionNames.organization);
    const { ObjectId } = mongoose.Types;

    // Try ObjectId format first
    if (ObjectId.isValid(organizationId)) {
      const organization = await organizationCollection.findOne({
        _id: new ObjectId(organizationId),
      });
      if (organization) {
        return organization;
      }
    }

    // Try Better Auth string ID format
    const organization = await organizationCollection.findOne({
      id: organizationId,
    });

    return organization;
  }

  /**
   * Find user by ID with flexible ID format support
   * @param {string} userId - The user ID (ObjectId string or Better Auth string)
   * @returns {Promise<Object|null>} User document or null if not found
   */
  async findUserById(userId) {
    this.initialize();

    if (!userId) {
      return null;
    }

    const userCollection = this.db.collection(this.collectionNames.user);
    const { ObjectId } = mongoose.Types;

    // Try ObjectId format first
    if (ObjectId.isValid(userId)) {
      const user = await userCollection.findOne({
        _id: new ObjectId(userId),
      });
      if (user) {
        return user;
      }
    }

    // Try Better Auth string ID format
    const user = await userCollection.findOne({
      id: userId,
    });

    return user;
  }

  /**
   * Get public invitation details for invitation acceptance page
   * Returns only safe public information without authentication requirements
   * @param {string} invitationId - The invitation ID
   * @returns {Promise<Object>} Public invitation details
   * @throws {Error} With specific error codes for different failure scenarios
   */
  async getPublicInvitationDetails(invitationId) {
    this.initialize();

    logger.debug('Getting public invitation details via repository', {
      invitationId,
    });

    // Find the invitation
    const invitation = await this.findById(invitationId);

    if (!invitation) {
      const error = new Error('Invitation not found');
      error.statusCode = 404;
      throw error;
    }

    // Get organization details
    let organizationName = 'Unknown Organization';
    if (invitation.organizationId) {
      const organization = await this.findOrganizationById(invitation.organizationId);
      organizationName = organization?.name || organizationName;
    }

    // Get inviter details
    let inviterName = 'Someone';
    if (invitation.inviterId) {
      const inviter = await this.findUserById(invitation.inviterId);
      inviterName = inviter?.name || inviter?.email?.split('@')[0] || inviterName;
    }

    // Return only safe public information
    const publicDetails = {
      id: invitation._id || invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      organizationName,
      inviterName,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };

    logger.debug('Retrieved public invitation details via repository', {
      invitationId,
      email: invitation.email,
      status: invitation.status,
      organizationName: publicDetails.organizationName,
    });

    return publicDetails;
  }

  /**
   * Check if an invitation ID has valid ObjectId format
   * @param {string} invitationId - The invitation ID to validate
   * @returns {boolean} True if valid ObjectId format
   */
  isValidObjectIdFormat(invitationId) {
    const { ObjectId } = mongoose.Types;
    return ObjectId.isValid(invitationId);
  }
}

export default InvitationRepository;
