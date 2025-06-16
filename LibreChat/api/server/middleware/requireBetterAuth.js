/**
 * @fileoverview Better Auth session middleware for protecting routes
 * @module requireBetterAuth
 * @requires better-auth
 */

import { logger } from '#config/index.js';
import { User } from '../../models/index.js';
import { SystemRoles } from 'librechat-data-provider';
import { getAuth } from '../../auth.js';

/**
 * Middleware to require Better Auth session authentication
 * Validates session using Better Auth and syncs user data with LibreChat
 * Uses unified 'user' collection for both Better Auth and LibreChat data
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const requireBetterAuth = async (req, res, next) => {
  try {
    const auth = getAuth();

    // Check if Better Auth is ready
    if (!auth.api) {
      return res.status(503).json({
        error: 'Authentication service is starting up. Please try again in a moment.',
      });
    }

    // Use Better Auth to validate session from cookies
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
      });
    }

    // Get user from our unified collection using Better Auth user ID
    let user = await User.findById(session.user.id).select('-password -__v -totpSecret').lean();

    // If user doesn't exist in our collection, sync from Better Auth
    if (!user) {
      logger.info(`Syncing user ${session.user.id} from Better Auth to LibreChat`);
      const newUser = new User({
        _id: session.user.id, // Use Better Auth user ID
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified || false,
        provider: 'local', // Default provider
        role: SystemRoles.USER,
        termsAccepted: true, // Assume terms accepted if they can log in
      });
      await newUser.save();
      user = newUser.toObject();
    }

    // Ensure user has required LibreChat fields
    if (!user.role) {
      await User.findByIdAndUpdate(user._id, {
        role: SystemRoles.USER,
        provider: user.provider || 'local',
        termsAccepted: user.termsAccepted !== undefined ? user.termsAccepted : true,
      });
      user.role = SystemRoles.USER;
    }

    // Populate req.user with the same structure as JWT middleware
    req.user = {
      id: user._id.toString(), // Convert ObjectId to string like JWT middleware
      role: user.role || SystemRoles.USER, // Default to USER role
      ...user,
      _id: user._id.toString(), // Ensure _id is also string
    };

    next();
  } catch (error) {
    logger.error('Better Auth middleware error:', error);

    // Handle specific Better Auth errors
    if (error.message?.includes('session') || error.status === 401) {
      return res.status(401).json({
        error: 'Invalid or expired session. Please log in again.',
      });
    }

    return res.status(500).json({
      error: 'Authentication service error. Please try again.',
    });
  }
};

export default requireBetterAuth;
