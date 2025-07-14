/**
 * @fileoverview Tests for OAuth data integration with Better Auth system
 * @module auth.oauth.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger first for hoisting
vi.mock('#config/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('#config/winston.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import the actual mapProfileToUser function from the utility module
import { createMapProfileToUser } from '#utils/oauthProfileMapper.js';

// Mock database collections
const mockUserCollection = {
  findOne: vi.fn(),
};

const mockDb = {
  collection: vi.fn(() => mockUserCollection),
};

// Access the mocked logger for test assertions
const mockLogger = (await vi.importMock('#config/winston.js')).default;

describe('OAuth Profile Mapping Integration', () => {
  let mapProfileToUser;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.collection.mockReturnValue(mockUserCollection);
    mapProfileToUser = createMapProfileToUser(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Google OAuth Profile Mapping', () => {
    it('should map complete Google OAuth profile for new user', async () => {
      const googleProfile = {
        id: 'google-user-123',
        email: 'user@gmail.com',
        name: 'John Doe',
        picture: 'https://lh3.googleusercontent.com/a/avatar.jpg',
        given_name: 'John',
        family_name: 'Doe',
        locale: 'en',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(null); // New user

      const result = await mapProfileToUser(googleProfile);

      expect(result).toEqual({
        email: 'user@gmail.com',
        name: 'John Doe',
        image: 'https://lh3.googleusercontent.com/a/avatar.jpg',
        emailVerified: true,
      });

      expect(mockUserCollection.findOne).toHaveBeenCalledWith({
        email: 'user@gmail.com',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('👤 New user from OAuth:', 'user@gmail.com');
    });

    it('should handle Google OAuth profile with missing avatar', async () => {
      const googleProfile = {
        id: 'google-user-456',
        email: 'noavatar@gmail.com',
        name: 'Jane Smith',
        picture: null, // No avatar provided
        given_name: 'Jane',
        family_name: 'Smith',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(null);

      const result = await mapProfileToUser(googleProfile);

      expect(result).toEqual({
        email: 'noavatar@gmail.com',
        name: 'Jane Smith',
        image: null,
        emailVerified: true,
      });
    });

    it('should handle Google OAuth profile with missing name', async () => {
      const googleProfile = {
        id: 'google-user-789',
        email: 'noname@gmail.com',
        name: undefined, // No name provided
        picture: 'https://lh3.googleusercontent.com/a/default.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(null);

      const result = await mapProfileToUser(googleProfile);

      expect(result).toEqual({
        email: 'noname@gmail.com',
        name: null,
        image: 'https://lh3.googleusercontent.com/a/default.jpg',
        emailVerified: true, // profile has verified_email: true
      });
    });

    it('should map profile for existing user with ID preservation', async () => {
      const existingUser = {
        _id: { toString: () => 'existing-user-id-123' },
        email: 'existing@gmail.com',
        name: 'Existing User',
        image: 'https://example.com/old-avatar.jpg',
        emailVerified: true,
      };

      const googleProfile = {
        id: 'google-user-999',
        email: 'existing@gmail.com',
        name: 'Updated Name',
        picture: 'https://lh3.googleusercontent.com/a/new-avatar.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(existingUser);

      const result = await mapProfileToUser(googleProfile);

      expect(result).toEqual({
        id: 'existing-user-id-123',
        email: 'existing@gmail.com',
        name: 'Existing User', // Keeps existing name
        image: 'https://example.com/old-avatar.jpg', // Keeps existing image
        emailVerified: true,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔗 Found existing user during OAuth mapping:',
        'existing@gmail.com',
      );
    });

    it('should prefer OAuth data when existing user has incomplete profile', async () => {
      const existingUser = {
        _id: { toString: () => 'incomplete-user-456' },
        email: 'incomplete@gmail.com',
        name: null, // Missing name
        image: null, // Missing image
        emailVerified: false,
      };

      const googleProfile = {
        id: 'google-complete-user',
        email: 'incomplete@gmail.com',
        name: 'Complete Name',
        picture: 'https://lh3.googleusercontent.com/a/complete-avatar.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(existingUser);

      const result = await mapProfileToUser(googleProfile);

      expect(result).toEqual({
        id: 'incomplete-user-456',
        email: 'incomplete@gmail.com',
        name: 'Complete Name', // Uses OAuth name since existing is null
        image: 'https://lh3.googleusercontent.com/a/complete-avatar.jpg', // Uses OAuth image since existing is null
        emailVerified: true, // Uses OAuth verified status
      });
    });
  });

  describe('OAuth Avatar URL Validation', () => {
    it('should handle various Google avatar URL formats', async () => {
      const avatarVariants = [
        'https://lh3.googleusercontent.com/a/default-user=s96-c',
        'https://lh3.googleusercontent.com/a/ACg8ocI123456789=s96-c',
        'https://lh6.googleusercontent.com/-AbCdEfGhIjK/AAAAAAAAAAI/AAAAAAAAAAA/1234567890/photo.jpg',
        'https://lh4.googleusercontent.com/photo.jpg?sz=50',
      ];

      mockUserCollection.findOne.mockResolvedValue(null);

      for (const avatarUrl of avatarVariants) {
        const profile = {
          id: 'test-user',
          email: 'test@gmail.com',
          name: 'Test User',
          picture: avatarUrl,
          verified_email: true,
        };

        const result = await mapProfileToUser(profile);

        expect(result.image).toBe(avatarUrl);
        expect(typeof result.image).toBe('string');
      }
    });

    it('should handle invalid or malformed avatar URLs securely', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")', // Potential XSS
        'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KCd4c3MnKTwvc2NyaXB0Pjwvc3ZnPg==', // Data URL with script
      ];

      mockUserCollection.findOne.mockResolvedValue(null);

      for (const maliciousUrl of maliciousUrls) {
        const profile = {
          id: 'test-user',
          email: 'test@gmail.com',
          name: 'Test User',
          picture: maliciousUrl,
          verified_email: true,
        };

        // Should throw validation error for dangerous URLs
        await expect(mapProfileToUser(profile)).rejects.toThrow('Invalid image URL format');
      }
    });

    it('should handle harmless malformed URLs gracefully', async () => {
      const harmlessInvalidUrls = [
        '', // Empty string
        'not-a-url', // Invalid format but not dangerous
      ];

      mockUserCollection.findOne.mockResolvedValue(null);

      for (const invalidUrl of harmlessInvalidUrls) {
        const profile = {
          id: 'test-user',
          email: 'test@gmail.com',
          name: 'Test User',
          picture: invalidUrl,
          verified_email: true,
        };

        const result = await mapProfileToUser(profile);

        // Should return null for harmless invalid URLs
        expect(result.image).toBeNull();
      }
    });
  });

  describe('OAuth Data Edge Cases', () => {
    it('should handle profile with special characters in name', async () => {
      const profile = {
        id: 'special-user',
        email: 'special@gmail.com',
        name: "José María O'Connor-Smith", // Special characters
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(null);

      const result = await mapProfileToUser(profile);

      expect(result.name).toBe("José María O'Connor-Smith");
      expect(result.email).toBe('special@gmail.com');
    });

    it('should handle profile with very long name', async () => {
      const longName = 'A'.repeat(200); // Very long name
      const profile = {
        id: 'long-name-user',
        email: 'longname@gmail.com',
        name: longName,
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(null);

      const result = await mapProfileToUser(profile);

      expect(result.name).toBe(longName);
      expect(result.name.length).toBe(200);
    });

    it('should handle email address edge cases', async () => {
      const edgeCaseEmails = [
        'user+tag@gmail.com', // Plus addressing
        'user.name@gmail.com', // Dots in username
        'user-name@sub.domain.com', // Subdomain
        'email@xn--nxasmq6b.xn--j6w193g', // Internationalized domain
      ];

      mockUserCollection.findOne.mockResolvedValue(null);

      for (const email of edgeCaseEmails) {
        const profile = {
          id: 'edge-case-user',
          email,
          name: 'Edge Case User',
          picture: 'https://lh3.googleusercontent.com/avatar.jpg',
          verified_email: true,
        };

        const result = await mapProfileToUser(profile);

        expect(result.email).toBe(email);
        expect(mockUserCollection.findOne).toHaveBeenCalledWith({ email });
      }
    });
  });

  describe('OAuth Error Handling', () => {
    it('should handle database errors during user lookup', async () => {
      const profile = {
        id: 'db-error-user',
        email: 'dberror@gmail.com',
        name: 'DB Error User',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Should throw the database error
      await expect(mapProfileToUser(profile)).rejects.toThrow('Database connection failed');
    });

    it('should handle malformed existing user data', async () => {
      const malformedUser = {
        _id: null, // Malformed ID
        email: 'malformed@gmail.com',
        name: 'Malformed User',
      };

      const profile = {
        id: 'malformed-test',
        email: 'malformed@gmail.com',
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(malformedUser);

      // Should throw error when trying to convert null _id to string
      await expect(mapProfileToUser(profile)).rejects.toThrow();
    });

    it('should handle missing required OAuth profile data', async () => {
      const incompleteProfile = {
        id: 'incomplete-oauth',
        // missing email
        name: 'Incomplete User',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(null);

      const result = await mapProfileToUser(incompleteProfile);

      expect(result.email).toBeNull();
      expect(result.name).toBe('Incomplete User');
      expect(result.image).toBe('https://lh3.googleusercontent.com/avatar.jpg');
    });
  });

  describe('OAuth Provider Compatibility', () => {
    it('should handle different OAuth provider profile structures', async () => {
      // Simulate different provider profile formats
      const providers = [
        {
          name: 'Google',
          profile: {
            id: 'google-123',
            email: 'google@example.com',
            name: 'Google User',
            picture: 'https://lh3.googleusercontent.com/avatar.jpg',
            verified_email: true,
          },
        },
        {
          name: 'GitHub', // If we add GitHub support later
          profile: {
            id: 'github-456',
            email: 'github@example.com',
            name: 'GitHub User',
            picture: 'https://avatars.githubusercontent.com/u/123456?v=4', // GitHub format
            verified_email: true,
          },
        },
      ];

      mockUserCollection.findOne.mockResolvedValue(null);

      for (const provider of providers) {
        vi.clearAllMocks();
        const result = await mapProfileToUser(provider.profile);

        expect(result.email).toBe(provider.profile.email);
        expect(result.name).toBe(provider.profile.name);
        expect(result.image).toBe(provider.profile.picture);
        expect(result.emailVerified).toBe(true);
      }
    });
  });

  describe('OAuth Flow Error Scenarios - TDD Requirements', () => {
    describe('OAuth Provider Error Responses', () => {
      it('should throw OAuthError for access_denied with proper error details', async () => {
        const errorResponse = {
          error: 'access_denied',
          error_description: 'The user denied the request',
          state: 'random-state-value',
        };

        await expect(mapProfileToUser(errorResponse)).rejects.toThrow('OAuth Error: access_denied - The user denied the request');
      });

      it('should throw OAuthError for invalid_token scenarios', async () => {
        const invalidTokenResponse = {
          error: 'invalid_token',
          error_description: 'The access token provided is expired, revoked, malformed, or invalid',
        };

        await expect(mapProfileToUser(invalidTokenResponse)).rejects.toThrow('OAuth Error: invalid_token');
      });

      it('should throw OAuthError for server_error with provider details', async () => {
        const serverErrorResponse = {
          error: 'server_error',
          error_description: 'Internal server error occurred during authentication',
          error_uri: 'https://provider.com/error-docs',
        };

        await expect(mapProfileToUser(serverErrorResponse)).rejects.toThrow('OAuth Error: server_error');
      });

      it('should throw OAuthError for rate limiting with retry information', async () => {
        const rateLimitResponse = {
          error: 'rate_limit_exceeded',
          error_description: 'Too many requests, please try again later',
          retry_after: 3600,
        };

        await expect(mapProfileToUser(rateLimitResponse)).rejects.toThrow('OAuth Error: rate_limit_exceeded');
      });

      it('should throw OAuthError for insufficient scope permissions', async () => {
        const scopeErrorResponse = {
          error: 'insufficient_scope',
          error_description: 'The request requires higher privileges than provided by the access token',
          scope: 'email profile',
        };

        await expect(mapProfileToUser(scopeErrorResponse)).rejects.toThrow('OAuth Error: insufficient_scope');
      });

      it('should throw OAuthError for provider maintenance mode', async () => {
        const maintenanceResponse = {
          error: 'temporarily_unavailable',
          error_description: 'The authorization server is currently unable to handle the request due to maintenance',
          maintenance_mode: true,
        };

        await expect(mapProfileToUser(maintenanceResponse)).rejects.toThrow('OAuth Error: temporarily_unavailable');
      });
    });

    describe('Input Validation', () => {
      it('should throw ValidationError for null input', async () => {
        await expect(mapProfileToUser(null)).rejects.toThrow('Invalid OAuth profile: profile cannot be null or undefined');
      });

      it('should throw ValidationError for undefined input', async () => {
        await expect(mapProfileToUser(undefined)).rejects.toThrow('Invalid OAuth profile: profile cannot be null or undefined');
      });

      it('should throw ValidationError for non-object input', async () => {
        const invalidInputs = ['string', 123, [], true];

        for (const input of invalidInputs) {
          await expect(mapProfileToUser(input)).rejects.toThrow('Invalid OAuth profile: profile must be an object');
        }
      });

      it('should throw ValidationError for empty object', async () => {
        await expect(mapProfileToUser({})).rejects.toThrow('Invalid OAuth profile: missing required fields');
      });

      it('should throw ValidationError for profile missing critical data', async () => {
        const incompleteProfiles = [
          { name: 'Test User' },             // Missing id and email
          { picture: 'http://test.com' },    // Missing id and email
        ];

        for (const profile of incompleteProfiles) {
          mockUserCollection.findOne.mockResolvedValue(null);
          await expect(mapProfileToUser(profile)).rejects.toThrow('Invalid OAuth profile: missing required fields');
        }
      });

      it('should handle profiles with only ID gracefully', async () => {
        const profileWithOnlyId = { id: 'test' }; // Missing email but has ID

        mockUserCollection.findOne.mockResolvedValue(null);
        const result = await mapProfileToUser(profileWithOnlyId);

        expect(result.email).toBeNull();
        expect(result.name).toBeNull();
        expect(result.image).toBeNull();
        expect(result.emailVerified).toBe(false);
      });
    });

    describe('Network and Database Error Handling', () => {
      it('should handle database connection timeouts gracefully', async () => {
        const validProfile = {
          id: 'timeout-user',
          email: 'timeout@example.com',
          name: 'Timeout User',
          picture: 'https://example.com/avatar.jpg',
          verified_email: true,
        };

        mockUserCollection.findOne.mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('ETIMEDOUT: Connection timeout'));
            }, 100);
          });
        });

        await expect(mapProfileToUser(validProfile)).rejects.toThrow('Database Error: ETIMEDOUT: Connection timeout');
      });

      it('should handle database connection failures', async () => {
        const validProfile = {
          id: 'db-error-user',
          email: 'dberror@example.com',
          name: 'DB Error User',
          picture: 'https://example.com/avatar.jpg',
          verified_email: true,
        };

        mockUserCollection.findOne.mockRejectedValue(new Error('ENOTFOUND: DNS lookup failed'));

        await expect(mapProfileToUser(validProfile)).rejects.toThrow('Database Error: ENOTFOUND: DNS lookup failed');
      });

      it('should handle database authentication failures', async () => {
        const validProfile = {
          id: 'auth-error-user',
          email: 'autherror@example.com',
          name: 'Auth Error User',
          verified_email: true,
        };

        mockUserCollection.findOne.mockRejectedValue(new Error('Authentication failed'));

        await expect(mapProfileToUser(validProfile)).rejects.toThrow('Database Error: Authentication failed');
      });
    });

    describe('Data Integrity Validation', () => {
      it('should validate email format for OAuth profiles', async () => {
        const invalidEmailProfiles = [
          { id: 'test1', email: 'invalid-email', name: 'Test' },
          { id: 'test2', email: '@invalid.com', name: 'Test' },
          { id: 'test3', email: 'user@', name: 'Test' },
        ];

        for (const profile of invalidEmailProfiles) {
          mockUserCollection.findOne.mockResolvedValue(null);
          await expect(mapProfileToUser(profile)).rejects.toThrow('Invalid email format');
        }
      });

      it('should reject empty email strings', async () => {
        const emptyEmailProfile = { id: 'test4', email: '', name: 'Test' };

        mockUserCollection.findOne.mockResolvedValue(null);
        await expect(mapProfileToUser(emptyEmailProfile)).rejects.toThrow('email cannot be empty');
      });

      it('should validate required string fields are not empty', async () => {
        const invalidProfiles = [
          { id: '', email: 'test@example.com', name: 'Test' },           // Empty ID
          { id: null, email: 'test@example.com', name: 'Test' },         // Null ID
        ];

        for (const profile of invalidProfiles) {
          mockUserCollection.findOne.mockResolvedValue(null);
          await expect(mapProfileToUser(profile)).rejects.toThrow('Invalid OAuth profile');
        }
      });

      it('should allow empty name as it is optional', async () => {
        const profileWithEmptyName = { id: 'test', email: 'test@example.com', name: '' };

        mockUserCollection.findOne.mockResolvedValue(null);
        const result = await mapProfileToUser(profileWithEmptyName);

        expect(result.email).toBe('test@example.com');
        expect(result.name).toBe(''); // Empty name should be preserved
        expect(result.emailVerified).toBe(false);
      });

      it('should sanitize and validate image URLs', async () => {
        const maliciousImageProfiles = [
          {
            id: 'test1',
            email: 'test@example.com',
            name: 'Test',
            picture: 'javascript:alert("xss")',
          },
          {
            id: 'test2',
            email: 'test@example.com',
            name: 'Test',
            picture: 'data:text/html,<script>alert("xss")</script>',
          },
        ];

        for (const profile of maliciousImageProfiles) {
          mockUserCollection.findOne.mockResolvedValue(null);
          await expect(mapProfileToUser(profile)).rejects.toThrow('Invalid image URL format');
        }
      });
    });

    describe('Successful Error Recovery', () => {
      it('should handle missing optional fields gracefully', async () => {
        const minimalValidProfile = {
          id: 'minimal-user',
          email: 'minimal@example.com',
          // missing name, picture, verified_email
        };

        mockUserCollection.findOne.mockResolvedValue(null);

        const result = await mapProfileToUser(minimalValidProfile);

        expect(result.email).toBe('minimal@example.com');
        expect(result.name).toBeNull();
        expect(result.image).toBeNull();
        expect(result.emailVerified).toBe(false); // Should default to false when not specified
      });

      it('should handle profiles with only basic information', async () => {
        const basicProfile = {
          id: 'basic-user',
          email: 'basic@example.com',
          name: 'Basic User',
        };

        mockUserCollection.findOne.mockResolvedValue(null);

        const result = await mapProfileToUser(basicProfile);

        expect(result.email).toBe('basic@example.com');
        expect(result.name).toBe('Basic User');
        expect(result.image).toBeNull();
        expect(result.emailVerified).toBe(false);
      });
    });
  });

  describe('OAuth Profile Data Sanitization', () => {
    it('should handle profile data with potential security issues', async () => {
      const suspiciousProfile = {
        id: '<script>alert("xss")</script>',
        email: 'test@gmail.com',
        name: '<img src=x onerror=alert("xss")>',
        picture: 'javascript:alert("xss")',
        verified_email: true,
      };

      mockUserCollection.findOne.mockResolvedValue(null);

      // Should throw error for dangerous image URL
      await expect(mapProfileToUser(suspiciousProfile)).rejects.toThrow('Invalid image URL format');
    });

    it('should handle null and undefined values gracefully', async () => {
      const nullProfile = {
        id: 'null-test',
        email: 'test@gmail.com',
        name: null,
        picture: undefined,
        verified_email: null,
      };

      mockUserCollection.findOne.mockResolvedValue(null);

      const result = await mapProfileToUser(nullProfile);

      expect(result.email).toBe('test@gmail.com');
      expect(result.name).toBeNull();
      expect(result.image).toBeNull();
      expect(result.emailVerified).toBe(false); // Default to false when not specified
    });
  });
});
