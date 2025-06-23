import express from 'express';
import {
  refreshController,
  registrationController,
  // resetPasswordController,
  // resetPasswordRequestController,
} from '#server/controllers/AuthController.js';
import { loginController } from '#server/controllers/auth/LoginController.js';
import { logoutController } from '#server/controllers/auth/LogoutController.js';
import { verify2FAWithTempToken } from '#server/controllers/auth/TwoFactorAuthController.js';
import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '../../auth.js';
import {
  enable2FA,
  verify2FA,
  disable2FA,
  regenerateBackupCodes,
  confirm2FA,
} from '#server/controllers/TwoFactorController.js';
import {
  checkBan,
  logHeaders,
  loginLimiter,
  requireBetterAuth,
  checkInviteUser,
  registerLimiter,
  requireLdapAuth,
  setBalanceConfig,
  requireLocalAuth,
  // resetPasswordLimiter,
  validateRegistration,
  // validatePasswordReset,
} from '#server/middleware/index.js';
import { organizationService } from '#server/services/OrganizationService.js';
import { logger } from '#config/index.js';

const router = express.Router();

const ldapAuth = !!process.env.LDAP_URL && !!process.env.LDAP_USER_SEARCH_BASE;
//Local
router.post('/logout', requireBetterAuth, logoutController);
router.post(
  '/login',
  logHeaders,
  loginLimiter,
  checkBan,
  ldapAuth ? requireLdapAuth : requireLocalAuth,
  setBalanceConfig,
  loginController,
);
router.post('/refresh', refreshController);
router.post(
  '/register',
  registerLimiter,
  checkBan,
  checkInviteUser,
  validateRegistration,
  registrationController,
);
// Password reset routes are deprecated - we use magic links now
// router.post(
//   '/requestPasswordReset',
//   resetPasswordLimiter,
//   checkBan,
//   validatePasswordReset,
//   resetPasswordRequestController,
// );
// router.post('/resetPassword', checkBan, validatePasswordReset, resetPasswordController);

router.get('/2fa/enable', requireBetterAuth, enable2FA);
router.post('/2fa/verify', requireBetterAuth, verify2FA);
router.post('/2fa/verify-temp', checkBan, verify2FAWithTempToken);
router.post('/2fa/confirm', requireBetterAuth, confirm2FA);
router.post('/2fa/disable', requireBetterAuth, disable2FA);
router.post('/2fa/backup/regenerate', requireBetterAuth, regenerateBackupCodes);

// Middleware to prepare request for Better Auth using Node.js adapter
const prepareBetterAuthRequest = async (req, res, next) => {
  const auth = getAuth();
  if (!auth) {
    return res.status(500).json({ error: 'Auth not initialized' });
  }

  try {
    // Enhanced logging for magic link requests
    if (req.originalUrl.includes('magic-link')) {
      logger.info('🔗 Processing magic link request:', {
        originalUrl: req.originalUrl,
        path: req.path,
        url: req.url,
        method: req.method,
        hasBody: !!req.body,
        bodyContent: req.body,
      });
    }

    // Debug all requests to see what endpoints are being hit
    logger.info('🔍 Better Auth request debug:', {
      originalUrl: req.originalUrl,
      path: req.path,
      url: req.url,
      method: req.method,
    });

    // For magic link requests, we need to intercept and log the response
    if (req.originalUrl.includes('magic-link')) {
      // Create a response interceptor to capture what's being sent
      const originalSend = res.send;
      const originalJson = res.json;

      res.send = function (body) {
        logger.info('🔗 Magic link response (send):', {
          statusCode: res.statusCode,
          body: body,
        });
        return originalSend.call(this, body);
      };

      res.json = function (obj) {
        logger.info('🔗 Magic link response (json):', {
          statusCode: res.statusCode,
          body: obj,
        });
        return originalJson.call(this, obj);
      };
    }

    // Use Better Auth's Node.js adapter which properly handles Express req/res
    const nodeHandler = toNodeHandler(auth);
    const result = await nodeHandler(req, res);

    // Log result for magic link requests
    if (req.originalUrl.includes('magic-link')) {
      logger.info('🔗 Magic link request completed, result:', result);
    }

    return result;
  } catch (error) {
    logger.error('Error in Better Auth middleware:', error);
    logger.error('Request details:', {
      originalUrl: req.originalUrl,
      method: req.method,
      body: req.body,
    });
    return res.status(500).json({ error: 'Authentication error', details: error.message });
  }
};

// Better Auth integration - handle all other Better Auth endpoints
router.all('/sign-in/*', prepareBetterAuthRequest);
router.all('/sign-up/*', prepareBetterAuthRequest);
router.all('/sign-out', prepareBetterAuthRequest);
router.all('/session', prepareBetterAuthRequest);

// Organization domain checking endpoint - MUST come BEFORE catch-all route
router.get('/organization/check-domain', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        error: 'Email parameter is required',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    logger.debug('Checking organization for email domain:', email);

    // Use organization service to find organization by email domain
    const organization = await organizationService.findOrganizationByEmailDomain(email);

    if (organization) {
      // Get member count for the organization
      const auth = getAuth();
      const members = await auth.api.listOrganizationMembers({
        body: { organizationId: organization.id },
      });

      res.json({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          domain: organization.metadata?.domain || email.split('@')[1],
          memberCount: members?.length || 0,
        },
      });
    } else {
      // No organization found - return 404 to indicate new domain
      res.status(404).json({
        organization: null,
        message: 'No organization found for this domain',
      });
    }
  } catch (error) {
    logger.error('Error checking organization domain:', error);
    res.status(500).json({
      error: 'Failed to check organization domain',
      message: error.message,
    });
  }
});

// Handle all other Better Auth routes (OAuth callbacks, etc.) - MUST come LAST
router.all('/*', prepareBetterAuthRequest);

export default router;
