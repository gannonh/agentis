/**
 * @fileoverview Organization invitation routes
 * @module server/routes/invitations
 */

import express from 'express';
import { invitationService } from '#server/services/InvitationService.js';
import { organizationService } from '#server/services/OrganizationService.js';
import { requireBetterAuth } from '#server/middleware/index.js';
import { logger } from '#config/index.js';

const router = express.Router();

/**
 * @route POST /api/organizations/:organizationId/invitations
 * @desc Create a new invitation for an organization
 * @access Private (Organization owners/admins only)
 */
router.post('/:organizationId/invitations', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Check if user has permission to invite members
    const permissionResult = await invitationService.hasInvitationPermission(
      organizationId,
      userId,
    );
    if (!permissionResult.ok) {
      return res.status(500).json({
        error: 'Failed to check invitation permissions',
        message: permissionResult.error,
      });
    }
    if (!permissionResult.hasPermission) {
      return res.status(403).json({
        error: 'You do not have permission to invite members to this organization',
      });
    }

    // Create the invitation
    const invitation = await invitationService.createInvitation(
      organizationId,
      email,
      role,
      userId,
    );

    res.status(201).json({
      success: true,
      data: invitation,
      message: 'Invitation created and sent successfully',
    });
  } catch (error) {
    logger.error('Error creating invitation', error);

    // Handle specific error cases
    if (error.message?.includes('already a member')) {
      return res.status(409).json({
        error: 'User is already a member of this organization',
      });
    }

    if (error.message?.includes('already invited')) {
      return res.status(409).json({
        error: 'User has already been invited to this organization',
      });
    }

    res.status(500).json({
      error: 'Failed to create invitation',
      message: error.message,
    });
  }
});

/**
 * @route GET /api/organizations/:organizationId/invitations
 * @desc List all invitations for an organization
 * @access Private (Organization owners/admins only)
 */
router.get('/:organizationId/invitations', requireBetterAuth, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const userId = req.user.id;

    // Check if user has permission to view invitations
    const permissionResult = await invitationService.hasInvitationPermission(
      organizationId,
      userId,
    );
    if (!permissionResult.ok) {
      return res.status(500).json({
        error: 'Failed to check invitation permissions',
        message: permissionResult.error,
      });
    }
    if (!permissionResult.hasPermission) {
      return res.status(403).json({
        error: 'You do not have permission to view invitations for this organization',
      });
    }

    const invitations = await invitationService.listInvitations(organizationId, userId);

    res.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    logger.error('Error listing invitations', error);
    res.status(500).json({
      error: 'Failed to retrieve invitations',
      message: error.message,
    });
  }
});

/**
 * @route DELETE /api/invitations/:invitationId
 * @desc Cancel a pending invitation
 * @access Private (Organization owners/admins only)
 */
router.delete('/invitations/:invitationId', requireBetterAuth, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    // Get invitation details to check organization permission
    const invitation = await invitationService.getInvitation(invitationId, userId);

    // Check if user has permission to cancel invitations for this organization
    const permissionResult = await invitationService.hasInvitationPermission(
      invitation.organizationId,
      userId,
    );
    if (!permissionResult.ok) {
      return res.status(500).json({
        error: 'Failed to check invitation permissions',
        message: permissionResult.error,
      });
    }
    if (!permissionResult.hasPermission) {
      return res.status(403).json({
        error: 'You do not have permission to cancel this invitation',
      });
    }

    await invitationService.cancelInvitation(invitationId, userId);

    res.json({
      success: true,
      message: 'Invitation canceled successfully',
    });
  } catch (error) {
    logger.error('Error canceling invitation', error);
    res.status(500).json({
      error: 'Failed to cancel invitation',
      message: error.message,
    });
  }
});

/**
 * @route POST /api/invitations/:invitationId/accept
 * @desc Accept an invitation to join an organization
 * @access Private (Invited user only)
 */
router.post('/invitations/:invitationId/accept', requireBetterAuth, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const result = await invitationService.acceptInvitation(invitationId, userId);

    res.json({
      success: true,
      data: result,
      message: 'Invitation accepted successfully',
    });
  } catch (error) {
    logger.error('Error accepting invitation', error);

    // Handle specific error cases
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Invitation not found or has expired',
      });
    }

    if (error.message?.includes('already accepted')) {
      return res.status(409).json({
        error: 'Invitation has already been accepted',
      });
    }

    res.status(500).json({
      error: 'Failed to accept invitation',
      message: error.message,
    });
  }
});

/**
 * @route POST /api/invitations/:invitationId/reject
 * @desc Reject an invitation to join an organization
 * @access Private (Invited user only)
 */
router.post('/invitations/:invitationId/reject', requireBetterAuth, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    await invitationService.rejectInvitation(invitationId, userId);

    res.json({
      success: true,
      message: 'Invitation rejected successfully',
    });
  } catch (error) {
    logger.error('Error rejecting invitation', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Invitation not found or has expired',
      });
    }

    res.status(500).json({
      error: 'Failed to reject invitation',
      message: error.message,
    });
  }
});

/**
 * @route GET /api/invitations/:invitationId
 * @desc Get details of a specific invitation
 * @access Private
 */
router.get('/invitations/:invitationId', requireBetterAuth, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const invitation = await invitationService.getInvitation(invitationId, userId);

    res.json({
      success: true,
      data: invitation,
    });
  } catch (error) {
    logger.error('Error getting invitation details', error);

    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Invitation not found',
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve invitation details',
      message: error.message,
    });
  }
});

/**
 * @route POST /api/invitations/:invitationId/resend
 * @desc Resend an invitation email
 * @access Private (Organization owners/admins only)
 */
router.post('/invitations/:invitationId/resend', requireBetterAuth, async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    // Get invitation details to check organization permission
    const invitation = await invitationService.getInvitation(invitationId, userId);

    // Check if user has permission to resend invitations for this organization
    const permissionResult = await invitationService.hasInvitationPermission(
      invitation.organizationId,
      userId,
    );
    if (!permissionResult.ok) {
      return res.status(500).json({
        error: 'Failed to check invitation permissions',
        message: permissionResult.error,
      });
    }
    if (!permissionResult.hasPermission) {
      return res.status(403).json({
        error: 'You do not have permission to resend this invitation',
      });
    }

    await invitationService.resendInvitation(invitationId, userId);

    res.json({
      success: true,
      message: 'Invitation resent successfully',
    });
  } catch (error) {
    logger.error('Error resending invitation', error);

    if (error.message?.includes('Cannot resend')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to resend invitation',
      message: error.message,
    });
  }
});

export default router;
