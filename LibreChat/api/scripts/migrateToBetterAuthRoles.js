#!/usr/bin/env node

/**
 * Migration script to convert LibreChat uppercase roles (USER/ADMIN)
 * to Better Auth lowercase roles (user/admin)
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  success: (...args) => console.log('[SUCCESS]', ...args),
};

async function migrateRoles() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.success('Connected to MongoDB');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Count users with uppercase roles
    const userCount = await usersCollection.countDocuments({ role: 'USER' });
    const adminCount = await usersCollection.countDocuments({ role: 'ADMIN' });

    logger.info(`Found ${userCount} users with role 'USER'`);
    logger.info(`Found ${adminCount} users with role 'ADMIN'`);

    if (userCount === 0 && adminCount === 0) {
      logger.info(
        'No users with uppercase roles found. Migration may have already been completed.',
      );
      return;
    }

    // Migrate USER -> user
    if (userCount > 0) {
      logger.info('Migrating USER -> user...');
      const userResult = await usersCollection.updateMany(
        { role: 'USER' },
        { $set: { role: 'user' } },
      );
      logger.success(`Migrated ${userResult.modifiedCount} users from 'USER' to 'user'`);
    }

    // Migrate ADMIN -> admin
    if (adminCount > 0) {
      logger.info('Migrating ADMIN -> admin...');
      const adminResult = await usersCollection.updateMany(
        { role: 'ADMIN' },
        { $set: { role: 'admin' } },
      );
      logger.success(`Migrated ${adminResult.modifiedCount} users from 'ADMIN' to 'admin'`);
    }

    // Verify migration
    const remainingUppercase = await usersCollection.countDocuments({
      $or: [{ role: 'USER' }, { role: 'ADMIN' }],
    });

    if (remainingUppercase === 0) {
      logger.success(
        '✅ Migration completed successfully! All roles have been converted to lowercase.',
      );
    } else {
      logger.error(
        `⚠️  Migration incomplete. ${remainingUppercase} users still have uppercase roles.`,
      );
    }

    // Show current role distribution
    const roleStats = await usersCollection
      .aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
      .toArray();

    logger.info('Current role distribution:');
    roleStats.forEach((stat) => {
      logger.info(`  ${stat._id || 'no role'}: ${stat.count} users`);
    });
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run migration
logger.info('Starting Better Auth role migration...');
migrateRoles()
  .then(() => {
    logger.success('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration process failed:', error);
    process.exit(1);
  });
