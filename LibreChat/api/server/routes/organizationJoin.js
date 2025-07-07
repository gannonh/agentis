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
router.get('/:organizationId/join-requests', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { status } = req.query;
    const userId = req.user.id;

    logger.info('Join requests fetch requested', {
      userId,
      organizationId,
      status,
    });

    // TODO: Add organization admin permission check
    // For now, assume authenticated user has access
    
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
});

/**
 * POST /api/organization/:organizationId/join-requests/:requestId/approve
 * Approve a join request (admin only)
 */
router.post('/:organizationId/join-requests/:requestId/approve', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId, requestId } = req.params;
    const reviewerId = req.user.id;

    logger.info('Join request approval requested', {
      reviewerId,
      organizationId,
      requestId,
    });

    // TODO: Add organization admin permission check
    // For now, assume authenticated user has admin rights

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
});

/**
 * POST /api/organization/:organizationId/join-requests/:requestId/reject
 * Reject a join request (admin only)
 */
router.post('/:organizationId/join-requests/:requestId/reject', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId, requestId } = req.params;
    const { rejectionReason } = req.body;
    const reviewerId = req.user.id;

    logger.info('Join request rejection requested', {
      reviewerId,
      organizationId,
      requestId,
    });

    // TODO: Add organization admin permission check
    // For now, assume authenticated user has admin rights

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

export default router;