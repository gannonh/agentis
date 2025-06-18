/**
 * @fileoverview Better Auth client configuration for React frontend
 * @module config/betterAuth
 */

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';
import { adminClient } from 'better-auth/client/plugins';

/**
 * Better Auth client configuration
 * Connects to the backend Better Auth server with organization and admin support
 */
const baseURL = import.meta.env.VITE_API_HOST || 'http://localhost:3080';

/**
 * Better Auth React client instance
 * Configured for organization support, admin functionality, and Google OAuth
 */
export const authClient = createAuthClient({
  baseURL: baseURL,
  basePath: '/api/auth',
  plugins: [organizationClient(), adminClient()],
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
  description?: string;
  website?: string;
  metadata?: {
    domain: string;
    autoCreated: boolean;
    createdFromEmail: string;
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
