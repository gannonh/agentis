/**
 * @fileoverview Public invitation validation service for organization detection
 * @module server/services/InvitationValidationService
 */

import mongoose from 'mongoose';
import { logger } from '#config/index.js';

/**
 * Validate an invitation token without requiring user authentication
 * This service bypasses Better Auth for public invitation validation during org detection
 * @param {string} invitationId - The invitation ID/token to validate
 * @returns {Promise<Object|null>} Invitation details with organization info, or null if invalid/expired
 */
export async function validateInvitationToken(invitationId) {
  try {
    if (!invitationId) {
      logger.debug('No invitation ID provided for validation');
      return null;
    }

    // Get direct database connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    logger.debug('Validating invitation token', { invitationId });

    // Query invitation collection directly (Better Auth manages this collection)
    const invitation = await db.collection('invitation').findOne({
      id: invitationId,
      status: 'pending', // Only validate pending invitations
    });

    if (!invitation) {
      logger.debug('Invitation not found or not pending', { invitationId });
      return null;
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (expiresAt < now) {
      logger.debug('Invitation has expired', { 
        invitationId, 
        expiresAt: invitation.expiresAt,
        now: now.toISOString() 
      });
      return null;
    }

    // Get organization details for the invitation
    const organization = await db.collection('organization').findOne({
      id: invitation.organizationId,
    });

    if (!organization) {
      logger.warn('Organization not found for invitation', { 
        invitationId, 
        organizationId: invitation.organizationId 
      });
      return null;
    }

    logger.debug('Invitation validated successfully', {
      invitationId,
      email: invitation.email,
      organizationId: invitation.organizationId,
      organizationName: organization.name,
    });

    // Return invitation with organization details
    return {
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organization: {
        id: organization.id,
        name: organization.name,
        domain: organization.domain,
        slug: organization.slug,
      },
    };
  } catch (error) {
    logger.error('Error validating invitation token', {
      error: error.message,
      invitationId,
      stack: error.stack,
    });
    throw error;
  }
}