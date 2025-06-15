/**
 * @fileoverview Validation schemas for user registration and authentication
 * @module utils/validators
 */

import { z } from 'zod';

/**
 * Schema for user registration validation
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
  username: z.string().min(1, 'Username is required').optional(),
});

/**
 * Schema for password reset validation
 */
export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Schema for login validation
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});