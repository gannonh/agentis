/**
 * @fileoverview Organization Detection Service
 * @module services/OrganizationDetectionService
 */

import Organization from '#models/Organization';
import PublicDomainService from './PublicDomainService.js';
import { validateInvitationToken } from './InvitationValidationService.js';

/**
 * Get organizations by domain
 * @param {string} domain - The domain to search for
 * @returns {Promise<Array>} Array of organizations for the domain
 */
export async function getOrganizationsByDomain(domain) {
  if (!domain) {
    return [];
  }

  const organizations = await Organization.find({ domain }).lean();
  return organizations;
}

/**
 * Check domain organizations for a given email
 * @param {string} email - The email address to check
 * @param {Object} inviteContext - Optional invitation context
 * @returns {Promise<Object>} Detection result with organization information
 */
export async function checkDomainOrganizations(email, inviteContext) {
  // Handle invitation context first - validate token if provided
  if (inviteContext && inviteContext.inviteToken) {
    const validatedInvitation = await validateInvitationToken(inviteContext.inviteToken);
    
    if (!validatedInvitation) {
      // Invalid or expired invitation - fall back to normal domain detection
      const domain = email.split('@')[1];
      const isPublicDomain = PublicDomainService.isPublicDomain(domain);
      
      const organizations = await getOrganizationsByDomain(domain);
      const hasOrganization = organizations.length > 0;
      const canAutoJoin = organizations.length === 1 && organizations[0].allowDomainJoin === true;

      return {
        isPublicDomain,
        domain,
        hasOrganization,
        organizations,
        canAutoJoin,
        invitationError: 'Invalid or expired invitation',
      };
    }

    // Valid invitation - bypass domain detection
    const domain = email.split('@')[1];
    const isPublicDomain = PublicDomainService.isPublicDomain(domain);

    return {
      isPublicDomain, // Accurately reflects actual domain status
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

  // Extract domain from email
  const emailParts = email.split('@');
  if (emailParts.length < 2) {
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
  const isPublicDomain = PublicDomainService.isPublicDomain(domain);

  if (isPublicDomain) {
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

  return {
    isPublicDomain: false,
    domain,
    hasOrganization,
    organizations,
    canAutoJoin,
  };
}
