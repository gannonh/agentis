/**
 * @fileoverview Migration to ensure existing sessions have activeOrganizationId set
 * @module db/migrations/ensure-active-organization-in-sessions
 * @description This migration updates existing sessions to include the user's organization
 */

import mongoose from 'mongoose';
import { logger } from '#config/index.js';

/**
 * Ensure all sessions have activeOrganizationId set based on user's organization membership
 * @param {Object} db - MongoDB database instance
 * @returns {Promise<void>}
 */
export async function ensureActiveOrganizationInSessions(db) {
  try {
    logger.info('Starting migration: ensure-active-organization-in-sessions');

    const sessionCollection = db.collection('session');
    const memberCollection = db.collection('member');

    // Get all sessions without activeOrganizationId
    const sessionsWithoutOrg = await sessionCollection
      .find({ activeOrganizationId: { $exists: false } })
      .toArray();

    logger.info(`Found ${sessionsWithoutOrg.length} sessions without activeOrganizationId`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process each session
    for (const session of sessionsWithoutOrg) {
      try {
        // Find user's organization membership
        const membership = await memberCollection.findOne({ userId: session.userId });

        if (membership && membership.organizationId) {
          // Update session with activeOrganizationId
          await sessionCollection.updateOne(
            { _id: session._id },
            { $set: { activeOrganizationId: membership.organizationId } },
          );
          updatedCount++;
          logger.debug(
            `Updated session ${session._id} with organization ${membership.organizationId}`,
          );
        } else {
          logger.debug(`No organization membership found for user ${session.userId}`);
        }
      } catch (error) {
        logger.error(`Error updating session ${session._id}:`, error);
        errorCount++;
      }
    }

    logger.info(`Migration completed: Updated ${updatedCount} sessions, ${errorCount} errors`);
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Run the migration
 */
export default async function runMigration() {
  try {
    // Wait for database connection
    await new Promise((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
      }
    });

    const client = mongoose.connection.getClient();
    const db = client.db();
    await ensureActiveOrganizationInSessions(db);
  } catch (error) {
    logger.error('Failed to run migration:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runMigration();
}
