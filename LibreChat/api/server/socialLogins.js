import { logger } from '#config/index.js';

/**
 * Legacy social logins configuration - now handled by Better Auth
 * @param {Express.Application} app
 */
const configureSocialLogins = (app) => {
  logger.info('Social logins are now handled by Better Auth - skipping legacy Passport.js configuration');
};

export default configureSocialLogins;
