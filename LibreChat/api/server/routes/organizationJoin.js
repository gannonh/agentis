/**
 * @fileoverview Organization Join API routes - Issue #104
 * @module server/routes/organizationJoin
 *
 * REST endpoints for organization joining functionality including:
 * - Auto-join flow for domain-enabled organizations
 * - Request-to-join flow with admin approval
 * - Join request management for admins
 */

import express from 'express';
import requireBetterAuth from '../middleware/requireBetterAuth.js';
import { checkOrganizationAdmin } from '../middleware/roles/index.js';
import OrganizationJoinService from '../services/OrganizationJoinService.js';
import { logger } from '#config/index.js';

const router = express.Router();

/**
 * POST /api/organization/auto-join
 * Auto-join user to organization if domain join is enabled
 */
router.post('/auto-join', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    logger.info('Auto-join request received', {
      userId,
      organizationId,
      userEmail,
    });

    // Validate required fields
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required',
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        error: 'User email is required for domain validation',
      });
    }

    // Validate auto-join eligibility first
    const eligibility = await OrganizationJoinService.validateAutoJoinEligibility({
      userEmail,
      organizationId,
    });

    if (!eligibility.eligible) {
      return res.status(400).json({
        error: 'User is not eligible for auto-join',
        reason: eligibility.reason,
        organization: eligibility.organization,
      });
    }

    // Perform auto-join
    const result = await OrganizationJoinService.autoJoinOrganization({
      userId,
      organizationId,
      userEmail,
    });

    logger.info('Auto-join successful', {
      userId,
      organizationId,
      membershipId: result.membershipId,
    });

    res.json({
      success: true,
      message: 'Successfully joined organization',
      membership: {
        id: result.membershipId,
        role: result.role,
        organizationId: result.organizationId,
      },
      organization: eligibility.organization,
    });
  } catch (error) {
    logger.error('Auto-join failed', {
      userId: req.user?.id,
      organizationId: req.body?.organizationId,
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to join organization',
      message: error.message,
    });
  }
});

/**
 * POST /api/organization/request-join
 * Create a join request for an organization
 */
router.post('/request-join', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId, requestMessage } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    logger.info('Join request creation received', {
      userId,
      organizationId,
      userEmail,
    });

    // Validate required fields
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required',
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        error: 'User email is required',
      });
    }

    // Create join request
    const result = await OrganizationJoinService.createJoinRequest({
      userId,
      organizationId,
      userEmail,
      requestMessage,
    });

    logger.info('Join request created successfully', {
      userId,
      organizationId,
      requestId: result.requestId,
    });

    res.json({
      success: true,
      message: 'Join request submitted successfully',
      request: {
        id: result.requestId,
        status: result.status,
        organizationId: result.organizationId,
      },
    });
  } catch (error) {
    logger.error('Join request creation failed', {
      userId: req.user?.id,
      organizationId: req.body?.organizationId,
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to create join request',
      message: error.message,
    });
  }
});

/**
 * GET /api/organization/:organizationId/join-requests
 * Get join requests for an organization (admin only)
 */
router.get(
  '/:organizationId/join-requests',
  requireBetterAuth,
  checkOrganizationAdmin,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { status } = req.query;
      const userId = req.user.id;

      logger.info('Join requests fetch requested', {
        userId,
        organizationId,
        status,
      });

      // Organization admin permission check handled by checkOrganizationAdmin middleware

      // Get join requests
      const result = await OrganizationJoinService.getJoinRequests({
        organizationId,
        status,
      });

      logger.info('Join requests fetched successfully', {
        userId,
        organizationId,
        count: result.total,
      });

      res.json({
        success: true,
        requests: result.requests,
        total: result.total,
      });
    } catch (error) {
      logger.error('Failed to fetch join requests', {
        userId: req.user?.id,
        organizationId: req.params?.organizationId,
        error: error.message,
      });

      res.status(500).json({
        error: 'Failed to fetch join requests',
        message: error.message,
      });
    }
  },
);

/**
 * POST /api/organization/:organizationId/join-requests/:requestId/approve
 * Approve a join request (admin only)
 */
router.post(
  '/:organizationId/join-requests/:requestId/approve',
  requireBetterAuth,
  checkOrganizationAdmin,
  async (req, res) => {
    try {
      const { organizationId, requestId } = req.params;
      const reviewerId = req.user.id;

      logger.info('Join request approval requested', {
        reviewerId,
        organizationId,
        requestId,
      });

      // Organization admin permission check handled by checkOrganizationAdmin middleware

      // Approve join request
      const result = await OrganizationJoinService.approveJoinRequest({
        requestId,
        organizationId,
        reviewerId,
      });

      logger.info('Join request approved successfully', {
        reviewerId,
        organizationId,
        requestId,
        membershipId: result.membershipId,
      });

      res.json({
        success: true,
        message: 'Join request approved successfully',
        membership: {
          id: result.membershipId,
          userId: result.userId,
          organizationId: result.organizationId,
        },
      });
    } catch (error) {
      logger.error('Join request approval failed', {
        reviewerId: req.user?.id,
        organizationId: req.params?.organizationId,
        requestId: req.params?.requestId,
        error: error.message,
      });

      res.status(500).json({
        error: 'Failed to approve join request',
        message: error.message,
      });
    }
  },
);

/**
 * POST /api/organization/:organizationId/join-requests/:requestId/reject
 * Reject a join request (admin only)
 */
router.post(
  '/:organizationId/join-requests/:requestId/reject',
  requireBetterAuth,
  checkOrganizationAdmin,
  async (req, res) => {
    try {
      const { organizationId, requestId } = req.params;
      const { rejectionReason } = req.body;
      const reviewerId = req.user.id;

      logger.info('Join request rejection requested', {
        reviewerId,
        organizationId,
        requestId,
      });

      // Organization admin permission check handled by checkOrganizationAdmin middleware

      // Reject join request
      const result = await OrganizationJoinService.rejectJoinRequest({
        requestId,
        organizationId,
        reviewerId,
        rejectionReason,
      });

      logger.info('Join request rejected successfully', {
        reviewerId,
        organizationId,
        requestId,
      });

      res.json({
        success: true,
        message: 'Join request rejected successfully',
        request: {
          id: result.requestId,
          status: result.status,
        },
      });
    } catch (error) {
      logger.error('Join request rejection failed', {
        reviewerId: req.user?.id,
        organizationId: req.params?.organizationId,
        requestId: req.params?.requestId,
        error: error.message,
      });

      res.status(500).json({
        error: 'Failed to reject join request',
        message: error.message,
      });
    }
  },
);

/**
 * GET /api/organization/membership-status
 * Check if user is a member of an organization
 */
router.get('/membership-status', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const userId = req.user.id;

    logger.info('Membership status check requested', {
      userId,
      organizationId,
    });

    // Validate required fields
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required',
      });
    }

    // Check if user is a member of the organization
    const isMember = await OrganizationJoinService.checkUserMembership({
      userId,
      organizationId,
    });

    logger.info('Membership status checked', {
      userId,
      organizationId,
      isMember,
    });

    res.json({
      success: true,
      isMember,
    });
  } catch (error) {
    logger.error('Membership status check failed', {
      userId: req.user?.id,
      organizationId: req.query?.organizationId,
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to check membership status',
      message: error.message,
    });
  }
});

/**
 * GET /api/organization/check-join-eligibility
 * Check if user can auto-join or needs to request to join an organization
 */
router.get('/check-join-eligibility', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const userEmail = req.user.email;
    const userId = req.user.id;

    logger.info('Join eligibility check requested', {
      userId,
      organizationId,
      userEmail,
    });

    // Validate required fields
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization ID is required',
      });
    }

    if (!userEmail) {
      return res.status(400).json({
        error: 'User email is required for domain validation',
      });
    }

    // Check auto-join eligibility
    const result = await OrganizationJoinService.validateAutoJoinEligibility({
      userEmail,
      organizationId,
    });

    logger.info('Join eligibility checked', {
      userId,
      organizationId,
      eligible: result.eligible,
    });

    res.json({
      success: true,
      canAutoJoin: result.eligible,
      reason: result.reason,
      organization: result.organization,
    });
  } catch (error) {
    logger.error('Join eligibility check failed', {
      userId: req.user?.id,
      organizationId: req.query?.organizationId,
      error: error.message,
    });

    res.status(500).json({
      error: 'Failed to check join eligibility',
      message: error.message,
    });
  }
});

/**
 * POST /api/organization/detect-domain
 * Organization detection endpoint - detects organizations by email domain (authenticated users only)
 */
router.post('/detect-domain', requireBetterAuth, async (req, res) => {
  try {
    const { checkDomainOrganizations } = await import(
      '../services/OrganizationDetectionService.js'
    );
    const { logger } = await import('#config/index.js');

    const { email, inviteToken } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    // Validate email format and ensure domain exists
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    const emailParts = email.split('@');
    if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].trim() === '') {
      return res.status(400).json({
        error: 'Invalid email format - missing or empty domain',
      });
    }

    // Build invite context if token is provided
    let inviteContext = null;
    if (inviteToken) {
      inviteContext = {
        inviteToken,
      };
    }

    const result = await checkDomainOrganizations(email, inviteContext);
    res.json(result);
  } catch (error) {
    logger.error('Error detecting organization domain:', error);
    res.status(500).json({
      error: 'Failed to detect organization',
      message: error.message,
    });
  }
});

/**
 * POST /api/organization/enable-domain-join
 * Enable domain join for organization (admin only)
 */
router.post('/enable-domain-join', requireBetterAuth, checkOrganizationAdmin, async (req, res) => {
  try {
    const { isPublicDomain } = await import('../services/PublicDomainService.js');
    const { logger } = await import('#config/index.js');
    const mongoose = await import('mongoose');

    const { organizationId, domain, enableDomainJoin = true } = req.body;

    logger.info('Organization domain setup request received:', {
      organizationId,
      organizationIdType: typeof organizationId,
      domain,
      enableDomainJoin,
      body: req.body,
    });

    if (!organizationId || !domain) {
      return res.status(400).json({
        error: 'Organization ID and domain are required',
      });
    }

    // Validate organizationId format (should be a string, not necessarily ObjectId)
    if (typeof organizationId !== 'string' || organizationId.trim() === '') {
      return res.status(400).json({
        error: 'Invalid organization ID format',
      });
    }

    // Validate domain format (should be a valid domain, not email)
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        error: 'Invalid domain format',
      });
    }

    // Security check: Only prevent public domains when enabling auto-join
    if (enableDomainJoin && isPublicDomain(domain)) {
      logger.warn(`Attempt to enable domain auto-join for public domain: ${domain}`);
      return res.status(400).json({
        error: 'Cannot enable automatic domain joining for public email domains',
      });
    }

    // Update organization metadata with domain information
    const db = mongoose.default.connection.db;
    if (!db) {
      logger.warn('MongoDB connection not available for organization update');
      return res.status(503).json({
        error: 'Database connection not available',
      });
    }

    try {
      // Prepare update object - always set domain, conditionally set allowDomainJoin
      const updateFields = {
        'metadata.domain': domain,
        'metadata.allowDomainJoin': enableDomainJoin,
      };

      // Smart organization update - try both Better Auth and ObjectId formats
      let result;

      // First try: Better Auth string ID format
      result = await db
        .collection('organization')
        .updateOne({ id: organizationId }, { $set: updateFields });

      // Fallback: ObjectId format if no match and ID is convertible
      if (result.matchedCount === 0 && mongoose.default.Types.ObjectId.isValid(organizationId)) {
        const objectId = new mongoose.default.Types.ObjectId(organizationId);
        result = await db
          .collection('organization')
          .updateOne({ _id: objectId }, { $set: updateFields });

        logger.debug('Organization domain update: Used ObjectId format', {
          organizationId,
          objectId: objectId.toString(),
        });
      } else if (result.matchedCount > 0) {
        logger.debug('Organization domain update: Used Better Auth string format', {
          organizationId,
        });
      }

      logger.info(`Organization domain update result:`, {
        organizationId,
        domain,
        enableDomainJoin,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged,
      });

      if (result.matchedCount === 0) {
        return res.status(404).json({
          error: 'Organization not found',
        });
      }

      const actionDescription = enableDomainJoin
        ? `Domain auto-join enabled for organization ${organizationId} with domain ${domain}`
        : `Domain metadata set for organization ${organizationId} with domain ${domain} (auto-join disabled)`;

      logger.info(actionDescription);
      res.json({
        success: true,
        domain,
        allowDomainJoin: enableDomainJoin,
      });
    } catch (error) {
      logger.error('Error setting organization domain:', error);
      res.status(500).json({
        error: 'Failed to set organization domain',
        message: error.message,
      });
    }
  } catch (error) {
    logger.error('Error in route handler:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
