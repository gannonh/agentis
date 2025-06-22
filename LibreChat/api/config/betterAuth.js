/**
 * @fileoverview Better Auth configuration settings
 * @module config/betterAuth
 */

import logger from './winston.js';

/**
 * Better Auth configuration object
 * @typedef {Object} BetterAuthConfig
 * @property {string} basePath - Base path for auth endpoints
 * @property {Object} emailAndPassword - Email/password auth settings
 * @property {boolean} emailAndPassword.enabled - Enable email/password auth
 * @property {number} emailAndPassword.minPasswordLength - Minimum password length
 * @property {number} emailAndPassword.maxPasswordLength - Maximum password length
 * @property {Object} emailVerification - Email verification settings
 * @property {boolean} emailVerification.enabled - Enable email verification
 * @property {boolean} emailVerification.sendOnSignUp - Send verification email on signup
 * @property {Object} session - Session configuration
 * @property {number} session.expiresIn - Session expiration in seconds (7 days)
 * @property {boolean} session.updateAge - Update session on activity
 * @property {number} session.cookieAge - Cookie max age in seconds
 * @property {Object} socialProviders - OAuth provider configurations
 */

/**
 * Better Auth configuration
 * @type {BetterAuthConfig}
 */
export const betterAuthConfig = {
  basePath: '/api/auth',
  // Backend API URL (where Better Auth endpoints are served)
  baseURL: process.env.DOMAIN_SERVER,
  // Client URL (where users' browsers are pointed) - used for redirects
  clientURL: process.env.DOMAIN_CLIENT,
  trustedOrigins: [
    'http://localhost:3090', // Dev frontend server
    'http://localhost:3080', // Backend + production frontend
    'http://localhost:3000', // Alternative dev port
    'https://agentis.ai', // Production domain
  ],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
    enabled: false, // Will be enabled when email service is configured
    sendOnSignUp: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    updateAge: 60 * 60 * 24, // Update session if older than 1 day
    cookieAge: 60 * 60 * 24 * 7, // 7 days
  },
  // Social providers are configured directly in auth.js
};

logger.debug('Better Auth config values:', {
  baseURL: process.env.DOMAIN_SERVER,
  clientURL: process.env.DOMAIN_CLIENT,
  basePath: '/api/auth',
});
logger.debug('Better Auth config object created successfully');
