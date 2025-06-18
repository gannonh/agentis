/**
 * @fileoverview Organization service for handling email domain-based organization management
 * @module server/services/OrganizationService
 */

import { getAuth } from '../../auth.js';
import { logger } from '#config/index.js';
import {
  extractEmailDomain,
  generateOrganizationName,
  generateOrganizationSlug,
} from '#utils/organization.js';

/**
 * Organization Service class for managing email domain-based organizations
 */
class OrganizationService {
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
   * Finds an organization by email domain using Better Auth API
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} Organization if found, null otherwise
   */
  async findOrganizationByEmailDomain(email) {
    try {
      this.initialize();

      const domain = extractEmailDomain(email);
      const expectedSlug = generateOrganizationSlug(domain);

      logger.debug('Searching for organization with domain:', domain);

      // Get all organizations and filter by metadata.domain
      // Note: Better Auth doesn't have direct domain search, so we'll search by slug
      const organizations = await this.auth.api.listOrganizations({
        body: {},
      });

      // Find organization with matching slug or domain in metadata
      const organization = organizations?.find(
        (org) => org.slug === expectedSlug || org.metadata?.domain === domain,
      );

      if (organization) {
        logger.debug('Found existing organization:', {
          id: organization.id,
          name: organization.name,
          domain,
        });
      }

      return organization || null;
    } catch (error) {
      logger.error('Error finding organization by email domain:', error);
      throw error;
    }
  }

  /**
   * Creates a new organization for the user's email domain
   * @param {string} email - User's email address
   * @param {string} userId - User's ID
   * @returns {Promise<Object>} Created organization
   */
  async createOrganizationForDomain(email, userId) {
    try {
      this.initialize();

      const domain = extractEmailDomain(email);
      const name = generateOrganizationName(domain);
      const slug = generateOrganizationSlug(domain);

      logger.info('Creating organization for new domain:', { domain, name, slug });

      // Attempt to create organization with retry mechanism for slug collisions
      let organization;
      try {
        organization = await this.auth.api.createOrganization({
          body: {
            name,
            slug,
            metadata: {
              domain,
              autoCreated: true,
              createdFromEmail: email,
            },
          },
          headers: {
            'user-id': userId,
          },
        });
      } catch (createError) {
        // Check if this is a 409 duplicate error (slug collision)
        const isDuplicateError =
          createError.status === 409 ||
          createError.statusCode === 409 ||
          (createError.message && createError.message.toLowerCase().includes('duplicate')) ||
          (createError.message && createError.message.toLowerCase().includes('already exists'));

        if (isDuplicateError) {
          logger.info('Organization slug collision detected, fetching existing organization:', {
            domain,
            slug,
          });

          // Fetch the existing organization instead of failing
          organization = await this.findOrganizationByEmailDomain(email);

          if (!organization) {
            logger.error('Slug collision occurred but could not find existing organization');
            throw createError;
          }

          logger.info('Successfully found existing organization after collision:', {
            id: organization.id,
            name: organization.name,
            domain,
          });
        } else {
          // Re-throw non-duplicate errors
          throw createError;
        }
      }

      logger.info('Successfully created organization:', {
        id: organization.id,
        name: organization.name,
        domain,
      });

      return organization;
    } catch (error) {
      logger.error('Error creating organization for domain:', error);
      throw error;
    }
  }

  /**
   * Adds a user to an existing organization as a member
   * @param {string} userId - User's ID
   * @param {string} organizationId - Organization ID
   * @param {string} role - Member role (default: 'member')
   * @returns {Promise<Object>} Created member
   */
  async addUserToOrganization(userId, organizationId, role = 'member') {
    try {
      this.initialize();

      logger.info('Adding user to existing organization:', {
        userId,
        organizationId,
        role,
      });

      const member = await this.auth.api.addMember({
        body: {
          userId,
          organizationId,
          role,
        },
      });

      logger.info('Successfully added user to organization:', {
        memberId: member.id,
        userId,
        organizationId,
        role,
      });

      return member;
    } catch (error) {
      logger.error('Error adding user to organization:', error);
      throw error;
    }
  }

  /**
   * Handles organization assignment for a user during registration/login
   * This is the main entry point for the Slack-style organization logic
   * @param {string} email - User's email address
   * @param {string} userId - User's ID
   * @returns {Promise<{organization: Object, isNewOrganization: boolean, memberRole: string}>}
   */
  async handleUserOrganizationAssignment(email, userId) {
    try {
      logger.debug('Handling organization assignment for user:', { email, userId });

      // Step 1: Check if organization exists for this email domain
      let organization = await this.findOrganizationByEmailDomain(email);
      let isNewOrganization = false;
      let memberRole = 'member';

      if (!organization) {
        // Step 2: Create new organization (user becomes owner)
        organization = await this.createOrganizationForDomain(email, userId);
        isNewOrganization = true;
        memberRole = 'owner';

        logger.info('User created new organization and is now owner:', {
          userId,
          organizationId: organization.id,
          email,
        });
      } else {
        // Step 3: Add user to existing organization as member
        try {
          await this.addUserToOrganization(userId, organization.id, 'member');
          memberRole = 'member';

          logger.info('User joined existing organization as member:', {
            userId,
            organizationId: organization.id,
            email,
          });
        } catch (error) {
          // Check if error indicates user is already a member
          if (
            error.message &&
            (error.message.includes('already exists') ||
              error.message.includes('already a member') ||
              error.message.includes('duplicate') ||
              error.code === 'MEMBER_EXISTS')
          ) {
            // User is already a member, this is expected behavior
            memberRole = 'member';
            logger.info('User is already a member of organization:', {
              userId,
              organizationId: organization.id,
              email,
            });
          } else {
            // Re-throw unexpected errors
            throw error;
          }
        }
      }

      return {
        organization,
        isNewOrganization,
        memberRole,
      };
    } catch (error) {
      logger.error('Error handling user organization assignment:', error);
      throw error;
    }
  }

  /**
   * Gets the user's active organization and role
   * @param {string} userId - User's ID
   * @returns {Promise<{organization: Object|null, role: string|null}>}
   */
  async getUserOrganization(userId) {
    try {
      this.initialize();

      // Get user's organizations
      const userOrgs = await this.auth.api.listUserOrganizations({
        headers: {
          'user-id': userId,
        },
      });

      if (!userOrgs || userOrgs.length === 0) {
        return { organization: null, role: null };
      }

      // For Phase 1, user has only one organization (no org switcher)
      const primaryOrg = userOrgs[0];

      return {
        organization: primaryOrg.organization,
        role: primaryOrg.role,
      };
    } catch (error) {
      logger.error('Error getting user organization:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();
export default organizationService;
