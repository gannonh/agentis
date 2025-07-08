/**
 * @fileoverview Middleware to check if user has admin or owner permissions for an organization
 * @module server/middleware/roles/checkOrganizationAdmin
 */

import mongoose from 'mongoose';
import { logger } from '#config/index.js';

/**
 * Middleware to check if authenticated user has admin or owner permissions for the specified organization
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
async function checkOrganizationAdmin(req, res, next) {
  try {
    const { organizationId } = req.params;
    const userId = req.user?.id;

    // Validate required parameters
    if (!organizationId) {
      logger.warn('Organization admin check failed: missing organizationId in params', {
        userId,
        path: req.path,
      });
      return res.status(400).json({
        error: 'Organization ID is required',
      });
    }

    if (!userId) {
      logger.warn('Organization admin check failed: missing user ID', {
        organizationId,
        path: req.path,
      });
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    // Validate organizationId format
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      logger.warn('Organization admin check failed: invalid organizationId format', {
        userId,
        organizationId,
        path: req.path,
      });
      return res.status(400).json({
        error: 'Invalid organization ID format',
      });
    }

    // Get database connection
    const db = mongoose.connection.db;
    const memberCollection = db.collection('member');

    // Check if user is a member of the organization with admin or owner role
    const membership = await memberCollection.findOne({
      userId,
      organizationId,
      role: { $in: ['admin', 'owner'] },
    });

    if (!membership) {
      logger.warn('Organization admin check failed: user lacks admin/owner permissions', {
        userId,
        organizationId,
        path: req.path,
      });
      return res.status(403).json({
        error: 'Insufficient permissions. Admin or owner role required.',
      });
    }

    // Log successful authorization
    logger.debug('Organization admin check passed', {
      userId,
      organizationId,
      role: membership.role,
      path: req.path,
    });

    // Add organization role to request for downstream use
    req.organizationRole = membership.role;

    next();
  } catch (error) {
    logger.error('Organization admin check error', {
      userId: req.user?.id,
      organizationId: req.params?.organizationId,
      path: req.path,
      error: error.message,
    });

    res.status(500).json({
      error: 'Internal server error during permission check',
    });
  }
}

export default checkOrganizationAdmin;
