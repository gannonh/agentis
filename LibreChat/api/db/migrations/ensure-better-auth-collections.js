/**
 * @fileoverview Migration script to ensure Better Auth collections exist
 * @module db/migrations/ensure-better-auth-collections
 */

import mongoose from 'mongoose';
import { logger } from '#config/index.js';
import connectDb from '../../lib/db/connectDb.js';

/**
 * Required collections for Better Auth
 */
const BETTER_AUTH_COLLECTIONS = [
  {
    name: 'user',
    description: 'Stores user authentication data',
    indexes: [
      { email: 1 },
      { username: 1 },
    ]
  },
  {
    name: 'session',
    description: 'Manages user sessions',
    indexes: [
      { userId: 1 },
      { token: 1 },
      { expiresAt: 1 },
    ]
  },
  {
    name: 'account',
    description: 'Stores authentication provider data (OAuth, credentials)',
    indexes: [
      { userId: 1 },
      { providerId: 1 },
      { providerAccountId: 1 },
    ]
  },
  {
    name: 'verification',
    description: 'Email/phone verification tokens',
    indexes: [
      { token: 1 },
      { identifier: 1 },
      { expiresAt: 1 },
    ]
  },
  {
    name: 'member',
    description: 'Organization membership data',
    indexes: [
      { userId: 1, organizationId: 1 },
      { organizationId: 1 },
    ]
  },
  {
    name: 'organization',
    description: 'Organization data',
    indexes: [
      { slug: 1 },
      { 'metadata.domain': 1 },
    ]
  },
  {
    name: 'invitation',
    description: 'Organization invitations',
    indexes: [
      { organizationId: 1 },
      { email: 1 },
      { expiresAt: 1 },
    ]
  }
];

/**
 * Ensures all Better Auth collections exist
 * @returns {Promise<Object>} Migration results
 */
export async function ensureBetterAuthCollections() {
  logger.info('🔧 Ensuring Better Auth collections exist...');

  try {
    await connectDb();
    const db = mongoose.connection.db;
    
    // Get existing collections
    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);
    
    logger.info(`📊 Found ${existingNames.length} existing collections:`, existingNames);
    
    const results = {
      created: [],
      existing: [],
      errors: []
    };
    
    // Create missing collections
    for (const collection of BETTER_AUTH_COLLECTIONS) {
      try {
        if (existingNames.includes(collection.name)) {
          results.existing.push(collection.name);
          logger.info(`✓ Collection already exists: ${collection.name}`);
        } else {
          await db.createCollection(collection.name);
          results.created.push(collection.name);
          logger.info(`✅ Created collection: ${collection.name}`);
          
          // Create indexes for the new collection
          const coll = db.collection(collection.name);
          for (const indexSpec of collection.indexes || []) {
            await coll.createIndex(indexSpec);
            logger.info(`  📍 Created index on ${collection.name}:`, indexSpec);
          }
        }
      } catch (error) {
        results.errors.push({
          collection: collection.name,
          error: error.message
        });
        logger.error(`❌ Error with collection ${collection.name}:`, error);
      }
    }
    
    logger.info('✅ Better Auth collection check completed:', {
      created: results.created.length,
      existing: results.existing.length,
      errors: results.errors.length
    });
    
    return results;
  } catch (error) {
    logger.error('❌ Failed to ensure Better Auth collections:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureBetterAuthCollections()
    .then(() => {
      logger.info('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration failed:', error);
      process.exit(1);
    });
}
