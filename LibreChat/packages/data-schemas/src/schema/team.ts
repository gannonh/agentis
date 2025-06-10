/**
 * @file Team schema definition
 * @description MongoDB schema for team entities within organizations
 */

import { Schema, Document, type Types } from 'mongoose';

/**
 * Team interface extending Mongoose Document
 * Represents a team within an organization in the multi-tenant architecture
 */
export interface ITeam extends Document {
  /** Reference to Organization this team belongs to (required) */
  organizationId: Types.ObjectId;
  /** Team display name (required, max 50 chars) */
  name: string;
  /** Team description (optional, max 500 chars) */
  description?: string;
  /** Reference to User who owns this team (required) */
  ownerId: Types.ObjectId;
  /** Whether team is publicly visible (default: false) */
  isPublic: boolean;
  /** Array of User IDs who are team members */
  memberIds: Array<Types.ObjectId>;
  /** Array of User IDs who are team admins (subset of memberIds) */
  adminIds: Array<Types.ObjectId>;
  /** Team-level settings */
  settings: {
    /** Whether members can invite others (default: true) */
    allowMemberInvites: boolean;
    /** Whether admin approval required for new members (default: false) */
    requireAdminApproval: boolean;
  };
  /** Creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Team settings sub-schema
 */
const TeamSettingsSchema = new Schema(
  {
    allowMemberInvites: {
      type: Boolean,
      default: true,
    },
    requireAdminApproval: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

/**
 * Team mongoose schema
 * Defines the structure and validation rules for team documents
 */
const Team = new Schema<ITeam>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Organization ID is required'],
      ref: 'Organization',
    },
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [1, 'Team name cannot be empty'],
      maxlength: [50, 'Team name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Team description cannot exceed 500 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Owner ID is required'],
      ref: 'User',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    memberIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    adminIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    settings: {
      type: TeamSettingsSchema,
      default: () => ({}), // Creates default values from sub-schema
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Create indexes for performance
Team.index({ organizationId: 1 });
Team.index({ organizationId: 1, name: 1 }, { unique: true }); // Unique team names per organization
Team.index({ ownerId: 1 });
Team.index({ memberIds: 1 });
Team.index({ isPublic: 1 });

export default Team;