/**
 * @fileoverview Organization Detection Service
 * @module services/OrganizationDetectionService
 */

import mongoose from 'mongoose';
import { isPublicDomain } from './PublicDomainService.js';
import { validateInvitationToken } from './InvitationValidationService.js';
import { logger } from '#config/index.js';

/**
 * Get organizations by domain
 * @param {string} domain - The domain to search for
 * @returns {Promise<Array>} Array of organizations for the domain
 */
export async function getOrganizationsByDomain(domain) {
  if (!domain) {
    return [];
  }

  // Use Better Auth's organization collection directly
  const db = mongoose.connection.db;
  if (!db) {
    logger.warn('MongoDB connection not available for organization lookup');
    return [];
  }

  try {
    const organizations = await db
      .collection('organization')
      .find({
        'metadata.domain': domain,
      })
      .toArray();

    // Transform to expected format
    return organizations.map((org) => ({
      _id: org._id || org.id,
      name: org.name,
      domain: org.metadata?.domain,
      allowDomainJoin: org.metadata?.allowDomainJoin || false,
      slug: org.slug,
    }));
  } catch (error) {
    logger.error(`Error querying organizations for domain ${domain}:`, error);
    return [];
  }
}

/**
 * Check domain organizations for a given email
 *
 * SECURITY NOTE: This function intentionally does NOT return organization names
 * or counts to prevent information disclosure about other customers. The frontend
 * only needs to know if organization(s) exist for the domain, not specifics.
 *
 * @param {string} email - The email address to check
 * @param {Object} inviteContext - Optional invitation context
 * @returns {Promise<Object>} Detection result with organization information
 */
export async function checkDomainOrganizations(email, inviteContext) {
  logger.debug('Checking domain organizations for email:', email);

  // Handle invitation context first - validate token if provided
  if (inviteContext && inviteContext.inviteToken) {
    logger.debug('Invitation token provided:', inviteContext.inviteToken);
    const validatedInvitation = await validateInvitationToken(inviteContext.inviteToken);

    if (!validatedInvitation) {
      // Invalid or expired invitation - fall back to normal domain detection
      const domain = email.split('@')[1];
      const isPublic = isPublicDomain(domain);

      const organizations = await getOrganizationsByDomain(domain);
      const hasOrganization = organizations.length > 0;
      const canAutoJoin = organizations.length === 1 && organizations[0].allowDomainJoin === true;

      return {
        isPublicDomain: isPublic,
        domain,
        hasOrganization,
        organizations,
        canAutoJoin,
        invitationError: 'Invalid or expired invitation',
      };
    }

    // Valid invitation - bypass domain detection
    const domain = email.split('@')[1];
    const isPublic = isPublicDomain(domain);

    return {
      isPublicDomain: isPublic, // Accurately reflects actual domain status
      bypassDomainCheck: true, // Indicates invitation bypasses normal logic
      domain,
      hasOrganization: true,
      organizations: [
        {
          _id: validatedInvitation.organizationId,
          name: validatedInvitation.organization.name,
        },
      ],
      canAutoJoin: true,
      isInvited: true,
      invitation: validatedInvitation,
    };
  }

  // Default response for invalid inputs
  if (!email) {
    return {
      isPublicDomain: true,
      domain: null,
      hasOrganization: false,
      organizations: [],
      canAutoJoin: false,
    };
  }

  // Validate email format and ensure domain exists
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.warn(`Invalid email format provided: ${email}`);
    return {
      isPublicDomain: true,
      domain: null,
      hasOrganization: false,
      organizations: [],
      canAutoJoin: false,
    };
  }

  // Extract domain from email
  const emailParts = email.split('@');
  if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].trim() === '') {
    logger.warn(`Invalid email domain in: ${email}`);
    return {
      isPublicDomain: true,
      domain: null,
      hasOrganization: false,
      organizations: [],
      canAutoJoin: false,
    };
  }

  const domain = emailParts[1];

  // Check if it's a public domain
  const isPublic = isPublicDomain(domain);

  if (isPublic) {
    return {
      isPublicDomain: true,
      domain,
      hasOrganization: false,
      organizations: [],
      canAutoJoin: false,
    };
  }

  // For corporate domains, check for existing organizations
  const organizations = await getOrganizationsByDomain(domain);
  const hasOrganization = organizations.length > 0;

  // Auto-join is only possible if:
  // 1. Exactly one organization exists for the domain
  // 2. That organization has allowDomainJoin enabled
  const canAutoJoin = organizations.length === 1 && organizations[0].allowDomainJoin === true;

  // SECURITY: We intentionally do NOT return the organizations array
  // to prevent information disclosure about other customers.
  // Frontend only needs to know if organization(s) exist, not details.
  return {
    isPublicDomain: false,
    domain,
    hasOrganization,
    organizations: [], // Empty array for security
    canAutoJoin,
  };
}
