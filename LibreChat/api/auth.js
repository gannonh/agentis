/**
 * @fileoverview Better Auth configuration and initialization
 * @module auth
 * @requires better-auth
 * @requires better-auth/adapters/mongodb
 * @requires mongoose
 */

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { organization, magicLink, admin } from 'better-auth/plugins';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { logger } from '#config/index.js';
import { betterAuthConfig } from '#config/betterAuth.js';
import { handleOrganizationAssignment } from '#utils/organization.js';
import { createMapProfileToUser } from '#utils/oauthProfileMapper.js';

/**
 * Better Auth instance, initialized after MongoDB connection
 * @type {import('better-auth').BetterAuth | null}
 * @private
 */
let authInstance = null;

/**
 * Send invitation email function
 * @param {Object} invitationData - Invitation data from Better Auth
 * @param {Object} request - Request object
 * @returns {Promise<Object>} Success/error result
 */
export const sendInvitationEmail = async (invitationData, request) => {
  try {
    logger.info('📧 Sending invitation email for:', invitationData.email);
    logger.debug('📧 Invitation data received:', invitationData);

    // Import email utility
    const sendEmail = (await import('#server/utils/sendEmail.js')).default;

    // Better Auth provides inviter and organization data directly
    const inviterName = invitationData.inviter?.user?.name || 
                       invitationData.inviter?.user?.email?.split('@')[0] || 
                       'Someone';
                       
    const organizationName = invitationData.organization?.name || 'the team';

    // Build invitation link using the invitation ID
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:3090'}/auth/accept-invitation/${invitationData.id}`;

    const emailData = {
      email: invitationData.email,
      subject: `Join ${inviterName}'s team at ${organizationName}`,
      template: 'organizationInvite.handlebars',
      payload: {
        name: invitationData.email.split('@')[0], // Extract username portion
        inviterName: inviterName,
        organizationName: organizationName,
        inviteLink: inviteLink,
        appName: process.env.APP_TITLE || 'Agentis',
        year: new Date().getFullYear(),
      },
    };

    logger.debug('📧 Email data prepared:', { 
      subject: emailData.subject,
      inviterName: emailData.payload.inviterName,
      organizationName: emailData.payload.organizationName,
      inviteLink: emailData.payload.inviteLink
    });

    // Send email
    await sendEmail(emailData);

    logger.info('✅ Invitation email sent successfully to:', invitationData.email);
    return { success: true };
  } catch (error) {
    logger.error('❌ Failed to send invitation email:', error);
    return { success: false, error: error.message };
  }
};

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

    const db = mongoose.connection.db;

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

    // Use a Map to store pending invitation data between before/after hooks
    // This avoids relying on user object mutations that Better Auth might modify
    const pendingInvitations = new Map();

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

      // Note: Server-side redirect hooks removed due to Better Auth compatibility issues
      // Onboarding resumption logic is implemented client-side in MagicLinkLogin.tsx

      // Use betterAuthConfig for consistent settings
      emailAndPassword: {
        enabled: true, // Required for admin.createUser to work, though users still authenticate via OAuth/magic links
      },
      emailVerification: betterAuthConfig.emailVerification,
      session: betterAuthConfig.session,

      // User configuration with additional fields
      user: {
        additionalFields: {
          onboardingStep: {
            type: 'string',
            required: false,
            defaultValue: 'organization',
            input: true, // Allow setting during updates
          },
          username: {
            type: 'string',
            required: false,
            input: true, // Allow setting during updates
          },
          image: {
            type: 'string',
            required: false,
            input: true, // Allow setting during updates
          },
        },
      },

      // Account linking - allow OAuth to link to existing magic link users
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google'],
        },
      },

      // Restore working database hooks from before OAuth regression
      databaseHooks: {
        user: {
          create: {
            before: async (user) => {
              try {
                logger.info('🔧 BEFORE HOOK EXECUTING - User create hook triggered for:', user.email);
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

                  // Return the user data with the existing ID to prevent duplicate creation
                  const existingUserId = existingUser._id.toString();
                  return {
                    ...user,
                    id: existingUserId,
                    _id: existingUser._id,
                  };
                }

                logger.info('No existing user found, allowing creation for:', user.email);
                
                // Check for pending invitations for this email
                const invitationCollection = db.collection('invitation');
                const pendingInvitation = await invitationCollection.findOne({
                  email: user.email.toLowerCase(),
                  status: 'pending'
                });
                
                if (pendingInvitation) {
                  logger.info(`🎫 Found pending invitation for ${user.email} to organization ${pendingInvitation.organizationId}`);
                  
                  // Start at 'profile' step - they skip organization creation and go to profile setup
                  user.onboardingStep = 'profile';
                  
                  // Accept the invitation
                  await invitationCollection.updateOne(
                    { _id: pendingInvitation._id },
                    { 
                      $set: { 
                        status: 'accepted',
                        acceptedAt: new Date()
                      } 
                    }
                  );
                  
                  // Store pending invitation data using email as key
                  // This avoids relying on user object mutations
                  pendingInvitations.set(user.email, {
                    invitationId: pendingInvitation._id,
                    organizationId: pendingInvitation.organizationId,
                    role: pendingInvitation.role || 'member'
                  });
                  
                  logger.info(`📝 Will create membership after user creation completes for ${user.email}`);
                  logger.info(`📝 Stored pending data for ${user.email}: invitationId=${pendingInvitation._id}, orgId=${pendingInvitation.organizationId}, role=${pendingInvitation.role}`);
                }

                return user;
              } catch (error) {
                logger.error('Error in user create hook:', error);
                return user;
              }
            },
            after: async (user) => {
              try {
                logger.info('🔧 AFTER HOOK EXECUTING - User create after hook triggered for:', user.email);
                logger.info('🔧 After hook user data:', { 
                  id: user.id, 
                  email: user.email, 
                  onboardingStep: user.onboardingStep
                });
                
                // Check if we have pending invitation data for this email
                const pendingData = pendingInvitations.get(user.email);
                if (pendingData) {
                  logger.info(`🎫 Found pending invitation data for ${user.email}, creating membership...`);
                  logger.info(`🎫 Pending data:`, pendingData);
                  
                  const memberCollection = db.collection('member');
                  const { normalizeId } = await import('#server/utils/flexibleId.js');
                  const { ObjectId } = await import('mongodb');
                  
                  const membershipData = {
                    _id: new ObjectId(), // Use MongoDB ObjectId for consistency
                    userId: normalizeId(user.id), // Use the utility we created for this!
                    organizationId: normalizeId(pendingData.organizationId), // Use the utility we created for this!
                    role: pendingData.role,
                    createdAt: new Date()
                  };
                  
                  logger.info(`🎫 Creating membership with data:`, membershipData);
                  
                  await memberCollection.insertOne(membershipData);
                  
                  logger.info(`✅ Auto-accepted invitation and created membership for ${user.email} with userId: ${user.id}`);
                  
                  // Clean up the pending data
                  pendingInvitations.delete(user.email);
                } else {
                  logger.info(`ℹ️ No pending invitation data found for ${user.email}`);
                }
                
                return user;
              } catch (error) {
                logger.error('Error in user create after hook:', error);
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
        admin({
          defaultRole: 'user',
          adminRoles: ['admin'],
          // For development, make specific users admin by their ID
          adminUserIds: process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : [],
        }),
        organization({
          // DISABLED: Auto-organization creation removed for Issue #101
          // Users must explicitly create organizations through onboarding flow
          //
          // The onCreate hook previously auto-created organizations based on email domain
          // This has been disabled to allow users to control their organization creation
          // and prevent automatic organization creation for public email domains.
          //
          // async onCreate({ user, organization }) {
          //   try {
          //     logger.info('📍 Organization created:', organization);
          //     if (user?.email) {
          //       await handleOrganizationAssignment(authInstance, user.email, user.id);
          //       logger.info('✅ Organization assignment completed for user:', user.email);
          //     } else {
          //       logger.warn('⚠️ User has no email, skipping organization assignment');
          //     }
          //   } catch (error) {
          //     logger.error('❌ Failed to handle organization assignment:', error);
          //     // Don't throw the error to prevent breaking the organization creation
          //   }
          // },

          // Send invitation email function
          sendInvitationEmail: sendInvitationEmail,
        }),
        magicLink({
          expiresIn: 600, // 10 minutes
          disableSignUp: false, // Allow new user registration via magic link
          sendMagicLink: async ({ email, token, url }, request) => {
            logger.info(`📧 Magic link request received for: ${email}`);
            logger.info(`🔗 Magic link URL: ${url}`);
            logger.info(`🎫 Magic link token: ${token}`);

            // Import email utility
            const sendEmail = (await import('#server/utils/sendEmail.js')).default;

            // Check if email is configured
            const emailConfigured = process.env.EMAIL_SERVICE || process.env.EMAIL_HOST;

            if (emailConfigured) {
              try {
                // Send actual email using existing email infrastructure
                const emailResult = await sendEmail({
                  email,
                  subject: `Sign in to ${process.env.APP_TITLE || 'Agentis'}`,
                  template: 'magicLink.handlebars',
                  payload: {
                    name: email.split('@')[0], // Use email prefix as name
                    appName: process.env.APP_TITLE || 'Agentis',
                    magicLink: url,
                    year: new Date().getFullYear(),
                  },
                });

                logger.info(`✅ Magic link email sent successfully to: ${email}`);
                logger.info(`📮 Email result:`, emailResult?.messageId || 'No message ID');
              } catch (emailError) {
                logger.error('❌ Failed to send magic link email:', emailError);
                // Continue with file writing as fallback
              }
            } else {
              logger.warn(
                '⚠️ Email service not configured, using file-based magic links for development',
              );
            }

            // In development/test, also write magic link to file for e2e testing
            logger.info(
              `🔍 Magic link debug - NODE_ENV: ${process.env.NODE_ENV}, CI: ${process.env.CI}`,
            );
            const shouldWriteFile =
              process.env.NODE_ENV === 'development' ||
              process.env.NODE_ENV === 'test' ||
              process.env.NODE_ENV === 'CI' ||
              process.env.CI === 'true' ||
              process.env.CI;
            logger.info(`🔍 Should write magic link file: ${shouldWriteFile}`);
            if (shouldWriteFile) {
              logger.info(
                `📁 Magic link file writing enabled for environment: ${process.env.NODE_ENV}`,
              );
              let tempDir;
              try {
                const fs = await import('fs/promises');
                const path = await import('path');

                // Create temp directory if it doesn't exist
                // Use file location to reliably find project root regardless of process.cwd()
                const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
                const projectRoot = path.resolve(currentFileDir, '../'); // api/auth.js -> ../
                tempDir = path.join(projectRoot, 'temp');
                try {
                  await fs.mkdir(tempDir, { recursive: true });
                } catch (err) {
                  // Directory might already exist
                }

                // Write magic link data to file for e2e tests to read
                const magicLinkData = {
                  email,
                  token,
                  url,
                  timestamp: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 300 * 1000).toISOString(), // 5 minutes from now
                };

                const magicLinksFile = path.join(tempDir, 'magic-links.json');

                // Read existing magic links or create new array
                let magicLinks = [];
                try {
                  const existingData = await fs.readFile(magicLinksFile, 'utf8');
                  magicLinks = JSON.parse(existingData);
                } catch (err) {
                  // File doesn't exist or is invalid, start with empty array
                }

                // Add new magic link (keep last 10 for cleanup)
                magicLinks.push(magicLinkData);
                if (magicLinks.length > 10) {
                  magicLinks = magicLinks.slice(-10);
                }

                // Write back to file
                await fs.writeFile(magicLinksFile, JSON.stringify(magicLinks, null, 2));

                logger.info(`📁 Magic link written to file: ${magicLinksFile}`);
                logger.info(`📁 Total magic links in file: ${magicLinks.length}`);
                logger.info(`📁 Latest magic link email: ${email}`);

                // Log magic link details for development
                logger.info('🪄 ===== DEVELOPMENT MAGIC LINK =====');
                logger.info(`📧 Email: ${email}`);
                logger.info(`🔗 Click this link to authenticate: ${url}`);
                logger.info(`🎫 Token: ${token}`);
                logger.info(`📁 Also written to: ${magicLinksFile}`);
                logger.info('====================================');
              } catch (error) {
                logger.error('❌ Failed to write magic link to file:', error);
                logger.error('❌ File path was:', tempDir);
                logger.error('❌ Error details:', error.message);
                logger.error('❌ Error stack:', error.stack);
              }
            }

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
                mapProfileToUser: createMapProfileToUser(db),
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
 * @returns {import('better-auth').BetterAuth | {handler: Function}} The auth instance or temporary handler
 */
export const getAuth = () => {
  if (!authInstance) {
    // Return a temporary handler that responds with 503 when auth is not ready
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
