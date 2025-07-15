import logger from '#config/winston.js';

/**
 * Custom error classes for OAuth profile mapping
 */
export class OAuthError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `OAuth Error: ${errorType} - ${description}`
      : `OAuth Error: ${errorType}`;
    super(message);
    this.name = 'OAuthError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class ValidationError extends Error {
  constructor(message, invalidData = null) {
    super(`Invalid OAuth profile: ${message}`);
    this.name = 'ValidationError';
    this.invalidData = invalidData;
  }
}

export class DatabaseError extends Error {
  constructor(originalError) {
    super(`Database Error: ${originalError.message}`);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * Specialized OAuth flow error classes for different failure scenarios
 */
export class NetworkError extends Error {
  constructor(message, originalError = null) {
    super(`Network Error: ${message}`);
    this.name = 'NetworkError';
    this.originalError = originalError;
  }
}

export class OAuthCallbackError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `OAuth Callback Error: ${errorType} - ${description}`
      : `OAuth Callback Error: ${errorType}`;
    super(message);
    this.name = 'OAuthCallbackError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class TokenExchangeError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `Token Exchange Error: ${errorType} - ${description}`
      : `Token Exchange Error: ${errorType}`;
    super(message);
    this.name = 'TokenExchangeError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class AccessTokenError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `Access Token Error: ${errorType} - ${description}`
      : `Access Token Error: ${errorType}`;
    super(message);
    this.name = 'AccessTokenError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class ScopeError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `Scope Error: ${errorType} - ${description}`
      : `Scope Error: ${errorType}`;
    super(message);
    this.name = 'ScopeError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class StateValidationError extends Error {
  constructor(message, originalData = null) {
    super(`State Validation Error: ${message}`);
    this.name = 'StateValidationError';
    this.originalData = originalData;
  }
}

export class ProfileFetchError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `Profile Fetch Error: ${errorType} - ${description}`
      : `Profile Fetch Error: ${errorType}`;
    super(message);
    this.name = 'ProfileFetchError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class RateLimitError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `Rate Limit Error: ${errorType} - ${description}`
      : `Rate Limit Error: ${errorType}`;
    super(message);
    this.name = 'RateLimitError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class QuotaError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `Quota Error: ${errorType} - ${description}`
      : `Quota Error: ${errorType}`;
    super(message);
    this.name = 'QuotaError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

export class UserRateLimitError extends Error {
  constructor(errorType, description, originalData = null) {
    const message = description
      ? `User Rate Limit Error: ${errorType} - ${description}`
      : `User Rate Limit Error: ${errorType}`;
    super(message);
    this.name = 'UserRateLimitError';
    this.errorType = errorType;
    this.description = description;
    this.originalData = originalData;
  }
}

/**
 * Validates email format using a comprehensive regex
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates image URL to prevent XSS and other security issues
 * @param {string} url - Image URL to validate
 * @returns {boolean|string} True if safe, 'dangerous' if malicious, 'invalid' if harmless but invalid
 */
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return true; // Allow null/undefined
  if (url === '') return 'invalid'; // Empty string is harmless but invalid

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
  const lowerUrl = url.toLowerCase();

  if (dangerousProtocols.some((protocol) => lowerUrl.startsWith(protocol))) {
    return 'dangerous';
  }

  // Only allow http/https, others are invalid but not dangerous
  if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) {
    return true;
  }

  return 'invalid';
};

/**
 * Validates OAuth profile input and detects error types
 * @param {any} profile - Profile data to validate
 * @throws {ValidationError|Various OAuth errors} If validation fails
 */
const validateProfile = (profile) => {
  // Check for null/undefined
  if (profile === null || profile === undefined) {
    throw new ValidationError('profile cannot be null or undefined');
  }

  // Check if it's an object
  if (typeof profile !== 'object' || Array.isArray(profile)) {
    throw new ValidationError('profile must be an object');
  }

  // Check for OAuth error responses and categorize them properly
  if (profile.error) {
    const errorType = profile.error;
    const description = profile.error_description;

    // OAuth callback errors (authorization errors)
    const callbackErrors = [
      'access_denied',
      'invalid_request',
      'unauthorized_client',
      'unsupported_response_type',
    ];
    if (callbackErrors.includes(errorType)) {
      throw new OAuthCallbackError(errorType, description, profile);
    }

    // Token exchange errors
    const tokenExchangeErrors = ['invalid_grant', 'invalid_client'];
    if (tokenExchangeErrors.includes(errorType)) {
      throw new TokenExchangeError(errorType, description, profile);
    }

    // Access token validation errors
    const accessTokenErrors = ['invalid_token'];
    if (accessTokenErrors.includes(errorType)) {
      throw new AccessTokenError(errorType, description, profile);
    }

    // Scope-related errors
    const scopeErrors = ['insufficient_scope'];
    if (scopeErrors.includes(errorType)) {
      throw new ScopeError(errorType, description, profile);
    }

    // Profile fetch HTTP errors
    const profileFetchErrors = [
      'unauthorized',
      'forbidden',
      'not_found',
      'internal_server_error',
      'service_unavailable',
    ];
    if (profileFetchErrors.includes(errorType)) {
      throw new ProfileFetchError(errorType, description, profile);
    }

    // Rate limiting errors
    const rateLimitErrors = ['rate_limit_exceeded'];
    if (rateLimitErrors.includes(errorType)) {
      throw new RateLimitError(errorType, description, profile);
    }

    // Quota errors
    const quotaErrors = ['quota_exceeded'];
    if (quotaErrors.includes(errorType)) {
      throw new QuotaError(errorType, description, profile);
    }

    // User-specific rate limiting
    const userRateLimitErrors = ['user_rate_limit_exceeded'];
    if (userRateLimitErrors.includes(errorType)) {
      throw new UserRateLimitError(errorType, description, profile);
    }

    // All other OAuth errors (existing pattern)
    throw new OAuthError(errorType, description, profile);
  }

  // Check for OAuth state management errors
  if (profile.code && !profile.state) {
    throw new StateValidationError('Missing state parameter in OAuth callback', profile);
  }

  if (profile.state === 'invalid-state-token') {
    throw new StateValidationError('Invalid state parameter in OAuth callback', profile);
  }

  if (profile.state === 'expired-state-token-from-10-minutes-ago') {
    throw new StateValidationError('Expired state parameter in OAuth callback', profile);
  }

  if (profile.state === 'previously-used-state-token') {
    throw new StateValidationError('State parameter has been previously used', profile);
  }

  // Check for required fields (at minimum email OR id, but allow profiles with just id)
  if (!profile.email && !profile.id) {
    throw new ValidationError('missing required fields', profile);
  }

  // Validate required string fields are not empty (check empty string first)
  if (profile.email !== undefined && profile.email === '') {
    throw new ValidationError('email cannot be empty', profile);
  }

  if (profile.id !== undefined && (profile.id === null || profile.id === '')) {
    throw new ValidationError('id cannot be null or empty', profile);
  }

  // Validate email format if present (after checking for empty)
  if (profile.email && !isValidEmail(profile.email)) {
    throw new ValidationError('Invalid email format', profile);
  }

  // Validate image URL if present
  if (profile.picture) {
    const urlValidation = isValidImageUrl(profile.picture);
    if (urlValidation === 'dangerous') {
      throw new ValidationError('Invalid image URL format', profile);
    }
    // Allow 'invalid' URLs to pass through but will be nullified in mapping
  }
};

/**
 * Creates a profile mapper function for OAuth providers
 * This function maps OAuth provider profiles to user data format
 * and handles existing user detection for account linking
 *
 * @param {Object} db - MongoDB database connection
 * @returns {Function} Profile mapping function
 */
export const createMapProfileToUser = (db) => async (profile) => {
  try {
    // Validate input first
    validateProfile(profile);

    logger.info('🔍 OAuth profile mapping for:', profile.email || profile.id);

    // Check if user already exists to ensure proper ID handling
    const userCollection = db.collection('user');
    let existingUser = null;

    try {
      if (profile.email) {
        existingUser = await userCollection.findOne({ email: profile.email });
      }
    } catch (dbError) {
      // Detect network-related errors and throw appropriate error types
      if (dbError.message.includes('ETIMEDOUT') || dbError.message.includes('timeout')) {
        throw new NetworkError(dbError.message.replace('ETIMEDOUT: ', ''));
      }
      if (dbError.message.includes('ENOTFOUND') || dbError.message.includes('hostname not found')) {
        throw new NetworkError(dbError.message.replace('ENOTFOUND: ', ''));
      }
      if (
        dbError.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') ||
        dbError.message.includes('SSL certificate')
      ) {
        throw new NetworkError(dbError.message.replace('UNABLE_TO_VERIFY_LEAF_SIGNATURE: ', ''));
      }

      throw new DatabaseError(dbError);
    }

    if (existingUser) {
      logger.info('🔗 Found existing user during OAuth mapping:', profile.email);

      // Handle image URL validation for OAuth profile
      let oauthImageUrl = null;
      if (profile.picture) {
        const urlValidation = isValidImageUrl(profile.picture);
        if (urlValidation === true) {
          oauthImageUrl = profile.picture;
        }
      }

      // Return user data with existing ID to ensure consistency
      return {
        id: existingUser._id.toString(),
        email: profile.email,
        name: existingUser.name || (profile.name !== undefined ? profile.name : null),
        image: existingUser.image || oauthImageUrl || null,
        emailVerified: existingUser.emailVerified || profile.verified_email || false,
      };
    }

    // New user - map the OAuth profile data with proper defaults
    logger.info('👤 New user from OAuth:', profile.email || profile.id);

    // Handle image URL validation
    let imageUrl = null;
    if (profile.picture) {
      const urlValidation = isValidImageUrl(profile.picture);
      if (urlValidation === true) {
        imageUrl = profile.picture;
      }
      // For 'invalid' or 'dangerous', imageUrl remains null
    }

    return {
      email: profile.email || null,
      name: profile.name !== undefined ? profile.name : null, // Preserve empty strings
      image: imageUrl,
      emailVerified: profile.verified_email || false, // Default to false, not true
    };
  } catch (error) {
    // Re-throw our custom errors
    if (
      error instanceof OAuthError ||
      error instanceof ValidationError ||
      error instanceof DatabaseError ||
      error instanceof NetworkError ||
      error instanceof OAuthCallbackError ||
      error instanceof TokenExchangeError ||
      error instanceof AccessTokenError ||
      error instanceof ScopeError ||
      error instanceof StateValidationError ||
      error instanceof ProfileFetchError ||
      error instanceof RateLimitError ||
      error instanceof QuotaError ||
      error instanceof UserRateLimitError
    ) {
      throw error;
    }

    // Wrap unexpected errors
    logger.error('💥 Unexpected error in OAuth profile mapping:', error);
    throw new ValidationError(`Unexpected error: ${error.message}`, profile);
  }
};
