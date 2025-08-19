/**
 * @fileoverview Organization service for handling email domain-based organization management
 * @module server/services/OrganizationService
 */

import { getAuth } from '../../auth.js';
import mongoose from 'mongoose';
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
    this.db = null;
  }

  /**
   * Initialize the service with Better Auth instance and database
   */
  initialize() {
    this.auth = getAuth();
    // Use the Better Auth compatible MongoDB client
    // Handle both production and test environments
    if (mongoose.connection.getClient) {
      const client = mongoose.connection.getClient();
      this.db = client.db();
    } else {
      // Fallback for test environments (MongoDB Memory Server)
      this.db = mongoose.connection.db;
    }
  }

  /**
   * Finds an organization by email domain using direct MongoDB queries
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} Organization if found, null otherwise
   */
  async findOrganizationByEmailDomain(email) {
    try {
      this.initialize();

      const domain = extractEmailDomain(email);
      const expectedSlug = generateOrganizationSlug(domain);

      logger.debug('Searching for organization with domain:', domain);

      // Use direct MongoDB queries since Better Auth adapter is not accessible
      const organizationCollection = this.db.collection('organization');

      // First try to find by slug
      let organization = await organizationCollection.findOne({ slug: expectedSlug });

      // If not found by slug, try searching by domain in metadata
      if (!organization) {
        // Search for domain in metadata (stored as JSON string)
        organization = await organizationCollection.findOne({
          metadata: { $regex: domain, $options: 'i' },
        });

        if (organization) {
          logger.debug('Found existing organization by domain:', {
            id: organization._id.toString(),
            name: organization.name,
            domain,
          });
          return organization;
        }
      }

      if (organization) {
        logger.debug('Found existing organization by slug:', {
          id: organization._id.toString(),
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
   * Creates a new organization for the user's email domain using direct database queries
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

      const organizationCollection = this.db.collection('organization');
      const memberCollection = this.db.collection('member');

      let organization;
      try {
        // Create organization document
        const orgResult = await organizationCollection.insertOne({
          _id: new mongoose.Types.ObjectId(),
          name,
          slug,
          metadata: JSON.stringify({
            domain,
            autoCreated: true,
            createdFromEmail: email,
          }),
          createdAt: new Date(),
        });

        organization = await organizationCollection.findOne({ _id: orgResult.insertedId });

        // Create member record for the owner
        await memberCollection.insertOne({
          _id: new mongoose.Types.ObjectId(),
          userId,
          organizationId: organization._id.toString(),
          role: 'owner',
          createdAt: new Date(),
        });
      } catch (createError) {
        // Check if this is a duplicate error (slug collision)
        const isDuplicateError =
          createError.code === 11000 || // MongoDB duplicate key error
          (createError.message &&
            (createError.message.toLowerCase().includes('duplicate') ||
              createError.message.toLowerCase().includes('already exists') ||
              createError.message.toLowerCase().includes('unique')));

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
            id: organization._id.toString(),
            name: organization.name,
            domain,
          });
        } else {
          // Re-throw non-duplicate errors
          throw createError;
        }
      }

      logger.info('Successfully created organization:', {
        id: organization._id.toString(),
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

      const memberCollection = this.db.collection('member');

      // Check if user is already a member
      const existingMember = await memberCollection.findOne({
        userId,
        organizationId,
      });

      if (existingMember) {
        logger.info('User is already a member of organization:', {
          userId,
          organizationId,
          role: existingMember.role,
        });
        return existingMember;
      }

      // Create new member record
      const memberResult = await memberCollection.insertOne({
        _id: new mongoose.Types.ObjectId(),
        userId,
        organizationId,
        role,
        createdAt: new Date(),
      });

      const member = await memberCollection.findOne({ _id: memberResult.insertedId });

      logger.info('Successfully added user to organization:', {
        memberId: member._id.toString(),
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
          organizationId: organization._id.toString(),
          email,
        });
      } else {
        // Step 3: Add user to existing organization as member
        await this.addUserToOrganization(userId, organization._id.toString(), 'member');
        memberRole = 'member';

        logger.info('User joined existing organization as member:', {
          userId,
          organizationId: organization._id.toString(),
          email,
        });
      }

      return {
        organization: {
          id: organization._id.toString(),
          name: organization.name,
          slug: organization.slug,
          metadata: organization.metadata,
          createdAt: organization.createdAt,
        },
        isNewOrganization,
        memberRole,
      };
    } catch (error) {
      logger.error('Error handling user organization assignment:', error);
      throw error;
    }
  }

  /**
   * Gets the user's active organization and role using direct database queries
   * @param {string} userId - User's ID
   * @returns {Promise<{organization: Object|null, role: string|null}>}
   */
  async getUserOrganization(userId) {
    try {
      this.initialize();

      const memberCollection = this.db.collection('member');
      const organizationCollection = this.db.collection('organization');

      // Get user's organization memberships
      const memberships = await memberCollection.find({ userId }).toArray();

      if (!memberships || memberships.length === 0) {
        return { organization: null, role: null };
      }

      // For Phase 1, user has only one organization (no org switcher)
      const primaryMembership = memberships[0];

      // Get the organization details
      const organization = await organizationCollection.findOne({
        _id: new mongoose.Types.ObjectId(primaryMembership.organizationId),
      });

      return {
        organization: organization
          ? {
              id: organization._id.toString(),
              name: organization.name,
              slug: organization.slug,
              metadata: organization.metadata,
              createdAt: organization.createdAt,
            }
          : null,
        role: primaryMembership.role,
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
