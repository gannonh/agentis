/**
 * @fileoverview Auth event logging helpers
 * Provides consistent formatting for auth events using existing winston logger
 */

import { logger } from '#config/index.js';

/**
 * Auth event logging helpers for consistent formatting
 */
export const authEvents = {
  /**
   * Log user login attempt
   */
  userLogin: (userId, method = 'unknown', metadata = {}) => {
    logger.info('🔐 User login', {
      userId,
      method,
      action: 'login',
      ...metadata,
    });
  },

  /**
   * Log user logout
   */
  userLogout: (userId, metadata = {}) => {
    logger.info('🔓 User logout', {
      userId,
      action: 'logout',
      ...metadata,
    });
  },

  /**
   * Log organization assignment
   */
  organizationAssigned: (userId, organizationId, role = 'member', metadata = {}) => {
    logger.info('🏢 Organization assigned', {
      userId,
      organizationId,
      role,
      action: 'org-assigned',
      ...metadata,
    });
  },

  /**
   * Log authentication failure
   */
  authFailure: (reason, metadata = {}) => {
    logger.warn('❌ Authentication failed', {
      reason,
      action: 'auth-failed',
      ...metadata,
    });
  },

  /**
   * Log session refresh
   */
  sessionRefresh: (userId, metadata = {}) => {
    logger.debug('🔄 Session refreshed', {
      userId,
      action: 'session-refresh',
      ...metadata,
    });
  },
};
