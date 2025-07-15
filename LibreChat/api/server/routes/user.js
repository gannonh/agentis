import express from 'express';
import {
  requireBetterAuth,
  canDeleteAccount,
  verifyEmailLimiter,
  checkAdmin,
  usernameCheckLimiter,
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
router.post('/update-onboarding-step', requireBetterAuth, async (req, res) => {
  try {
    const { onboardingStep } = req.body;
    const userId = req.user.id;

    // Validate onboarding step
    const validSteps = ['organization', 'profile', 'team', 'welcome', 'complete'];
    if (!onboardingStep || !validSteps.includes(onboardingStep)) {
      return res.status(400).json({
        error: 'Invalid onboarding step',
        validSteps,
      });
    }

    // Update user using Mongoose model to ensure schema validations are applied
    // Better Auth uses the 'user' collection which is already configured in the User model
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        onboardingStep,
        updatedAt: new Date(),
      },
      {
        new: true, // Return the updated document
        runValidators: true, // Ensure schema validations are applied
      },
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the update actually modified the onboardingStep
    const wasModified = updatedUser.onboardingStep === onboardingStep;
    if (!wasModified) {
      logger.warn('User onboarding step was not modified - may already be set to this value', {
        userId,
        onboardingStep,
        currentStep: updatedUser.onboardingStep,
      });
    }

    logger.info('Updated user onboarding step using Mongoose model', {
      userId,
      onboardingStep,
      wasModified,
      currentOnboardingStep: updatedUser.onboardingStep,
    });

    res.json({
      success: true,
      onboardingStep: updatedUser.onboardingStep,
    });
  } catch (error) {
    logger.error('Failed to update onboarding step using Mongoose model', error);
    res.status(500).json({ error: 'Failed to update onboarding step' });
  }
});
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
 * Escapes special regex characters to prevent ReDoS attacks
 * @param {string} string - The string to escape
 * @returns {string} - The escaped string safe for regex use
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

    // Validate email format
    if (typeof email !== 'string' || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Use case-insensitive exact match without regex for better security and performance
    // MongoDB's case-insensitive collation is safer than constructing regex patterns
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
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

/**
 * GET /api/user/check-username
 * Check if username is available for current user
 */
router.get('/check-username', usernameCheckLimiter, requireBetterAuth, async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username parameter is required' });
    }

    // Validate username format
    if (typeof username !== 'string' || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters long' });
    }

    // Check if username contains only allowed characters
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({
        error: 'Username can only contain letters, numbers, underscores, and hyphens',
      });
    }

    // Check if username exists in user schema (username field is in main schema)
    const existingUser = await User.findOne({
      username: username.toLowerCase(),
      _id: { $ne: req.user.id }, // Exclude current user
    });

    res.json({
      available: !existingUser,
      username: username.toLowerCase(),
    });
  } catch (error) {
    logger.error('Failed to check username availability', error);
    res.status(500).json({ error: 'Failed to check username availability' });
  }
});

export default router;
