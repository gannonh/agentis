/**
 * @fileoverview Better Auth configuration settings
 * @module config/betterAuth
 */

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
 */

/**
 * Better Auth configuration
 * @type {BetterAuthConfig}
 */
export const betterAuthConfig = {
  basePath: '/api/auth',
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
};