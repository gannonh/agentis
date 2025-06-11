/**
 * @file Organization schema definition
 * @description MongoDB schema for multi-tenant organization entities
 */

import { Schema, Document, type Types } from 'mongoose';

/**
 * Organization interface extending Mongoose Document
 * Represents a tenant organization in the multi-tenant architecture
 */
export interface IOrganization extends Document {
  /** Organization display name (required, max 100 chars) */
  name: string;
  /** Email domain for organization member matching (optional) */
  domain?: string;
  /** Unique subdomain for agentis.ai subdomains (required, unique) */
  subdomain: string;
  /** Reference to User who owns this organization (required) */
  accountOwnerId: Types.ObjectId;
  /** Organization-level settings */
  settings: {
    /** Whether teams can be public (default: true) */
    allowPublicTeams: boolean;
    /** Whether admin approval required for new members (default: false) */
    requireAdminApproval: boolean;
    /** Content retention period in days (default: 365) */
    contentRetentionDays: number;
  };
  /** Billing information for Stripe integration */
  billing: {
    /** Stripe customer ID */
    stripeCustomerId?: string;
    /** Subscription plan level */
    plan: 'hobby' | 'team' | 'enterprise';
    /** Billing status */
    status: 'active' | 'suspended' | 'cancelled';
  };
  /** Creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Organization settings sub-schema
 */
const OrganizationSettingsSchema = new Schema(
  {
    allowPublicTeams: {
      type: Boolean,
      default: true,
    },
    requireAdminApproval: {
      type: Boolean,
      default: false,
    },
    contentRetentionDays: {
      type: Number,
      default: 365,
      min: [1, 'Content retention must be at least 1 day'],
      max: [3650, 'Content retention cannot exceed 10 years'], // 10 years max
    },
  },
  { _id: false },
);

/**
 * Organization billing sub-schema
 */
const OrganizationBillingSchema = new Schema(
  {
    stripeCustomerId: {
      type: String,
    },
    plan: {
      type: String,
      enum: ['hobby', 'team', 'enterprise'],
      default: 'hobby',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'cancelled'],
      default: 'active',
    },
  },
  { _id: false },
);

/**
 * Organization mongoose schema
 * Defines the structure and validation rules for organization documents
 */
const Organization = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: [1, 'Organization name cannot be empty'],
      maxlength: [100, 'Organization name cannot exceed 100 characters'],
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          // Optional field, but if provided must be valid domain format
          if (!v) return true;
          return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(v);
        },
        message: 'Domain is invalid format',
      },
    },
    subdomain: {
      type: String,
      required: [true, 'Subdomain is required'],
      trim: true,
      lowercase: true,
      unique: true,
      validate: {
        validator: function (v: string) {
          // Allow alphanumeric and hyphens, but not starting/ending with hyphen
          return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(v);
        },
        message: 'Subdomain must be alphanumeric with optional hyphens (not at start/end)',
      },
    },
    accountOwnerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Account owner ID is required'],
      ref: 'User',
    },
    settings: {
      type: OrganizationSettingsSchema,
      default: () => ({}), // Creates default values from sub-schema
    },
    billing: {
      type: OrganizationBillingSchema,
      default: () => ({}), // Creates default values from sub-schema
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Create additional indexes for performance
Organization.index({ domain: 1 });
Organization.index({ accountOwnerId: 1 });
Organization.index({ 'billing.status': 1 });

export default Organization;
