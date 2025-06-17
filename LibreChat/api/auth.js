/**
 * @fileoverview Better Auth configuration and initialization
 * @module auth
 * @requires better-auth
 * @requires better-auth/adapters/mongodb
 * @requires mongoose
 */

import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { organization } from 'better-auth/plugins';
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
      plugins: [
        ...(betterAuthConfig.plugins || []),
        organization({
          // Allow any user to create organization (auto-created based on email domain)
          allowUserToCreateOrganization: true,
          // Set creator role as account_owner (equivalent to owner)
          creatorRole: 'owner',
          // Invitation configuration
          invitationExpiresIn: 604800, // 7 days in seconds
          cancelPendingInvitationsOnReInvite: true,
          // Email invitation handler
          sendInvitationEmail: async ({ email, invitationId, organizationName, inviterName }) => {
            try {
              logger.info('Sending organization invitation email', {
                email,
                invitationId,
                organizationName,
                inviterName,
              });

              const { default: sendEmail } = await import('#server/utils/sendEmail.js');
              
              // Create invitation link
              const baseURL = process.env.DOMAIN_CLIENT || process.env.DOMAIN_SERVER || 'http://localhost:3090';
              const inviteLink = `${baseURL}/accept-invitation?token=${invitationId}`;

              await sendEmail({
                email,
                subject: `Invitation to join ${organizationName} on ${process.env.APP_TITLE || 'Agentis'}`,
                template: 'organizationInvite.handlebars',
                payload: {
                  name: email.split('@')[0], // Use email prefix as name fallback
                  appName: process.env.APP_TITLE || 'Agentis',
                  organizationName,
                  inviterName,
                  inviteLink,
                  year: new Date().getFullYear(),
                },
              });

              logger.info('Organization invitation email sent successfully', {
                email,
                organizationName,
              });
            } catch (error) {
              logger.error('Failed to send organization invitation email', {
                error: error.message,
                email,
                organizationName,
              });
              throw error;
            }
          },
          // Organization creation hooks for email domain-based logic
          organizationCreation: {
            beforeCreate: async ({ organization, user }) => {
              logger.debug('Before organization creation hook triggered', {
                orgName: organization.name,
                userEmail: user.email,
              });

              // Add email domain to metadata
              const domain = user.email.split('@')[1];
              return {
                data: {
                  ...organization,
                  metadata: {
                    ...organization.metadata,
                    domain,
                    autoCreated: true,
                    createdFromEmail: user.email,
                  },
                },
              };
            },
            afterCreate: async ({ organization, member, user }) => {
              logger.info('Organization created successfully', {
                orgId: organization.id,
                orgName: organization.name,
                userId: user.id,
                userEmail: user.email,
                role: member.role,
              });
            },
          },
          // Invitation hooks
          invitation: {
            beforeCreate: async ({ invitation, organization, inviter }) => {
              logger.debug('Before invitation creation hook triggered', {
                email: invitation.email,
                organizationName: organization.name,
                inviterEmail: inviter.email,
              });

              return {
                data: {
                  ...invitation,
                  metadata: {
                    ...invitation.metadata,
                    inviterEmail: inviter.email,
                    organizationDomain: organization.metadata?.domain,
                  },
                },
              };
            },
            afterCreate: async ({ invitation, organization, inviter }) => {
              logger.info('Organization invitation created successfully', {
                invitationId: invitation.id,
                email: invitation.email,
                organizationName: organization.name,
                inviterEmail: inviter.email,
              });
            },
          },
        }),
      ],
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
