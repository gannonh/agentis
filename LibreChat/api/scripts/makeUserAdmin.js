#!/usr/bin/env node

/**
 * Script to make a user an admin
 * Usage: node makeUserAdmin.js <email>
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

async function makeUserAdmin(email) {
  try {
    // Get email from command line arguments
    if (!email) {
      logger.error('Please provide an email address');
      logger.info('Usage: node makeUserAdmin.js <email>');
      process.exit(1);
    }

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

    // Find user by email
    logger.info(`Looking for user with email: ${email}`);
    const user = await usersCollection.findOne({ email });

    if (!user) {
      logger.error(`User with email "${email}" not found`);
      process.exit(1);
    }

    logger.info(`Found user: ${user.name || 'No name'} (${user.email})`);
    logger.info(`Current role: ${user.role || 'no role'}`);

    // Update user role to admin
    if (user.role === 'admin') {
      logger.info('User is already an admin');
    } else {
      logger.info('Updating user role to admin...');
      const result = await usersCollection.updateOne(
        { _id: user._id },
        { $set: { role: 'admin' } }
      );

      if (result.modifiedCount === 1) {
        logger.success('✅ User successfully made admin!');
      } else {
        logger.error('Failed to update user role');
      }
    }

    // Also check Better Auth user table
    const betterAuthUsersCollection = db.collection('user');
    const betterAuthUser = await betterAuthUsersCollection.findOne({ email });
    
    if (betterAuthUser) {
      logger.info('Also updating Better Auth user table...');
      await betterAuthUsersCollection.updateOne(
        { _id: betterAuthUser._id },
        { $set: { role: 'admin' } }
      );
      logger.success('✅ Better Auth user table updated!');
    }

  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Get email from command line
const email = process.argv[2];
makeUserAdmin(email);