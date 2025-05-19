/**
 * Authentication utilities for the Arcade client
 */
import type { ArcadeAuthResponse } from '../types';

/**
 * Checks if an auth response indicates a completed status
 *
 * @param response - Auth response from the API
 * @returns True if auth is completed
 */
export const isAuthCompleted = (response: ArcadeAuthResponse): boolean => {
  return response.status === 'completed';
};

/**
 * Checks if an auth response indicates a pending status
 *
 * @param response - Auth response from the API
 * @returns True if auth is pending
 */
export const isAuthPending = (response: ArcadeAuthResponse): boolean => {
  return response.status === 'pending';
};

/**
 * Checks if an auth response indicates a failed status
 *
 * @param response - Auth response from the API
 * @returns True if auth has failed
 */
export const isAuthFailed = (response: ArcadeAuthResponse): boolean => {
  return response.status === 'failed';
};

/**
 * Helper to create a callback URL for authentication
 *
 * @param baseUrl - Base callback URL
 * @param authId - Authorization ID
 * @param toolkitId - Toolkit ID
 * @returns Complete callback URL
 */
export const createCallbackUrl = (baseUrl: string, authId: string, toolkitId: string): string => {
  const url = new URL(baseUrl);
  url.searchParams.append('auth_id', authId);
  url.searchParams.append('toolkit', toolkitId);
  return url.toString();
};
