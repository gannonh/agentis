/**
 * @fileoverview Database indexes and optimization for Better-auth organization collections
 * @module db/organization-indexes
 */

import { logger } from '#config/index.js';
import connectDb from '../lib/db/connectDb.js';
import mongoose from 'mongoose';

/**
 * Performance analysis of current organization query patterns
 */
const QUERY_PATTERNS = {
  // High frequency queries that need optimization
  highFrequency: [
    {
      collection: 'organization',
      query: { 'metadata.domain': 1 },
      description: 'Find organization by email domain',
      frequency: 'Every user login/registration',
      currentPerformance: 'O(n) table scan - SLOW',
      targetPerformance: '<10ms with index',
    },
    {
      collection: 'organization',
      query: { slug: 1 },
      description: 'Find organization by slug',
      frequency: 'Organization creation with collision handling',
      currentPerformance: 'O(n) table scan',
      targetPerformance: '<5ms with unique index',
    },
    {
      collection: 'member',
      query: { userId: 1, organizationId: 1 },
      description: 'Check user membership in organization',
      frequency: 'Every permission check, every API request',
      currentPerformance: 'O(n) table scan - CRITICAL',
      targetPerformance: '<2ms with compound index',
    },
    {
      collection: 'member',
      query: { userId: 1 },
      description: 'List user organizations',
      frequency: 'Session initialization, dashboard loading',
      currentPerformance: 'O(n) table scan',
      targetPerformance: '<5ms with index',
    },
    {
      collection: 'member',
      query: { organizationId: 1, role: 1 },
      description: 'Find organization admins/owners',
      frequency: 'Permission checks, invitation management',
      currentPerformance: 'O(n) table scan',
      targetPerformance: '<5ms with compound index',
    },
  ],

  // Medium frequency queries
  mediumFrequency: [
    {
      collection: 'invitation',
      query: { organizationId: 1, status: 1 },
      description: 'List organization invitations by status',
      frequency: 'Admin dashboard, invitation management',
      currentPerformance: 'O(n) table scan',
      targetPerformance: '<10ms with compound index',
    },
    {
      collection: 'invitation',
      query: { email: 1, status: 1 },
      description: 'Check existing invitations for email',
      frequency: 'Preventing duplicate invitations',
      currentPerformance: 'O(n) table scan',
      targetPerformance: '<5ms with compound index',
    },
    {
      collection: 'invitation',
      query: { expiresAt: 1 },
      description: 'Cleanup expired invitations',
      frequency: 'Background cleanup jobs',
      currentPerformance: 'O(n) table scan',
      targetPerformance: 'Automatic with TTL index',
    },
  ],

  // Low frequency but important for data integrity
  lowFrequency: [
    {
      collection: 'organization',
      query: { createdAt: 1 },
      description: 'Organization creation analytics',
      frequency: 'Reports and analytics',
      currentPerformance: 'Acceptable without index',
      targetPerformance: '<20ms with index for large datasets',
    },
  ],
};

/**
 * Optimal index strategy for Better-auth organization collections
 */
const INDEX_STRATEGY = {
  // Organization collection indexes
  organization: [
    {
      name: 'organization_slug_unique',
      spec: { slug: 1 },
      options: {
        unique: true,
        background: true,
        name: 'organization_slug_unique',
      },
      rationale: 'Ensure slug uniqueness and fast organization lookups',
    },
    {
      name: 'organization_domain_lookup',
      spec: { 'metadata.domain': 1 },
      options: {
        background: true,
        sparse: true, // Only index documents that have metadata.domain
        name: 'organization_domain_lookup',
      },
      rationale: 'Fast domain-based organization discovery during user registration/login',
    },
    {
      name: 'organization_created_analytics',
      spec: { createdAt: 1 },
      options: {
        background: true,
        name: 'organization_created_analytics',
      },
      rationale: 'Support analytics queries and organization listing with date sorting',
    },
  ],

  // Member collection indexes
  member: [
    {
      name: 'member_user_org_unique',
      spec: { userId: 1, organizationId: 1 },
      options: {
        unique: true,
        background: true,
        name: 'member_user_org_unique',
      },
      rationale: 'CRITICAL: Prevent duplicate memberships and enable fast permission checks',
    },
    {
      name: 'member_user_lookup',
      spec: { userId: 1 },
      options: {
        background: true,
        name: 'member_user_lookup',
      },
      rationale: 'Fast user organization listing for session initialization',
    },
    {
      name: 'member_org_role_lookup',
      spec: { organizationId: 1, role: 1 },
      options: {
        background: true,
        name: 'member_org_role_lookup',
      },
      rationale: 'Fast admin/owner lookups for permission checks and invitation management',
    },
    {
      name: 'member_org_lookup',
      spec: { organizationId: 1 },
      options: {
        background: true,
        name: 'member_org_lookup',
      },
      rationale: 'List all organization members efficiently',
    },
  ],

  // Invitation collection indexes
  invitation: [
    {
      name: 'invitation_org_status_lookup',
      spec: { organizationId: 1, status: 1 },
      options: {
        background: true,
        name: 'invitation_org_status_lookup',
      },
      rationale: 'Fast invitation listing by organization and status filtering',
    },
    {
      name: 'invitation_email_status_lookup',
      spec: { email: 1, status: 1 },
      options: {
        background: true,
        name: 'invitation_email_status_lookup',
      },
      rationale: 'Prevent duplicate invitations and check invitation status by email',
    },
    {
      name: 'invitation_expiration_ttl',
      spec: { expiresAt: 1 },
      options: {
        expireAfterSeconds: 0, // TTL index - documents expire based on expiresAt field
        background: true,
        name: 'invitation_expiration_ttl',
      },
      rationale: 'Automatic cleanup of expired invitations without manual intervention',
    },
    {
      name: 'invitation_org_lookup',
      spec: { organizationId: 1 },
      options: {
        background: true,
        name: 'invitation_org_lookup',
      },
      rationale: 'List all invitations for an organization efficiently',
    },
  ],
};

/**
 * Performance targets for organization queries
 */
const PERFORMANCE_TARGETS = {
  // Response time targets (95th percentile)
  organizationLookupByDomain: '< 10ms',
  organizationLookupBySlug: '< 5ms',
  userMembershipCheck: '< 2ms',
  userOrganizationList: '< 5ms',
  organizationMemberList: '< 10ms',
  invitationList: '< 10ms',
  invitationCreate: '< 20ms',

  // Scalability targets
  maxOrganizations: 10000,
  maxUsers: 100000,
  maxMemberships: 1000000,
  maxInvitations: 100000,

  // Concurrency targets
  concurrentUserLogins: 1000,
  concurrentPermissionChecks: 5000,
  concurrentInvitationCreation: 100,
};

/**
 * Creates all necessary indexes for organization collections
 * @returns {Promise<Object>} Index creation results
 */
export async function createOrganizationIndexes() {
  logger.info('Starting organization database index creation');

  try {
    await connectDb();
    const client = mongoose.connection.getClient();
    const db = client.db();
    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    // Create indexes for each collection
    for (const [collectionName, indexes] of Object.entries(INDEX_STRATEGY)) {
      logger.info(`Creating indexes for ${collectionName} collection`);

      const collection = db.collection(collectionName);

      for (const indexDef of indexes) {
        try {
          const indexName = await collection.createIndex(indexDef.spec, indexDef.options);

          results.created.push({
            collection: collectionName,
            name: indexDef.name,
            spec: indexDef.spec,
            indexName,
            rationale: indexDef.rationale,
          });

          logger.info(`✅ Created index: ${indexDef.name} on ${collectionName}`);
        } catch (error) {
          if (error.code === 85) {
            // Index already exists
            results.skipped.push({
              collection: collectionName,
              name: indexDef.name,
              reason: 'Index already exists',
            });
            logger.info(`⏭️  Skipped existing index: ${indexDef.name} on ${collectionName}`);
          } else {
            results.errors.push({
              collection: collectionName,
              name: indexDef.name,
              error: error.message,
            });
            logger.error(
              `❌ Failed to create index: ${indexDef.name} on ${collectionName}:`,
              error,
            );
          }
        }
      }
    }

    logger.info('Organization database index creation completed', {
      created: results.created.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
    });

    return results;
  } catch (error) {
    logger.error('Error creating organization indexes:', error);
    throw error;
  }
}

/**
 * Drops all organization-related indexes (for rollback scenarios)
 * @returns {Promise<Object>} Index removal results
 */
export async function dropOrganizationIndexes() {
  logger.warn('Dropping organization database indexes');

  try {
    await connectDb();
    const client = mongoose.connection.getClient();
    const db = client.db();
    const results = {
      dropped: [],
      errors: [],
    };

    for (const [collectionName, indexes] of Object.entries(INDEX_STRATEGY)) {
      const collection = db.collection(collectionName);

      for (const indexDef of indexes) {
        try {
          await collection.dropIndex(indexDef.name);
          results.dropped.push({
            collection: collectionName,
            name: indexDef.name,
          });
          logger.info(`🗑️  Dropped index: ${indexDef.name} from ${collectionName}`);
        } catch (error) {
          if (error.code === 27) {
            // Index doesn't exist
            logger.info(`⏭️  Index doesn't exist: ${indexDef.name} on ${collectionName}`);
          } else {
            results.errors.push({
              collection: collectionName,
              name: indexDef.name,
              error: error.message,
            });
            logger.error(
              `❌ Failed to drop index: ${indexDef.name} from ${collectionName}:`,
              error,
            );
          }
        }
      }
    }

    return results;
  } catch (error) {
    logger.error('Error dropping organization indexes:', error);
    throw error;
  }
}

/**
 * Analyzes current index usage and performance
 * @returns {Promise<Object>} Index analysis results
 */
export async function analyzeIndexUsage() {
  logger.info('Analyzing organization index usage');

  try {
    await connectDb();
    const client = mongoose.connection.getClient();
    const db = client.db();
    const analysis = {};

    for (const collectionName of Object.keys(INDEX_STRATEGY)) {
      const collection = db.collection(collectionName);

      // Get current indexes
      const indexes = await collection.indexes();

      // Get collection stats
      const stats = await collection.stats();

      analysis[collectionName] = {
        documentCount: stats.count,
        totalSize: stats.size,
        avgDocumentSize: stats.avgObjSize,
        indexes: indexes.map((idx) => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false,
          ttl: idx.expireAfterSeconds !== undefined,
          size: idx.indexSizes?.[idx.name] || 'unknown',
        })),
      };
    }

    logger.info('Index usage analysis completed');
    return analysis;
  } catch (error) {
    logger.error('Error analyzing index usage:', error);
    throw error;
  }
}

/**
 * Exports the analysis data for external use
 */
export { QUERY_PATTERNS, INDEX_STRATEGY, PERFORMANCE_TARGETS };
