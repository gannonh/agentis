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
  
  if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
    return 'dangerous';
  }
  
  // Only allow http/https, others are invalid but not dangerous
  if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) {
    return true;
  }
  
  return 'invalid';
};

/**
 * Validates OAuth profile input
 * @param {any} profile - Profile data to validate
 * @throws {ValidationError} If validation fails
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
  
  // Check for OAuth error responses
  if (profile.error) {
    throw new OAuthError(profile.error, profile.error_description, profile);
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
    if (error instanceof OAuthError || error instanceof ValidationError || error instanceof DatabaseError) {
      throw error;
    }
    
    // Wrap unexpected errors
    logger.error('💥 Unexpected error in OAuth profile mapping:', error);
    throw new ValidationError(`Unexpected error: ${error.message}`, profile);
  }
};