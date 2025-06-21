/**
 * @fileoverview Organization utilities for email domain-based organization management
 * @module utils/organization
 */

import { logger } from '#config/index.js';

/**
 * Extracts the domain from an email address
 * @param {string} email - The email address
 * @returns {string} The domain part of the email
 * @example
 * extractEmailDomain('user@company.com') // returns 'company.com'
 */
export function extractEmailDomain(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Valid email string is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  return email.split('@')[1].toLowerCase();
}

/**
 * Generates an organization name from an email domain
 * @param {string} domain - The email domain
 * @returns {string} The generated organization name
 * @example
 * generateOrganizationName('company.com') // returns 'Company'
 */
export function generateOrganizationName(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Valid domain string is required');
  }

  // Remove .com, .org, etc. and capitalize first letter
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Generates a unique organization slug from an email domain
 * @param {string} domain - The email domain
 * @param {number} suffix - Optional suffix number for uniqueness
 * @returns {string} The generated organization slug
 * @example
 * generateOrganizationSlug('company.com') // returns 'company'
 * generateOrganizationSlug('company.com', 1) // returns 'company-1'
 */
export function generateOrganizationSlug(domain, suffix = null) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Valid domain string is required');
  }

  // Use the domain name part (without TLD) as slug
  const baseSlug = domain.split('.')[0].toLowerCase();
  return suffix ? `${baseSlug}-${suffix}` : baseSlug;
}

/**
 * Finds an organization by email domain
 * @param {Object} auth - Better Auth instance
 * @param {string} email - The user's email
 * @returns {Promise<Object|null>} The organization if found, null otherwise
 */
export async function findOrganizationByEmailDomain(auth, email) {
  try {
    const domain = extractEmailDomain(email);
    const expectedSlug = generateOrganizationSlug(domain);

    logger.debug('Looking for organization with domain/slug:', { domain, expectedSlug });

    // Use Better Auth API to find organization by slug
    const organizations = await auth.api.listOrganizations({
      body: {},
    });

    // Find organization with matching slug or domain in metadata
    const organization = organizations?.find(
      (org) => org.slug === expectedSlug || org.metadata?.domain === domain,
    );

    if (organization) {
      logger.debug('Found existing organization:', organization.name);
    } else {
      logger.debug('No organization found for domain:', domain);
    }

    return organization || null;
  } catch (error) {
    logger.error('Error finding organization by email domain:', error);
    throw error;
  }
}

/**
 * Creates a new organization for a user based on their email domain
 * @param {Object} auth - Better Auth instance
 * @param {string} email - The user's email
 * @param {string} userId - The user's ID
 * @param {number} maxRetries - Maximum number of retry attempts for slug collisions
 * @returns {Promise<Object>} The created organization
 */
export async function createOrganizationForUser(auth, email, userId, maxRetries = 5) {
  const domain = extractEmailDomain(email);
  const baseName = generateOrganizationName(domain);

  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      const name = attempt === 0 ? baseName : `${baseName} ${attempt}`;
      const slug = generateOrganizationSlug(domain, attempt > 0 ? attempt : null);

      logger.info(
        `Creating new organization for domain: ${domain} (attempt ${attempt + 1}/${maxRetries + 1})`,
      );

      // Create organization using Better Auth API
      const organization = await auth.api.createOrganization({
        body: {
          name,
          slug,
          metadata: {
            domain,
            createdFromEmail: email,
            autoCreated: true,
          },
        },
        headers: {
          'user-id': userId, // This will be set by auth middleware
        },
      });

      logger.info('Created organization:', organization.name, 'for domain:', domain);
      return organization;
    } catch (error) {
      lastError = error;

      // Check if this is a slug collision error (409 Conflict)
      const isSlugCollision =
        error.status === 409 ||
        error.statusCode === 409 ||
        (error.message && error.message.toLowerCase().includes('duplicate')) ||
        (error.message && error.message.toLowerCase().includes('already exists'));

      if (isSlugCollision && attempt < maxRetries) {
        logger.warn(
          `Slug collision detected for domain ${domain}, retrying with suffix (attempt ${attempt + 2}/${maxRetries + 1})`,
        );
        attempt++;
        continue;
      }

      // If not a slug collision or we've exhausted retries, throw the error
      logger.error('Error creating organization for user:', error);
      throw error;
    }
  }

  // This should never be reached, but just in case
  logger.error(
    `Failed to create organization after ${maxRetries + 1} attempts for domain: ${domain}`,
  );
  throw lastError || new Error('Failed to create organization: maximum retries exceeded');
}

/**
 * Handles organization assignment for a user during registration/signin
 * @param {Object} auth - Better Auth instance
 * @param {string} email - The user's email
 * @param {string} userId - The user's ID
 * @returns {Promise<{organization: Object, isNewOrganization: boolean, memberRole: string}>} Organization assignment result
 */
export async function handleOrganizationAssignment(auth, email, userId) {
  try {
    logger.debug('Handling organization assignment for:', email);

    // First, try to find existing organization
    let organization = await findOrganizationByEmailDomain(auth, email);
    let isNewOrganization = false;
    let memberRole = 'member';

    if (!organization) {
      // Create new organization for this domain
      organization = await createOrganizationForUser(auth, email, userId);
      isNewOrganization = true;
      memberRole = 'owner';
    } else {
      logger.debug('User will join existing organization:', organization.name);
      
      // Add user to existing organization as member
      try {
        await auth.api.addMember({
          body: {
            userId: userId,
            organizationId: organization.id,
            role: 'member',
          },
        });
        logger.info('✅ User added to existing organization:', organization.name);
      } catch (addMemberError) {
        logger.error('❌ Failed to add user to organization:', addMemberError);
        throw addMemberError;
      }
    }

    return {
      organization,
      isNewOrganization,
      memberRole,
    };
  } catch (error) {
    logger.error('Error handling organization assignment:', error);
    throw error;
  }
}
