/**
 * @fileoverview Admin routes for organization management
 * @module server/routes/adminOrganizations
 */

import express from 'express';
import mongoose from 'mongoose';
import { requireBetterAuth, checkAdmin } from '#server/middleware/index.js';
import { logger } from '#config/index.js';

/**
 * Escapes special regex characters to prevent ReDoS attacks
 * @param {string} string - The string to escape
 * @returns {string} - The escaped string safe for regex use
 */
function escapeRegex(string) {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const router = express.Router();

/**
 * Allowed organization member roles
 */
const ALLOWED_ROLES = ['admin', 'member', 'owner'];

/**
 * Validates if a role is allowed
 * @param {string} role - The role to validate
 * @returns {boolean} - True if role is valid, false otherwise
 */
function isValidRole(role) {
  return typeof role === 'string' && ALLOWED_ROLES.includes(role);
}

/**
 * GET /api/admin/organizations
 * List all organizations with member counts
 */
router.get('/', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    // Validate and sanitize page parameter
    const pageNum = Math.max(1, parseInt(page, 10) || 1);

    // Validate and sanitize limit parameter
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const skip = (pageNum - 1) * limitNum;

    const db = mongoose.connection.db;
    const organizationCollection = db.collection('organization');
    const memberCollection = db.collection('member');

    // Build search query
    let query = { deletedAt: { $exists: false } }; // Exclude soft-deleted organizations
    if (search) {
      const escapedSearch = escapeRegex(search);
      query = {
        deletedAt: { $exists: false },
        $or: [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { slug: { $regex: escapedSearch, $options: 'i' } },
          { metadata: { $regex: escapedSearch, $options: 'i' } },
        ],
      };
    }

    // Get organizations
    const organizations = await organizationCollection
      .find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .toArray();

    // Get total count for pagination
    const totalCount = await organizationCollection.countDocuments(query);

    // Get member counts for each organization
    const organizationsWithCounts = await Promise.all(
      organizations.map(async (org) => {
        const memberCount = await memberCollection.countDocuments({
          organizationId: org._id.toString(),
        });

        // Parse metadata if it's a string
        let metadata = {};
        try {
          metadata =
            typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata || {};
        } catch (e) {
          logger.warn('Failed to parse organization metadata', {
            orgId: org._id,
            error: e.message,
          });
        }

        return {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          domain: metadata.domain || null,
          memberCount,
          createdAt: org.createdAt,
        };
      }),
    );

    // Return paginated response
    if (req.query.page) {
      res.json({
        organizations: organizationsWithCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } else {
      // Return simple array for backward compatibility
      res.json(organizationsWithCounts);
    }
  } catch (error) {
    logger.error('Failed to list organizations', error);
    res.status(500).json({ error: 'Failed to list organizations' });
  }
});

/**
 * GET /api/admin/organizations/:id
 * Get organization details with members
 */
router.get('/:id', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const db = mongoose.connection.db;
    const organizationCollection = db.collection('organization');
    const memberCollection = db.collection('member');
    const userCollection = db.collection('user');

    // Get organization
    let organizationId;
    try {
      organizationId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      logger.warn('Invalid organization ID format', { id, error: error.message });
      return res.status(400).json({ error: 'Invalid organization ID format' });
    }

    const organization = await organizationCollection.findOne({
      _id: organizationId,
      deletedAt: { $exists: false }, // Exclude soft-deleted organizations
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get members with user details
    const members = await memberCollection.find({ organizationId: id }).toArray();

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const user = await userCollection.findOne({
          _id: member.userId,
        });

        return {
          id: member._id.toString(),
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt,
          user: user
            ? {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                image: user.image,
              }
            : null,
        };
      }),
    );

    // Parse metadata
    let metadata = {};
    try {
      metadata =
        typeof organization.metadata === 'string'
          ? JSON.parse(organization.metadata)
          : organization.metadata || {};
    } catch (e) {
      logger.warn('Failed to parse organization metadata', { orgId: id, error: e.message });
    }

    res.json({
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
      domain: metadata.domain || null,
      memberCount: members.length,
      createdAt: organization.createdAt,
      members: membersWithDetails.filter((m) => m.user !== null), // Only return members with valid users
      metadata,
    });
  } catch (error) {
    logger.error('Failed to get organization details', error);
    res.status(500).json({ error: 'Failed to get organization details' });
  }
});

/**
 * POST /api/admin/organizations
 * Create a new organization
 */
router.post('/', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { name, slug, domain } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return res
        .status(400)
        .json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }

    const db = mongoose.connection.db;
    const organizationCollection = db.collection('organization');

    // Check if slug already exists (excluding soft-deleted organizations)
    const existingOrg = await organizationCollection.findOne({
      slug,
      deletedAt: { $exists: false },
    });
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization with this slug already exists' });
    }

    // Create organization
    const newOrg = {
      _id: new mongoose.Types.ObjectId(),
      name,
      slug,
      metadata: JSON.stringify({
        domain: domain || null,
        createdByAdmin: true,
        createdBy: req.user.id,
      }),
      createdAt: new Date(),
    };

    await organizationCollection.insertOne(newOrg);

    logger.info('Admin created organization', {
      adminId: req.user.id,
      organizationId: newOrg._id.toString(),
      name,
      slug,
    });

    res.status(201).json({
      id: newOrg._id.toString(),
      name: newOrg.name,
      slug: newOrg.slug,
      domain: domain || null,
      memberCount: 0,
      createdAt: newOrg.createdAt,
    });
  } catch (error) {
    logger.error('Failed to create organization', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * PATCH /api/admin/organizations/:id
 * Update organization details
 */
router.patch('/:id', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, domain } = req.body;

    const db = mongoose.connection.db;
    const organizationCollection = db.collection('organization');

    // Validate and convert organization ID
    let organizationId;
    try {
      organizationId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      logger.warn('Invalid organization ID format', { id, error: error.message });
      return res.status(400).json({ error: 'Invalid organization ID format' });
    }

    const organization = await organizationCollection.findOne({
      _id: organizationId,
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if new slug conflicts (excluding soft-deleted organizations)
    if (slug && slug !== organization.slug) {
      const existingOrg = await organizationCollection.findOne({
        slug,
        deletedAt: { $exists: false },
      });
      if (existingOrg) {
        return res.status(400).json({ error: 'Organization with this slug already exists' });
      }
    }

    // Parse existing metadata
    let metadata = {};
    try {
      metadata =
        typeof organization.metadata === 'string'
          ? JSON.parse(organization.metadata)
          : organization.metadata || {};
    } catch (e) {
      logger.warn('Failed to parse organization metadata', { orgId: id, error: e.message });
    }

    // Update fields
    const updateData = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (domain !== undefined) {
      metadata.domain = domain;
      updateData.metadata = JSON.stringify(metadata);
    }

    await organizationCollection.updateOne({ _id: organizationId }, { $set: updateData });

    logger.info('Admin updated organization', {
      adminId: req.user.id,
      organizationId: id,
      updatedFields: Object.keys(updateData),
    });

    res.json({
      id,
      name: name || organization.name,
      slug: slug || organization.slug,
      domain: domain !== undefined ? domain : metadata.domain,
    });
  } catch (error) {
    logger.error('Failed to update organization', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

/**
 * DELETE /api/admin/organizations/:id
 * Delete an organization (soft delete)
 */
router.delete('/:id', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const db = mongoose.connection.db;
    const organizationCollection = db.collection('organization');
    const memberCollection = db.collection('member');

    // Validate and convert organization ID
    let organizationId;
    try {
      organizationId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      logger.warn('Invalid organization ID format', { id, error: error.message });
      return res.status(400).json({ error: 'Invalid organization ID format' });
    }

    const organization = await organizationCollection.findOne({
      _id: organizationId,
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check member count
    const memberCount = await memberCollection.countDocuments({
      organizationId: id,
    });

    if (memberCount > 0 && !req.query.force) {
      return res.status(400).json({
        error: 'Organization has members. Use force=true to delete anyway.',
        memberCount,
      });
    }

    // Soft delete by adding deletedAt timestamp
    await organizationCollection.updateOne(
      { _id: organizationId },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: req.user.id,
        },
      },
    );

    logger.info('Admin deleted organization', {
      adminId: req.user.id,
      organizationId: id,
      name: organization.name,
      memberCount,
    });

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete organization', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

/**
 * POST /api/admin/organizations/:id/members
 * Add a member to an organization
 */
router.post('/:id/members', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        error: `Invalid role. Allowed roles are: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    const db = mongoose.connection.db;
    const organizationCollection = db.collection('organization');
    const memberCollection = db.collection('member');
    const userCollection = db.collection('user');

    // Check if organization exists
    let addMemberOrgId;
    try {
      addMemberOrgId = new mongoose.Types.ObjectId(id);
    } catch (error) {
      logger.warn('Invalid organization ID format', { id, error: error.message });
      return res.status(400).json({ error: 'Invalid organization ID format' });
    }

    const organization = await organizationCollection.findOne({
      _id: addMemberOrgId,
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if user exists
    const user = await userCollection.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = await memberCollection.findOne({
      userId,
      organizationId: id,
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this organization' });
    }

    // Add member
    const newMember = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      organizationId: id,
      role,
      createdAt: new Date(),
    };

    await memberCollection.insertOne(newMember);

    logger.info('Admin added member to organization', {
      adminId: req.user.id,
      organizationId: id,
      userId,
      role,
    });

    res.status(201).json({
      id: newMember._id.toString(),
      userId,
      role,
      createdAt: newMember.createdAt,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    logger.error('Failed to add member to organization', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

/**
 * PATCH /api/admin/organizations/:id/members/:userId
 * Update member role
 */
router.patch('/:id/members/:userId', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        error: `Invalid role. Allowed roles are: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    const db = mongoose.connection.db;
    const memberCollection = db.collection('member');

    // Update member role
    const result = await memberCollection.updateOne(
      { userId, organizationId: id },
      { $set: { role } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Member not found in organization' });
    }

    logger.info('Admin updated member role', {
      adminId: req.user.id,
      organizationId: id,
      userId,
      role,
    });

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    logger.error('Failed to update member role', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

/**
 * DELETE /api/admin/organizations/:id/members/:userId
 * Remove member from organization
 */
router.delete('/:id/members/:userId', requireBetterAuth, checkAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const db = mongoose.connection.db;
    const memberCollection = db.collection('member');

    // Remove member
    const result = await memberCollection.deleteOne({
      userId,
      organizationId: id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Member not found in organization' });
    }

    logger.info('Admin removed member from organization', {
      adminId: req.user.id,
      organizationId: id,
      userId,
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    logger.error('Failed to remove member from organization', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
