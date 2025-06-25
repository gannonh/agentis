/**
 * @fileoverview Optional Better Auth session middleware
 * @module optionalBetterAuth
 * @requires better-auth
 */

import { getAuth } from '#auth.js';
import { logger } from '#config/index.js';
import { User } from '../../models/index.js';
import { SystemRoles } from 'librechat-data-provider';

/**
 * Middleware for optional Better Auth session authentication
 * Populates req.user if session exists, but allows request to continue if not
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const optionalBetterAuth = async (req, res, next) => {
  try {
    const auth = getAuth();

    // Check if Better Auth is initialized (not in startup mode)
    if (typeof auth.handler === 'function' && !auth.api) {
      // Continue without authentication if service is starting up
      return next();
    }

    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      // No session - continue without setting req.user
      return next();
    }

    // Load full user data from database using Better Auth user ID
    const user = await User.findOne({ email: session.user.email })
      .select('-password -__v -totpSecret')
      .lean();

    if (!user) {
      logger.warn(`User not found in database for session: ${session.user.email}`);
      // Continue without setting req.user
      return next();
    }

    // Populate req.user with the same structure as JWT middleware
    req.user = {
      id: user._id.toString(), // Convert ObjectId to string like JWT middleware
      role: user.role || SystemRoles.user, // Default to user role
      ...user,
      _id: user._id.toString(), // Ensure _id is also string
    };

    next();
  } catch (error) {
    logger.error('Optional Better Auth middleware error:', error);
    // Continue without authentication on error
    next();
  }
};

export default optionalBetterAuth;
