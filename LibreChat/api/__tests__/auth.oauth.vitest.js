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
        name: undefined,
        image: 'https://lh3.googleusercontent.com/a/default.jpg',
        emailVerified: true,
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

    it('should handle invalid or malformed avatar URLs', async () => {
      const invalidUrls = [
        '', // Empty string
        'not-a-url',
        'javascript:alert("xss")', // Potential XSS
        'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KCd4c3MnKTwvc2NyaXB0Pjwvc3ZnPg==', // Data URL with script
      ];

      mockUserCollection.findOne.mockResolvedValue(null);

      for (const invalidUrl of invalidUrls) {
        const profile = {
          id: 'test-user',
          email: 'test@gmail.com',
          name: 'Test User',
          picture: invalidUrl,
          verified_email: true,
        };

        const result = await mapProfileToUser(profile);

        // Should still map the URL as-is (validation happens at display time)
        expect(result.image).toBe(invalidUrl);
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

      expect(result.email).toBeUndefined();
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

      const result = await mapProfileToUser(suspiciousProfile);

      // Data should be passed through as-is (sanitization happens at display time)
      expect(result.name).toBe('<img src=x onerror=alert("xss")>');
      expect(result.image).toBe('javascript:alert("xss")');
      expect(result.email).toBe('test@gmail.com');
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
      expect(result.image).toBeUndefined();
      expect(result.emailVerified).toBe(true); // Default to true regardless of input
    });
  });
});
