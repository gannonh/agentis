/**
 * @fileoverview Better Auth client configuration for React frontend
 * @module config/betterAuth
 *
 * This module provides a comprehensive Better Auth client setup with:
 * - Organization management capabilities
 * - Admin functionality for platform management
 * - TypeScript type definitions for all auth-related interfaces
 * - Helper functions for common auth operations
 */

import { createAuthClient } from 'better-auth/react';
import {
  organizationClient,
  adminClient,
  magicLinkClient,
  usernameClient,
} from 'better-auth/client/plugins';

/**
 * Base URL for the Better Auth backend server
 * Uses VITE_API_HOST environment variable or defaults to localhost
 */
const baseURL = import.meta.env.VITE_API_HOST || 'http://localhost:3080';

/**
 * Better Auth React client instance
 * Configured with organization, admin, and magic link plugins for modern authentication
 *
 * Features:
 * - Magic link passwordless authentication
 * - Google OAuth integration
 * - Organization membership management
 * - Role-based access control
 * - Admin platform management
 */
export const authClient = createAuthClient({
  baseURL,
  basePath: '/api/auth',
  plugins: [organizationClient(), adminClient(), magicLinkClient(), usernameClient()],
});

/**
 * Export types for TypeScript support
 */
export type AuthClient = typeof authClient;
export type Session = Awaited<ReturnType<typeof authClient.getSession>>;
export type User = NonNullable<Session>['user'];
export type Organization = NonNullable<Session>['activeOrganization'];

/**
 * Auth error types for better error handling
 */
export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}

/**
 * Sign in/up form data interface
 */
export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
}

/**
 * Organization member interface based on Better-auth organization plugin
 */
export interface OrganizationMember {
  id: string;
  role: UserRole;
  userId: string;
  organizationId: string;
  createdAt: Date | string;
  user: {
    id?: string;
    name: string;
    email: string;
    image?: string;
    emailVerified?: boolean;
  };
}

/**
 * Organization data interface
 */
export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: {
    domain: string;
    autoCreated: boolean;
    createdFromEmail: string;
    description?: string;
    website?: string;
  };
  createdAt: Date;
}

/**
 * Organization invitation interface
 */
export interface OrganizationInvitation {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'rejected';
  organizationId: string;
  inviterId: string;
  expiresAt: Date;
  createdAt?: Date;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  inviter?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * User role within organization
 */
export type UserRole = 'owner' | 'member' | 'admin';

/**
 * Admin role types for platform administration
 */
export type AdminRole = 'admin' | 'user';

/**
 * Enhanced user interface with organization context
 */
export interface UserWithOrganization extends User {
  role?: AdminRole;
  organizationId?: string;
  organizationRole?: UserRole;
}

/**
 * Admin user interface for user management
 */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: AdminRole;
  banned?: boolean | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

/**
 * Admin session interface for session management
 */
export interface AdminSession {
  id: string;
  userId: string;
  expiresAt?: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create user data interface for admin user creation
 */
export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role?: AdminRole;
  emailVerified?: boolean;
  data?: Record<string, any>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guards for role checking
 */
export const roleCheckers = {
  /**
   * Check if user has organization owner role
   */
  isOwner: (role: UserRole): role is 'owner' => role === 'owner',

  /**
   * Check if user has organization admin role
   */
  isOrgAdmin: (role: UserRole): role is 'admin' => role === 'admin',

  /**
   * Check if user has organization member role
   */
  isMember: (role: UserRole): role is 'member' => role === 'member',

  /**
   * Check if user has platform admin role
   */
  isPlatformAdmin: (role: AdminRole): role is 'admin' => role === 'admin',

  /**
   * Check if user can manage organization (owner or admin)
   */
  canManageOrganization: (role: UserRole): boolean => role === 'owner' || role === 'admin',

  /**
   * Check if user can invite members (owner or admin)
   */
  canInviteMembers: (role: UserRole): boolean => role === 'owner' || role === 'admin',

  /**
   * Check if user can manage members (owner only)
   */
  canManageMembers: (role: UserRole): boolean => role === 'owner',
} as const;

/**
 * Auth utility functions
 */
export const authUtils = {
  /**
   * Get display name for user role
   */
  getRoleDisplayName: (role: UserRole): string => {
    const roleNames: Record<UserRole, string> = {
      owner: 'Owner',
      admin: 'Admin',
      member: 'Member',
    };
    return roleNames[role];
  },

  /**
   * Get user's initials for avatar display
   */
  getUserInitials: (name: string): string => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  },

  /**
   * Check if email belongs to a specific domain
   */
  getEmailDomain: (email: string): string => {
    return email.split('@')[1]?.toLowerCase() || '';
  },

  /**
   * Generate organization slug from name
   */
  generateSlug: (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Check if invitation is expired
   */
  isInvitationExpired: (expiresAt: Date): boolean => {
    return new Date() > new Date(expiresAt);
  },
} as const;

/**
 * Constants for auth configuration
 */
export const AUTH_CONSTANTS = {
  /**
   * Default session timeout (in milliseconds)
   */
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours

  /**
   * Invitation expiry time (in milliseconds)
   */
  INVITATION_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days

  /**
   * Maximum organization name length
   */
  MAX_ORG_NAME_LENGTH: 50,

  /**
   * Maximum user name length
   */
  MAX_USER_NAME_LENGTH: 100,

  /**
   * Minimum password length
   */
  MIN_PASSWORD_LENGTH: 8,

  /**
   * Valid user roles
   */
  USER_ROLES: ['owner', 'admin', 'member'] as const,

  /**
   * Valid admin roles
   */
  ADMIN_ROLES: ['admin', 'user'] as const,
} as const;
