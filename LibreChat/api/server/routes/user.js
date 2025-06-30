import express from 'express';
import {
  requireBetterAuth,
  canDeleteAccount,
  verifyEmailLimiter,
  checkAdmin,
} from '#server/middleware.js';
import { User } from '#models/index.js';
import logger from '#utils/logger.js';
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

/**
 * Admin update user endpoint
 * Allows admins to update user name and email
 */
router.patch('/admin/update/:userId', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;

    // Validate input
    if (!name && !email) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If email is being changed, check if it's already in use
    if (email && email !== userExists.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    logger.info('Admin updated user', {
      adminId: req.user.id,
      userId,
      updatedFields: Object.keys(updateData),
    });

    res.json({ user: updatedUser });
  } catch (error) {
    logger.error('Failed to update user', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * GET /api/user/admin/check-email
 * Check if email is already in use (admin only)
 */
router.get('/admin/check-email', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    // Check if email is already in use
    const existingUser = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') },
    });

    res.json({
      exists: !!existingUser,
      email: email.toLowerCase(),
    });
  } catch (error) {
    logger.error('Failed to check email availability', error);
    res.status(500).json({ error: 'Failed to check email availability' });
  }
});

export default router;
