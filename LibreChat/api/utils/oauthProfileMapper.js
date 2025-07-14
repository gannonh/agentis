import logger from '#config/winston.js';

/**
 * Creates a profile mapper function for OAuth providers
 * This function maps OAuth provider profiles to user data format
 * and handles existing user detection for account linking
 *
 * @param {Object} db - MongoDB database connection
 * @returns {Function} Profile mapping function
 */
export const createMapProfileToUser = (db) => async (profile) => {
  logger.info('🔍 OAuth profile mapping for:', profile.email);

  // Check if user already exists to ensure proper ID handling
  const userCollection = db.collection('user');
  const existingUser = await userCollection.findOne({ email: profile.email });

  if (existingUser) {
    logger.info('🔗 Found existing user during OAuth mapping:', profile.email);
    // Return user data with existing ID to ensure consistency
    return {
      id: existingUser._id.toString(),
      email: profile.email,
      name: existingUser.name || profile.name,
      image: existingUser.image || profile.picture,
      emailVerified: existingUser.emailVerified || true,
    };
  }

  // New user - just map the OAuth profile data
  logger.info('👤 New user from OAuth:', profile.email);
  return {
    email: profile.email,
    name: profile.name,
    image: profile.picture,
    emailVerified: true,
  };
};
