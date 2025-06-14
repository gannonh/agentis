import express from 'express';
import {  requireBetterAuth, canDeleteAccount, verifyEmailLimiter  } from '#server/middleware.js';
import { 
  getUserController,
  deleteUserController,
  verifyEmailController,
  updateUserPluginsController,
  resendVerificationController,
  getTermsStatusController,
  acceptTermsController,
 } from '#server/controllers/UserController.js';

const router = express.Router();

router.get('/', requireBetterAuth, getUserController);
router.get('/terms', requireBetterAuth, getTermsStatusController);
router.post('/terms/accept', requireBetterAuth, acceptTermsController);
router.post('/plugins', requireBetterAuth, updateUserPluginsController);
router.delete('/delete', requireBetterAuth, canDeleteAccount, deleteUserController);
router.post('/verify', verifyEmailController);
router.post('/verify/resend', verifyEmailLimiter, resendVerificationController);

export default router;
