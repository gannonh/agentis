/**
 * @fileoverview Better Auth configuration and initialization
 * @module auth
 * @requires better-auth
 * @requires better-auth/adapters/mongodb
 * @requires mongoose
 */

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { organization, magicLink } from 'better-auth/plugins';
import mongoose from 'mongoose';
import { logger } from '#config/index.js';
import { betterAuthConfig } from '#config/betterAuth.js';
import { handleOrganizationAssignment } from '#utils/organization.js';

/**
 * Better Auth instance, initialized after MongoDB connection
 * @type {import('better-auth').BetterAuth | null}
 * @private
 */
let authInstance = null;

// Add MongoDB connection error logging
mongoose.connection.on('error', (error) => {
  logger.error('❌ MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected');
});

// Check if MongoDB connection is already open
if (mongoose.connection.readyState === 1) {
  logger.info('🔧 MongoDB already connected, initializing Better Auth immediately...');
}

/**
 * Initialize Better Auth once MongoDB connection is established
 * Uses existing Mongoose connection to prevent duplicate connections
 */
mongoose.connection.once('open', () => {
  try {
    logger.info('🔧 MongoDB connection established, initializing Better Auth...');

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

    // Validate required environment variables
    if (!process.env.BETTER_AUTH_SECRET) {
      logger.error('❌ BETTER_AUTH_SECRET environment variable is required');
      throw new Error('BETTER_AUTH_SECRET environment variable is required but not set');
    }

    logger.debug('Better Auth config values:', {
      baseURL: betterAuthConfig.baseURL,
      clientURL: betterAuthConfig.clientURL,
      secret: process.env.BETTER_AUTH_SECRET ? 'present' : 'missing',
    });

    // Validate URLs before creating Better Auth instance
    if (!betterAuthConfig.baseURL) {
      logger.error('❌ baseURL is missing or undefined');
      throw new Error('baseURL is required but not configured');
    }

    if (!betterAuthConfig.clientURL) {
      logger.error('❌ clientURL is missing or undefined');
      throw new Error('clientURL is required but not configured');
    }

    try {
      new URL(betterAuthConfig.baseURL);
      logger.info('✅ baseURL is valid:', betterAuthConfig.baseURL);
    } catch (e) {
      logger.error('❌ Invalid baseURL:', betterAuthConfig.baseURL, e.message);
      throw new Error(`Invalid baseURL: ${betterAuthConfig.baseURL}`);
    }

    try {
      new URL(betterAuthConfig.clientURL);
      logger.info('✅ clientURL is valid:', betterAuthConfig.clientURL);
    } catch (e) {
      logger.error('❌ Invalid clientURL:', betterAuthConfig.clientURL, e.message);
      throw new Error(`Invalid clientURL: ${betterAuthConfig.clientURL}`);
    }

    // Use environment variables and betterAuthConfig
    const config = {
      database: mongodbAdapter(db),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: betterAuthConfig.baseURL,
      basePath: betterAuthConfig.basePath,
      trustedOrigins: betterAuthConfig.trustedOrigins,

      // Add advanced configuration that might help with URL construction
      advanced: {
        generateId: false, // Use default ID generation
        crossSubDomainCookies: {
          enabled: false, // We're not using subdomains
        },
      },

      // Use betterAuthConfig for consistent settings
      emailAndPassword: {
        enabled: false, // We use magic links, not passwords
      },
      emailVerification: betterAuthConfig.emailVerification,
      session: betterAuthConfig.session,

      // Account linking - allow OAuth to link to existing magic link users
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google'],
        },
      },

      // Add database hooks to handle OAuth user linking and session creation
      databaseHooks: {
        user: {
          create: {
            before: async (user) => {
              try {
                logger.info(
                  'User create hook - checking for existing user with email:',
                  user.email,
                );

                // Check if user already exists with this email
                const userCollection = db.collection('user');
                const existingUser = await userCollection.findOne({ email: user.email });

                if (existingUser) {
                  logger.info('Found existing user with email:', user.email);
                  logger.info('Existing user ID:', existingUser._id);

                  // Better Auth's MongoDB adapter expects to handle the user lookup itself
                  // when account linking is enabled. We should not interfere with that.
                  // However, since it's not working properly, we need a workaround.

                  // Instead of creating a new user, we'll update the incoming user data
                  // to match the existing user's ID
                  const existingUserId = existingUser._id.toString();

                  // Return the user data with the existing ID to prevent duplicate creation
                  return {
                    ...user,
                    id: existingUserId,
                    _id: existingUser._id,
                  };
                }

                logger.info('No existing user found, allowing creation for:', user.email);
                return user;
              } catch (error) {
                logger.error('Error in user create hook:', error);
                return user;
              }
            },
          },
        },
        account: {
          create: {
            before: async (account) => {
              try {
                logger.info('Account create hook - linking OAuth account:', {
                  providerId: account.providerId,
                  userId: account.userId,
                });

                // Ensure the account is linked to the correct user
                if (account.providerId === 'google') {
                  const userCollection = db.collection('user');
                  const user = await userCollection.findOne({ _id: account.userId });

                  if (!user) {
                    logger.warn('User not found for account linking:', account.userId);
                  } else {
                    logger.info('Linking OAuth account to user:', user.email);
                  }
                }

                return account;
              } catch (error) {
                logger.error('Error in account create hook:', error);
                return account;
              }
            },
          },
        },
        session: {
          create: {
            before: async (session) => {
              try {
                logger.info(
                  'Session create hook - setting active organization for user:',
                  session.userId,
                );

                // Get user's organization membership
                const memberCollection = db.collection('member');
                const membership = await memberCollection.findOne({ userId: session.userId });

                if (membership && membership.organizationId) {
                  logger.info(
                    'Found organization membership, setting activeOrganizationId:',
                    membership.organizationId,
                  );
                  return {
                    data: {
                      ...session,
                      activeOrganizationId: membership.organizationId,
                    },
                  };
                }

                logger.info('No organization membership found for user:', session.userId);
                return session;
              } catch (error) {
                logger.error('Error in session create hook:', error);
                return session;
              }
            },
          },
        },
      },

      plugins: [
        organization({
          async onCreate({ user, organization }) {
            logger.info('📍 Organization created:', organization);
            if (user?.email) {
              await handleOrganizationAssignment(user, organization.id);
            }
          },
        }),
        magicLink({
          expiresIn: 300, // 5 minutes
          disableSignUp: false, // Allow new user registration via magic link
          sendMagicLink: async ({ email, token, url }, request) => {
            logger.info(`📧 Magic link request received for: ${email}`);
            logger.info(`🔗 Magic link URL: ${url}`);
            logger.info(`🎫 Magic link token: ${token}`);

            // In development, log the magic link
            if (process.env.NODE_ENV === 'development') {
              console.log(`
🪄 ===== DEVELOPMENT MAGIC LINK =====
📧 Email: ${email}
🔗 Click this link to authenticate: ${url}
🎫 Token: ${token}
====================================
              `);
            }

            // TODO: Implement email sending (for now just log)
            return { success: true };
          },
        }),
      ],
      socialProviders:
        googleClientId && googleClientSecret
          ? {
              google: {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
                // OAuth redirects must go to backend (where Google OAuth is configured)
                redirectURI: `${betterAuthConfig.baseURL}${betterAuthConfig.basePath}/callback/google`,
                // Map OAuth profile to user data - Better Auth will handle account linking
                mapProfileToUser: async (profile) => {
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
                },
              },
            }
          : undefined,
    };

    if (googleClientId && googleClientSecret) {
      logger.info('Google OAuth provider configured');
    } else {
      logger.warn('Google OAuth provider not configured - missing credentials');
    }

    // Create Better Auth instance
    try {
      authInstance = betterAuth(config);
      logger.debug('Better Auth instance created successfully');
    } catch (createError) {
      logger.error('Error creating Better Auth instance:', createError);
      throw createError;
    }

    // Debug auth instance
    logger.info('✅ Better Auth initialized successfully');

    // Log available routes
    if (authInstance.handler) {
      logger.info('✅ Better Auth handler is available');
    } else {
      logger.error('❌ Better Auth handler is NOT available');
    }

    // Debug available Better Auth API methods
    if (authInstance.api) {
      logger.info('✅ Better Auth API methods available:', Object.keys(authInstance.api));

      // Check if magic link methods are available
      if (authInstance.api.signInMagicLink) {
        logger.info('✅ Magic link sign-in method available');
      } else {
        logger.error('❌ Magic link sign-in method NOT available');
      }
    }
  } catch (error) {
    logger.error('Failed to initialize Better Auth:', error);
    throw error;
  }
});

/**
 * Gets the Better Auth instance
 *
 * @returns {import('better-auth').BetterAuth | null} The auth instance or null
 */
export const getAuth = () => {
  return authInstance;
};
