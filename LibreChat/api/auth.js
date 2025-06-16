/**
 * @fileoverview Better Auth configuration and initialization
 * @module auth
 * @requires better-auth
 * @requires better-auth/adapters/mongodb
 * @requires mongoose
 */

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import mongoose from 'mongoose';
import { logger } from '#config/index.js';
import { betterAuthConfig } from '#config/betterAuth.js';

/**
 * Better Auth instance, initialized after MongoDB connection
 * @type {import('better-auth').BetterAuth | null}
 * @private
 */
let authInstance = null;

/**
 * Initialize Better Auth once MongoDB connection is established
 * Uses existing Mongoose connection to prevent duplicate connections
 */
mongoose.connection.once('open', () => {
  try {
    logger.info('Initializing Better Auth with MongoDB adapter');

    const client = mongoose.connection.getClient();
    const db = client.db('Agentis');

    // Debug Google OAuth credentials
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    logger.debug('Google OAuth credentials check:', {
      clientId: googleClientId ? 'present' : 'missing',
      clientSecret: googleClientSecret ? 'present' : 'missing',
    });

    if (!googleClientId || !googleClientSecret) {
      logger.warn('Google OAuth credentials missing - Google provider will not be available');
    }

    const config = {
      database: mongodbAdapter(db),
      secret: process.env.BETTER_AUTH_SECRET,
      ...betterAuthConfig,
      socialProviders:
        googleClientId && googleClientSecret
          ? {
              google: {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
                redirectURI: `${betterAuthConfig.baseURL}/api/auth/callback/google`,
              },
            }
          : undefined,
    };

    if (googleClientId && googleClientSecret) {
      logger.info('Google OAuth provider configured');
    } else {
      logger.warn('Google OAuth provider not configured - missing credentials');
    }

    authInstance = betterAuth(config);

    // Debug auth instance
    logger.info('Better Auth initialized successfully');

    // Log available routes
    if (authInstance.handler) {
      logger.info('Better Auth handler is available');
    }
  } catch (error) {
    logger.error('Failed to initialize Better Auth:', error);
    throw error;
  }
});

/**
 * Gets the Better Auth instance
 * Returns a temporary handler if Better Auth is not yet initialized
 *
 * @returns {import('better-auth').BetterAuth | {handler: Function}} The auth instance or temporary handler
 */
export const getAuth = () => {
  if (!authInstance) {
    // Return a temporary auth object that sends 503 responses
    return {
      handler: (_req, res) => {
        res.status(503).json({
          error: 'Authentication service is starting up. Please try again in a moment.',
        });
      },
    };
  }
  return authInstance;
};
