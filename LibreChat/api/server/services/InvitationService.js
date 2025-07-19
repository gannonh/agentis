/**
 * @fileoverview Invitation service for managing organization invitations using Better Auth
 * @module server/services/InvitationService
 */

import { getAuth } from '../../auth.js';
import { logger } from '#config/index.js';

/**
 * InvitationService class for managing organization invitations with Better Auth
 */
class InvitationService {
  constructor() {
    this.auth = null;
  }

  /**
   * Initialize the service with Better Auth instance
   */
  initialize() {
    this.auth = getAuth();
  }

  /**
   * Create an invitation to join an organization
   * @param {string} organizationId - The ID of the organization
   * @param {string} email - Email address to invite
   * @param {string} role - Role to assign to the invited user (default: 'member')
   * @param {string} userId - ID of the user creating the invitation
   * @returns {Promise<Object>} The created invitation
   */
  async createInvitation(organizationId, email, role = 'member', userId) {
    try {
      this.initialize();

      // Generate server-side timestamps for consistency and security
      const now = new Date();
      const invitedAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      logger.info('Creating organization invitation', {
        organizationId,
        email,
        role,
        inviterId: userId,
        invitedAt,
        expiresAt,
      });

      const invitation = await this.auth.api.createInvitation({
        body: {
          organizationId,
          email,
          role,
          // Include server-side timestamps to prevent client manipulation
          invitedAt,
          expiresAt,
        },
        headers: {
          'user-id': userId,
        },
      });

      logger.info('Organization invitation created successfully', {
        invitationId: invitation.id,
        organizationId,
        email,
        role,
        invitedAt,
        expiresAt,
      });

      return invitation;
    } catch (error) {
      logger.error('Error creating organization invitation', {
        error: error.message,
        organizationId,
        email,
        role,
        inviterId: userId,
      });
      throw error;
    }
  }

  /**
   * List all invitations for an organization
   * @param {string} organizationId - The ID of the organization
   * @param {string} userId - ID of the user requesting the list
   * @returns {Promise<Array>} Array of invitations
   */
  async listInvitations(organizationId, userId) {
    try {
      this.initialize();

      logger.debug('Listing organization invitations', {
        organizationId,
        requesterId: userId,
      });

      const invitations = await this.auth.api.listInvitations({
        body: {
          organizationId,
        },
        headers: {
          'user-id': userId,
        },
      });

      logger.debug('Retrieved organization invitations', {
        organizationId,
        count: invitations?.length || 0,
      });

      return invitations || [];
    } catch (error) {
      logger.error('Error listing organization invitations', {
        error: error.message,
        organizationId,
        requesterId: userId,
      });
      throw error;
    }
  }

  /**
   * Cancel a pending invitation
   * @param {string} invitationId - The ID of the invitation to cancel
   * @param {string} userId - ID of the user canceling the invitation
   * @returns {Promise<Object>} The canceled invitation
   */
  async cancelInvitation(invitationId, userId) {
    try {
      this.initialize();

      logger.info('Canceling organization invitation', {
        invitationId,
        cancelerId: userId,
      });

      const result = await this.auth.api.cancelInvitation({
        body: {
          invitationId,
        },
        headers: {
          'user-id': userId,
        },
      });

      logger.info('Organization invitation canceled successfully', {
        invitationId,
        cancelerId: userId,
      });

      return result;
    } catch (error) {
      logger.error('Error canceling organization invitation', {
        error: error.message,
        invitationId,
        cancelerId: userId,
      });
      throw error;
    }
  }

  /**
   * Accept an invitation to join an organization
   * @param {string} invitationId - The ID of the invitation to accept
   * @param {string} userId - ID of the user accepting the invitation
   * @returns {Promise<Object>} The accepted invitation result
   */
  async acceptInvitation(invitationId, userId) {
    try {
      this.initialize();

      logger.info('Accepting organization invitation', {
        invitationId,
        userId,
      });

      const result = await this.auth.api.acceptInvitation({
        body: {
          invitationId,
        },
        headers: {
          'user-id': userId,
        },
      });

      logger.info('Organization invitation accepted successfully', {
        invitationId,
        userId,
        organizationId: result.organizationId,
        role: result.role,
      });

      return result;
    } catch (error) {
      logger.error('Error accepting organization invitation', {
        error: error.message,
        invitationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Reject an invitation to join an organization
   * @param {string} invitationId - The ID of the invitation to reject
   * @param {string} userId - ID of the user rejecting the invitation
   * @returns {Promise<Object>} The rejected invitation result
   */
  async rejectInvitation(invitationId, userId) {
    try {
      this.initialize();

      logger.info('Rejecting organization invitation', {
        invitationId,
        userId,
      });

      const result = await this.auth.api.rejectInvitation({
        body: {
          invitationId,
        },
        headers: {
          'user-id': userId,
        },
      });

      logger.info('Organization invitation rejected successfully', {
        invitationId,
        userId,
      });

      return result;
    } catch (error) {
      logger.error('Error rejecting organization invitation', {
        error: error.message,
        invitationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get details of a specific invitation
   * @param {string} invitationId - The ID of the invitation
   * @param {string} userId - ID of the user requesting the invitation details
   * @returns {Promise<Object>} The invitation details
   */
  async getInvitation(invitationId, userId) {
    try {
      this.initialize();

      logger.debug('Getting organization invitation details', {
        invitationId,
        requesterId: userId,
      });

      const invitation = await this.auth.api.getInvitation({
        body: {
          invitationId,
        },
        headers: {
          'user-id': userId,
        },
      });

      logger.debug('Retrieved organization invitation details', {
        invitationId,
        email: invitation.email,
        status: invitation.status,
      });

      return invitation;
    } catch (error) {
      logger.error('Error getting organization invitation details', {
        error: error.message,
        invitationId,
        requesterId: userId,
      });
      throw error;
    }
  }

  /**
   * Resend an invitation email
   * @param {string} invitationId - The ID of the invitation to resend
   * @param {string} userId - ID of the user resending the invitation
   * @returns {Promise<Object>} The resend result
   */
  async resendInvitation(invitationId, userId) {
    try {
      this.initialize();

      logger.info('Resending organization invitation', {
        invitationId,
        resenderId: userId,
      });

      // Get invitation details first
      const invitation = await this.getInvitation(invitationId, userId);

      if (invitation.status !== 'pending') {
        throw new Error(`Cannot resend invitation with status: ${invitation.status}`);
      }

      // Better Auth automatically resends email when updating invitation
      const result = await this.auth.api.updateInvitation({
        body: {
          invitationId,
          // Trigger email resend by updating the invitation
          status: 'pending',
        },
        headers: {
          'user-id': userId,
        },
      });

      logger.info('Organization invitation resent successfully', {
        invitationId,
        email: invitation.email,
        resenderId: userId,
      });

      return result;
    } catch (error) {
      logger.error('Error resending organization invitation', {
        error: error.message,
        invitationId,
        resenderId: userId,
      });
      throw error;
    }
  }

  /**
   * Check if a user has permission to manage invitations for an organization
   * @param {string} organizationId - The ID of the organization
   * @param {string} userId - ID of the user to check permissions for
   * @returns {Promise<{ok: boolean, hasPermission?: boolean, error?: string}>}
   *   Result object with ok indicating success, hasPermission for authorization result, error for service errors
   */
  async hasInvitationPermission(organizationId, userId) {
    try {
      this.initialize();

      // Check if user is an owner or admin of the organization
      const member = await this.auth.api.getMember({
        body: {
          organizationId,
          userId,
        },
        headers: {
          'user-id': userId,
        },
      });

      const hasPermission = member && (member.role === 'owner' || member.role === 'admin');

      logger.debug('Checked invitation permission', {
        organizationId,
        userId,
        role: member?.role,
        hasPermission: !!hasPermission,
      });

      return {
        ok: true,
        hasPermission: !!hasPermission,
      };
    } catch (error) {
      logger.error('Error checking invitation permission', {
        error: error.message,
        organizationId,
        userId,
      });

      // Re-throw service errors instead of conflating them with authorization failures
      return {
        ok: false,
        error: error.message,
      };
    }
  }
}

// Create and export singleton instance
const invitationService = new InvitationService();

export { invitationService };
