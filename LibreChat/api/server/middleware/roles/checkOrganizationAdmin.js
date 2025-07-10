/**
 * @fileoverview Middleware to check if user has admin or owner permissions for an organization
 * @module server/middleware/roles/checkOrganizationAdmin
 */

import mongoose from 'mongoose';
import { logger } from '#config/index.js';

/**
 * Middleware to check if authenticated user has admin or owner permissions for the specified organization.
 * Supports organizationId from both req.params and req.body (for enable-domain-join endpoint).
 * Handles both Better Auth string IDs and MongoDB ObjectId formats.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
async function checkOrganizationAdmin(req, res, next) {
  try {
    // Get organizationId from params (working endpoints) or body (enable-domain-join)
    const organizationId = req.params?.organizationId || req.body?.organizationId;
    const userId = req.user?.id;

    // Validate required parameters
    if (!organizationId) {
      logger.warn('Organization admin check failed: missing organizationId in params or body', {
        userId,
        path: req.path,
        hasParams: !!req.params?.organizationId,
        hasBody: !!req.body?.organizationId,
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

    // Validate organizationId format - accept both Better Auth strings and ObjectIds
    const isObjectId = mongoose.Types.ObjectId.isValid(organizationId);
    const isBetterAuthId = typeof organizationId === 'string' && organizationId.length > 0;

    if (!isObjectId && !isBetterAuthId) {
      logger.warn('Organization admin check failed: invalid organizationId format', {
        userId,
        organizationId,
        organizationIdType: typeof organizationId,
        path: req.path,
      });
      return res.status(400).json({
        error: 'Invalid organization ID format',
      });
    }

    logger.debug('Organization admin check: ID format detected', {
      userId,
      organizationId,
      isObjectId,
      isBetterAuthId,
      path: req.path,
    });

    // Get database connection
    const db = mongoose.connection.db;
    const memberCollection = db.collection('member');

    // Flexible membership lookup - handle both string and ObjectId formats
    let membership = null;

    // First: Try direct lookup with provided formats
    membership = await memberCollection.findOne({
      userId,
      organizationId,
      role: { $in: ['admin', 'owner'] },
    });

    // Second: If no match and we have convertible IDs, try ObjectId conversion
    if (!membership) {
      const query = { role: { $in: ['admin', 'owner'] } };

      // Convert userId to ObjectId if possible
      if (mongoose.Types.ObjectId.isValid(userId)) {
        query.userId = new mongoose.Types.ObjectId(userId);
      } else {
        query.userId = userId;
      }

      // Convert organizationId to ObjectId if possible
      if (mongoose.Types.ObjectId.isValid(organizationId)) {
        query.organizationId = new mongoose.Types.ObjectId(organizationId);
      } else {
        query.organizationId = organizationId;
      }

      membership = await memberCollection.findOne(query);

      if (membership) {
        logger.debug('Organization admin check: Found membership with ObjectId conversion', {
          userId,
          organizationId,
          originalQuery: { userId, organizationId },
          convertedQuery: query,
          path: req.path,
        });
      }
    }

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
