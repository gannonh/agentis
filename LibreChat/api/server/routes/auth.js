import express from 'express';
import {
  refreshController,
  registrationController,
  resetPasswordController,
  resetPasswordRequestController,
} from '#server/controllers/AuthController.js';
import { loginController } from '#server/controllers/auth/LoginController.js';
import { logoutController } from '#server/controllers/auth/LogoutController.js';
import { verify2FAWithTempToken } from '#server/controllers/auth/TwoFactorAuthController.js';
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
  resetPasswordLimiter,
  validateRegistration,
  validatePasswordReset,
} from '#server/middleware/index.js';

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
router.post(
  '/requestPasswordReset',
  resetPasswordLimiter,
  checkBan,
  validatePasswordReset,
  resetPasswordRequestController,
);
router.post('/resetPassword', checkBan, validatePasswordReset, resetPasswordController);

router.get('/2fa/enable', requireBetterAuth, enable2FA);
router.post('/2fa/verify', requireBetterAuth, verify2FA);
router.post('/2fa/verify-temp', checkBan, verify2FAWithTempToken);
router.post('/2fa/confirm', requireBetterAuth, confirm2FA);
router.post('/2fa/disable', requireBetterAuth, disable2FA);
router.post('/2fa/backup/regenerate', requireBetterAuth, regenerateBackupCodes);

// Better Auth integration - handle all Better Auth endpoints
router.all('/sign-in/*', (req, res) => {
  const auth = getAuth();
  return auth.handler(req, res);
});

router.all('/sign-up/*', (req, res) => {
  const auth = getAuth();
  return auth.handler(req, res);
});

router.all('/sign-out', (req, res) => {
  const auth = getAuth();
  return auth.handler(req, res);
});

router.all('/session', (req, res) => {
  const auth = getAuth();
  return auth.handler(req, res);
});

// Handle all other Better Auth routes (OAuth callbacks, etc.)
router.all('/*', (req, res) => {
  const auth = getAuth();
  return auth.handler(req, res);
});

export default router;
