/**
 * @fileoverview Comprehensive tests for Better Auth configuration and authentication flows
 * @module auth.better-auth.vitest
 *
 * This test suite provides comprehensive coverage of the Better Auth integration in LibreChat,
 * testing critical authentication flows, database operations, and security features.
 *
 * ## Test Coverage:
 *
 * ### OAuth Profile Mapping (`mapProfileToUser`)
 * - New user registration via OAuth providers (Google)
 * - Existing user account linking and profile updates
 * - Handling of missing or incomplete OAuth profile data
 * - Preference for existing user data over OAuth updates
 * - OAuth provider configuration validation
 *
 * ### Database Hooks
 * - **User Creation**: Prevents duplicate user creation, handles new users
 * - **Account Linking**: Links OAuth accounts to existing users, validates providers
 * - **Session Management**: Sets active organization in sessions, handles memberships
 * - **Error Handling**: Graceful degradation when database operations fail
 *
 * ### Magic Link Authentication
 * - Email sending with configurable SMTP service
 * - File-based magic link storage for development/testing
 * - Magic link expiration and cleanup (10-link limit)
 * - Failure handling for email service and file system errors
 * - Template-based email generation with app branding
 *
 * ### Configuration and Environment
 * - Environment variable validation (BETTER_AUTH_SECRET, URLs)
 * - URL format validation for baseURL and clientURL
 * - Admin user configuration and role assignment
 * - MongoDB connection handling and error recovery
 *
 * ### Integration Scenarios
 * - Complete OAuth sign-up flow (profile mapping → user creation → account linking → session)
 * - OAuth sign-in for existing users with organization membership
 * - Magic link registration and authentication flow
 * - Error boundary testing with database failures
 *
 * ### Security Testing
 * - Account linking validation and provider trust
 * - Session management with organization membership
 * - Authentication state management and error handling
 * - Profile data validation and sanitization
 *
 * ## Key Testing Patterns:
 * - Uses extensive mocking of Better Auth, MongoDB, and file system operations
 * - Tests both successful operations and error scenarios
 * - Validates configuration validation and environment setup
 * - Ensures graceful degradation when external services fail
 * - Tests real-world authentication flows end-to-end
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { fileURLToPath } from 'url';
import path from 'path';

// Mock dependencies
const mockBetterAuth = vi.fn();
const mockMongodbAdapter = vi.fn();
const mockOrganization = vi.fn();
const mockMagicLink = vi.fn();
const mockAdmin = vi.fn();

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

const mockBetterAuthConfig = {
  basePath: '/api/auth',
  baseURL: 'http://localhost:3080',
  clientURL: 'http://localhost:3090',
  trustedOrigins: ['http://localhost:3090', 'http://localhost:3080'],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  emailVerification: {
    enabled: false,
    sendOnSignUp: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 0,
    cookieAge: 60 * 60 * 24 * 365,
  },
};

const mockHandleOrganizationAssignment = vi.fn();
const mockSendEmail = vi.fn();

// Mock modules
vi.mock('better-auth', () => ({
  betterAuth: mockBetterAuth,
}));

vi.mock('better-auth/adapters/mongodb', () => ({
  mongodbAdapter: mockMongodbAdapter,
}));

vi.mock('better-auth/plugins', () => ({
  organization: mockOrganization,
  magicLink: mockMagicLink,
  admin: mockAdmin,
}));

vi.mock('#config/index.js', () => ({
  logger: mockLogger,
}));

vi.mock('#config/betterAuth.js', () => ({
  betterAuthConfig: mockBetterAuthConfig,
}));

vi.mock('#utils/organization.js', () => ({
  handleOrganizationAssignment: mockHandleOrganizationAssignment,
}));

vi.mock('#server/utils/sendEmail.js', () => ({
  default: mockSendEmail,
}));

// Mock file system for magic link testing
const mockFs = {
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
};

vi.mock('fs/promises', () => ({
  default: mockFs,
  ...mockFs,
}));

// Mock MongoDB setup
const mockUserCollection = {
  findOne: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
};

const mockAccountCollection = {
  findOne: vi.fn(),
  insertOne: vi.fn(),
};

const mockMemberCollection = {
  findOne: vi.fn(),
  insertOne: vi.fn(),
};

const mockDb = {
  collection: vi.fn((name) => {
    switch (name) {
      case 'user':
        return mockUserCollection;
      case 'account':
        return mockAccountCollection;
      case 'member':
        return mockMemberCollection;
      default:
        return { findOne: vi.fn(), insertOne: vi.fn() };
    }
  }),
};

const mockConnection = {
  once: vi.fn(),
  on: vi.fn(),
  db: mockDb,
  readyState: 0,
};

vi.mock('mongoose', () => ({
  default: {
    connection: mockConnection,
  },
}));

describe('Better Auth Comprehensive Tests', () => {
  let authInstance;
  let betterAuthConfigUsed;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful auth instance
    authInstance = {
      handler: vi.fn(),
      api: {
        signInMagicLink: vi.fn(),
        listOrganizations: vi.fn().mockResolvedValue([]),
        createOrganization: vi.fn(),
        addMember: vi.fn(),
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
      },
    };

    // Capture the config passed to betterAuth
    mockBetterAuth.mockImplementation((config) => {
      betterAuthConfigUsed = config;
      return authInstance;
    });

    mockMongodbAdapter.mockReturnValue('mock-adapter');
    mockOrganization.mockReturnValue('organization-plugin');
    mockMagicLink.mockReturnValue('magiclink-plugin');
    mockAdmin.mockReturnValue('admin-plugin');

    // Set required environment variables
    process.env.BETTER_AUTH_SECRET = 'test-secret-key';
    process.env.DOMAIN_SERVER = 'http://localhost:3080';
    process.env.DOMAIN_CLIENT = 'http://localhost:3090';
    process.env.NODE_ENV = 'test';
    process.env.CI = 'true';
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.BETTER_AUTH_SECRET;
    delete process.env.DOMAIN_SERVER;
    delete process.env.DOMAIN_CLIENT;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.NODE_ENV;
    delete process.env.CI;
  });

  describe('OAuth Profile Mapping (mapProfileToUser)', () => {
    beforeEach(async () => {
      // Set up Google OAuth credentials
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      // Import and initialize auth
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should map new OAuth user profile correctly', async () => {
      // Mock no existing user
      mockUserCollection.findOne.mockResolvedValue(null);

      const oauthProfile = {
        email: 'newuser@example.com',
        name: 'New User',
        picture: 'https://example.com/avatar.jpg',
      };

      const mapProfileToUser = betterAuthConfigUsed.socialProviders.google.mapProfileToUser;
      const result = await mapProfileToUser(oauthProfile);

      expect(result).toEqual({
        email: 'newuser@example.com',
        name: 'New User',
        image: 'https://example.com/avatar.jpg',
        emailVerified: true,
      });

      expect(mockUserCollection.findOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔍 OAuth profile mapping for:',
        'newuser@example.com',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        '👤 New user from OAuth:',
        'newuser@example.com',
      );
    });

    test('should handle existing user during OAuth profile mapping', async () => {
      // Mock existing user
      const existingUser = {
        _id: { toString: () => 'existing-user-id' },
        email: 'existing@example.com',
        name: 'Existing User',
        image: 'https://example.com/old-avatar.jpg',
        emailVerified: false,
      };
      mockUserCollection.findOne.mockResolvedValue(existingUser);

      const oauthProfile = {
        email: 'existing@example.com',
        name: 'Updated Name',
        picture: 'https://example.com/new-avatar.jpg',
      };

      const mapProfileToUser = betterAuthConfigUsed.socialProviders.google.mapProfileToUser;
      const result = await mapProfileToUser(oauthProfile);

      expect(result).toEqual({
        id: 'existing-user-id',
        email: 'existing@example.com',
        name: 'Existing User', // Keeps existing name
        image: 'https://example.com/old-avatar.jpg', // Keeps existing image
        emailVerified: true, // Updates to true
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔗 Found existing user during OAuth mapping:',
        'existing@example.com',
      );
    });

    test('should prefer existing user data over OAuth profile data', async () => {
      const existingUser = {
        _id: { toString: () => 'user-123' },
        email: 'user@example.com',
        name: 'Preferred Name',
        image: 'https://example.com/preferred.jpg',
        emailVerified: true,
      };
      mockUserCollection.findOne.mockResolvedValue(existingUser);

      const oauthProfile = {
        email: 'user@example.com',
        name: null, // Missing name in OAuth profile
        picture: null, // Missing picture
      };

      const mapProfileToUser = betterAuthConfigUsed.socialProviders.google.mapProfileToUser;
      const result = await mapProfileToUser(oauthProfile);

      expect(result.name).toBe('Preferred Name');
      expect(result.image).toBe('https://example.com/preferred.jpg');
    });

    test('should handle OAuth profile with missing data', async () => {
      mockUserCollection.findOne.mockResolvedValue(null);

      const oauthProfile = {
        email: 'minimal@example.com',
        // Missing name and picture
      };

      const mapProfileToUser = betterAuthConfigUsed.socialProviders.google.mapProfileToUser;
      const result = await mapProfileToUser(oauthProfile);

      expect(result).toEqual({
        email: 'minimal@example.com',
        name: undefined,
        image: undefined,
        emailVerified: true,
      });
    });

    test('should not initialize OAuth when credentials are missing', async () => {
      // Clear OAuth credentials
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      // Reset modules and reimport
      vi.resetModules();
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();

      const config = mockBetterAuth.mock.calls[mockBetterAuth.mock.calls.length - 1][0];
      expect(config.socialProviders).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Google OAuth credentials missing - Google provider will not be available',
      );
    });
  });

  describe('Database Hooks - User Creation', () => {
    beforeEach(async () => {
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should prevent duplicate user creation', async () => {
      const existingUser = {
        _id: { toString: () => 'existing-id' },
        email: 'existing@example.com',
        name: 'Existing User',
      };
      mockUserCollection.findOne.mockResolvedValue(existingUser);

      const newUserData = {
        email: 'existing@example.com',
        name: 'New Name Attempt',
      };

      const userCreateHook = betterAuthConfigUsed.databaseHooks.user.create.before;
      const result = await userCreateHook(newUserData);

      expect(result).toEqual({
        ...newUserData,
        id: 'existing-id',
        _id: existingUser._id,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Found existing user with email:',
        'existing@example.com',
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Existing user ID:', existingUser._id);
    });

    test('should allow new user creation when no duplicate exists', async () => {
      mockUserCollection.findOne.mockResolvedValue(null);

      const newUserData = {
        email: 'newuser@example.com',
        name: 'New User',
      };

      const userCreateHook = betterAuthConfigUsed.databaseHooks.user.create.before;
      const result = await userCreateHook(newUserData);

      expect(result).toEqual(newUserData);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'No existing user found, allowing creation for:',
        'newuser@example.com',
      );
    });

    test('should handle database errors gracefully in user creation', async () => {
      const dbError = new Error('Database connection failed');
      mockUserCollection.findOne.mockRejectedValue(dbError);

      const newUserData = {
        email: 'error@example.com',
        name: 'Error User',
      };

      const userCreateHook = betterAuthConfigUsed.databaseHooks.user.create.before;
      const result = await userCreateHook(newUserData);

      expect(result).toEqual(newUserData); // Returns original data on error
      expect(mockLogger.error).toHaveBeenCalledWith('Error in user create hook:', dbError);
    });
  });

  describe('Database Hooks - Account Linking', () => {
    beforeEach(async () => {
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should link OAuth account to existing user', async () => {
      const existingUser = {
        _id: 'user-123',
        email: 'user@example.com',
      };
      mockUserCollection.findOne.mockResolvedValue(existingUser);

      const accountData = {
        providerId: 'google',
        userId: 'user-123',
        providerAccountId: 'google-account-123',
      };

      const accountCreateHook = betterAuthConfigUsed.databaseHooks.account.create.before;
      const result = await accountCreateHook(accountData);

      expect(result).toEqual(accountData);
      expect(mockLogger.info).toHaveBeenCalledWith('Account create hook - linking OAuth account:', {
        providerId: 'google',
        userId: 'user-123',
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Linking OAuth account to user:',
        'user@example.com',
      );
    });

    test('should warn when user not found during account linking', async () => {
      mockUserCollection.findOne.mockResolvedValue(null);

      const accountData = {
        providerId: 'google',
        userId: 'non-existent-user',
        providerAccountId: 'google-account-123',
      };

      const accountCreateHook = betterAuthConfigUsed.databaseHooks.account.create.before;
      const result = await accountCreateHook(accountData);

      expect(result).toEqual(accountData);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User not found for account linking:',
        'non-existent-user',
      );
    });

    test('should handle non-Google providers', async () => {
      const accountData = {
        providerId: 'github',
        userId: 'user-123',
        providerAccountId: 'github-account-123',
      };

      const accountCreateHook = betterAuthConfigUsed.databaseHooks.account.create.before;
      const result = await accountCreateHook(accountData);

      expect(result).toEqual(accountData);
      expect(mockUserCollection.findOne).not.toHaveBeenCalled(); // Should not look up user for non-Google providers
    });

    test('should handle database errors in account linking', async () => {
      const dbError = new Error('Database error');
      mockUserCollection.findOne.mockRejectedValue(dbError);

      const accountData = {
        providerId: 'google',
        userId: 'user-123',
      };

      const accountCreateHook = betterAuthConfigUsed.databaseHooks.account.create.before;
      const result = await accountCreateHook(accountData);

      expect(result).toEqual(accountData);
      expect(mockLogger.error).toHaveBeenCalledWith('Error in account create hook:', dbError);
    });
  });

  describe('Database Hooks - Session Management', () => {
    beforeEach(async () => {
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should set active organization in session when user has membership', async () => {
      const membership = {
        userId: 'user-123',
        organizationId: 'org-456',
        role: 'member',
      };
      mockMemberCollection.findOne.mockResolvedValue(membership);

      const sessionData = {
        userId: 'user-123',
        token: 'session-token',
      };

      const sessionCreateHook = betterAuthConfigUsed.databaseHooks.session.create.before;
      const result = await sessionCreateHook(sessionData);

      expect(result).toEqual({
        data: {
          ...sessionData,
          activeOrganizationId: 'org-456',
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Found organization membership, setting activeOrganizationId:',
        'org-456',
      );
    });

    test('should handle user without organization membership', async () => {
      mockMemberCollection.findOne.mockResolvedValue(null);

      const sessionData = {
        userId: 'user-123',
        token: 'session-token',
      };

      const sessionCreateHook = betterAuthConfigUsed.databaseHooks.session.create.before;
      const result = await sessionCreateHook(sessionData);

      expect(result).toEqual(sessionData); // Returns original data
      expect(mockLogger.info).toHaveBeenCalledWith(
        'No organization membership found for user:',
        'user-123',
      );
    });

    test('should handle database errors in session creation', async () => {
      const dbError = new Error('Database error');
      mockMemberCollection.findOne.mockRejectedValue(dbError);

      const sessionData = {
        userId: 'user-123',
        token: 'session-token',
      };

      const sessionCreateHook = betterAuthConfigUsed.databaseHooks.session.create.before;
      const result = await sessionCreateHook(sessionData);

      expect(result).toEqual(sessionData);
      expect(mockLogger.error).toHaveBeenCalledWith('Error in session create hook:', dbError);
    });
  });

  describe('Magic Link Authentication', () => {
    beforeEach(async () => {
      // Mock file system for magic link file writing
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock sendEmail
      mockSendEmail.mockResolvedValue({ messageId: 'test-message-id' });

      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should send magic link email when email service is configured', async () => {
      process.env.EMAIL_SERVICE = 'smtp';
      process.env.APP_TITLE = 'Test App';

      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const sendMagicLink = magicLinkConfig.sendMagicLink;

      const result = await sendMagicLink(
        {
          email: 'test@example.com',
          token: 'magic-token-123',
          url: 'http://localhost:3090/auth/magic-link?token=magic-token-123',
        },
        {},
      );

      expect(result).toEqual({ success: true });
      expect(mockSendEmail).toHaveBeenCalledWith({
        email: 'test@example.com',
        subject: 'Sign in to Test App',
        template: 'magicLink.handlebars',
        payload: {
          name: 'test',
          appName: 'Test App',
          magicLink: 'http://localhost:3090/auth/magic-link?token=magic-token-123',
          year: new Date().getFullYear(),
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Magic link email sent successfully to: test@example.com',
      );
    });

    test('should write magic link to file in development/test environment', async () => {
      process.env.NODE_ENV = 'development';

      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const sendMagicLink = magicLinkConfig.sendMagicLink;

      await sendMagicLink(
        {
          email: 'dev@example.com',
          token: 'dev-token-123',
          url: 'http://localhost:3090/auth/magic-link?token=dev-token-123',
        },
        {},
      );

      // Verify file operations
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();

      // Check the written data
      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(1);
      expect(writtenData[0]).toMatchObject({
        email: 'dev@example.com',
        token: 'dev-token-123',
        url: 'http://localhost:3090/auth/magic-link?token=dev-token-123',
      });
      expect(writtenData[0]).toHaveProperty('timestamp');
      expect(writtenData[0]).toHaveProperty('expiresAt');
    });

    test('should append to existing magic links file', async () => {
      const existingLinks = [
        {
          email: 'old@example.com',
          token: 'old-token',
          url: 'http://localhost:3090/auth/magic-link?token=old-token',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingLinks));

      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const sendMagicLink = magicLinkConfig.sendMagicLink;

      await sendMagicLink(
        {
          email: 'new@example.com',
          token: 'new-token-123',
          url: 'http://localhost:3090/auth/magic-link?token=new-token-123',
        },
        {},
      );

      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(2);
      expect(writtenData[0].email).toBe('old@example.com');
      expect(writtenData[1].email).toBe('new@example.com');
    });

    test('should limit magic links file to 10 entries', async () => {
      const existingLinks = Array(10)
        .fill(null)
        .map((_, i) => ({
          email: `user${i}@example.com`,
          token: `token-${i}`,
          url: `http://localhost:3090/auth/magic-link?token=token-${i}`,
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
        }));
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingLinks));

      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const sendMagicLink = magicLinkConfig.sendMagicLink;

      await sendMagicLink(
        {
          email: 'overflow@example.com',
          token: 'overflow-token',
          url: 'http://localhost:3090/auth/magic-link?token=overflow-token',
        },
        {},
      );

      const writtenData = JSON.parse(mockFs.writeFile.mock.calls[0][1]);
      expect(writtenData).toHaveLength(10);
      expect(writtenData[0].email).toBe('user1@example.com'); // First entry removed
      expect(writtenData[9].email).toBe('overflow@example.com'); // New entry added
    });

    test('should handle email sending failure gracefully', async () => {
      process.env.EMAIL_SERVICE = 'smtp';
      const emailError = new Error('SMTP connection failed');
      mockSendEmail.mockRejectedValue(emailError);

      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const sendMagicLink = magicLinkConfig.sendMagicLink;

      const result = await sendMagicLink(
        {
          email: 'fail@example.com',
          token: 'fail-token',
          url: 'http://localhost:3090/auth/magic-link?token=fail-token',
        },
        {},
      );

      expect(result).toEqual({ success: true });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Failed to send magic link email:',
        emailError,
      );
      // Should still write to file as fallback
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('should handle file writing errors', async () => {
      const fileError = new Error('File system error');
      mockFs.writeFile.mockRejectedValue(fileError);

      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const sendMagicLink = magicLinkConfig.sendMagicLink;

      const result = await sendMagicLink(
        {
          email: 'file-error@example.com',
          token: 'error-token',
          url: 'http://localhost:3090/auth/magic-link?token=error-token',
        },
        {},
      );

      expect(result).toEqual({ success: true });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ Failed to write magic link to file:',
        fileError,
      );
    });

    test('should configure magic link with correct expiration', async () => {
      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      expect(magicLinkConfig.expiresIn).toBe(600); // 10 minutes
      expect(magicLinkConfig.disableSignUp).toBe(false);
    });
  });

  describe('Admin Plugin Configuration', () => {
    beforeEach(async () => {
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should configure admin plugin with default settings', () => {
      const adminConfig = mockAdmin.mock.calls[0][0];
      expect(adminConfig).toEqual({
        defaultRole: 'user',
        adminRoles: ['admin'],
        adminUserIds: [],
      });
    });

    test('should parse admin user IDs from environment variable', async () => {
      process.env.ADMIN_USER_IDS = 'user1,user2,user3';

      // Reset and reimport
      vi.resetModules();

      // Re-mock the modules after reset
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: mockBetterAuthConfig,
      }));
      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();

      const adminConfig = mockAdmin.mock.calls[mockAdmin.mock.calls.length - 1][0];
      expect(adminConfig.adminUserIds).toEqual(['user1', 'user2', 'user3']);
    });
  });

  describe('Environment Variables and Configuration', () => {
    test('should validate required environment variables', async () => {
      delete process.env.BETTER_AUTH_SECRET;

      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];

      expect(() => connectionCallback()).toThrow(
        'BETTER_AUTH_SECRET environment variable is required but not set',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        '❌ BETTER_AUTH_SECRET environment variable is required',
      );
    });

    test('should validate baseURL configuration', async () => {
      // Mock invalid baseURL
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: {
          ...mockBetterAuthConfig,
          baseURL: undefined,
        },
      }));

      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      // Reset and reimport
      vi.resetModules();
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];

      expect(() => connectionCallback()).toThrow('baseURL is required but not configured');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ baseURL is missing or undefined');
    });

    test('should validate clientURL configuration', async () => {
      // Mock invalid clientURL
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: {
          ...mockBetterAuthConfig,
          clientURL: undefined,
        },
      }));

      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      // Reset and reimport
      vi.resetModules();
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];

      expect(() => connectionCallback()).toThrow('clientURL is required but not configured');
      expect(mockLogger.error).toHaveBeenCalledWith('❌ clientURL is missing or undefined');
    });

    test('should validate URL formats', async () => {
      // Mock invalid URL format
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: {
          ...mockBetterAuthConfig,
          baseURL: 'not-a-valid-url',
        },
      }));

      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      // Reset and reimport
      vi.resetModules();
      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];

      expect(() => connectionCallback()).toThrow('Invalid baseURL: not-a-valid-url');
    });
  });

  describe('MongoDB Connection Handling', () => {
    test('should handle MongoDB connection errors', async () => {
      await import('./auth.js');

      // Test error event handler
      const errorHandler = mockConnection.on.mock.calls.find((call) => call[0] === 'error')[1];
      const testError = new Error('MongoDB connection failed');
      errorHandler(testError);

      expect(mockLogger.error).toHaveBeenCalledWith('❌ MongoDB connection error:', testError);
    });

    test('should handle MongoDB disconnection', async () => {
      await import('./auth.js');

      // Test disconnected event handler
      const disconnectHandler = mockConnection.on.mock.calls.find(
        (call) => call[0] === 'disconnected',
      )[1];
      disconnectHandler();

      expect(mockLogger.warn).toHaveBeenCalledWith('⚠️ MongoDB disconnected');
    });

    test('should initialize immediately if MongoDB already connected', async () => {
      // Set connection as already open
      mockConnection.readyState = 1;

      await import('./auth.js');

      expect(mockLogger.info).toHaveBeenCalledWith(
        '🔧 MongoDB already connected, initializing Better Auth immediately...',
      );
    });
  });

  describe('Better Auth Instance Creation', () => {
    beforeEach(async () => {
      // Reset modules to ensure clean state
      vi.resetModules();

      // Re-mock the modules after reset
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: mockBetterAuthConfig,
      }));
      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should create Better Auth instance with correct configuration', () => {
      expect(mockBetterAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'mock-adapter',
          secret: 'test-secret-key',
          baseURL: 'http://localhost:3080',
          basePath: '/api/auth',
          trustedOrigins: ['http://localhost:3090', 'http://localhost:3080'],
          advanced: {
            generateId: false,
            crossSubDomainCookies: {
              enabled: false,
            },
          },
          emailAndPassword: {
            enabled: true,
          },
          emailVerification: {
            enabled: false,
            sendOnSignUp: false,
          },
          session: {
            expiresIn: 60 * 60 * 24 * 365,
            updateAge: 0,
            cookieAge: 60 * 60 * 24 * 365,
          },
          user: {
            additionalFields: {
              onboardingStep: {
                type: 'string',
                required: false,
                defaultValue: 'organization',
                input: true,
              },
              username: {
                type: 'string',
                required: false,
                input: true,
              },
            },
          },
          account: {
            accountLinking: {
              enabled: true,
              trustedProviders: ['google'],
            },
          },
          databaseHooks: expect.any(Object),
          plugins: expect.arrayContaining([
            'admin-plugin',
            'organization-plugin',
            'magiclink-plugin',
          ]),
        }),
      );
    });

    test('should log available API methods', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        '✅ Better Auth API methods available:',
        expect.arrayContaining(['signInMagicLink']),
      );
      expect(mockLogger.info).toHaveBeenCalledWith('✅ Magic link sign-in method available');
    });

    test('should handle Better Auth creation errors', async () => {
      const createError = new Error('Better Auth creation failed');
      mockBetterAuth.mockImplementationOnce(() => {
        throw createError;
      });

      // Reset and reimport
      vi.resetModules();

      // Re-mock the modules after reset
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: mockBetterAuthConfig,
      }));
      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];

      expect(() => connectionCallback()).toThrow(createError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating Better Auth instance:',
        createError,
      );
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

      // Reset modules to ensure clean state
      vi.resetModules();

      // Re-mock the modules after reset
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: mockBetterAuthConfig,
      }));
      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();
    });

    test('should handle complete OAuth sign-up flow', async () => {
      // Step 1: OAuth profile mapping (new user)
      mockUserCollection.findOne.mockResolvedValue(null);

      const oauthProfile = {
        email: 'newuser@company.com',
        name: 'New User',
        picture: 'https://example.com/avatar.jpg',
      };

      const mapProfileToUser = betterAuthConfigUsed.socialProviders.google.mapProfileToUser;
      const mappedUser = await mapProfileToUser(oauthProfile);

      expect(mappedUser.emailVerified).toBe(true);

      // Step 2: User creation hook (should check for existing user)
      const userCreateHook = betterAuthConfigUsed.databaseHooks.user.create.before;
      const userData = await userCreateHook(mappedUser);

      expect(userData).toEqual(mappedUser); // No existing user, so returns as-is

      // Step 3: Account linking hook
      const accountData = {
        providerId: 'google',
        userId: 'created-user-id',
        providerAccountId: 'google-123',
      };

      const accountCreateHook = betterAuthConfigUsed.databaseHooks.account.create.before;
      await accountCreateHook(accountData);

      // Step 4: Session creation with organization
      mockMemberCollection.findOne.mockResolvedValue({
        userId: 'created-user-id',
        organizationId: 'org-company',
      });

      const sessionData = {
        userId: 'created-user-id',
        token: 'session-token',
      };

      const sessionCreateHook = betterAuthConfigUsed.databaseHooks.session.create.before;
      const sessionResult = await sessionCreateHook(sessionData);

      expect(sessionResult.data.activeOrganizationId).toBe('org-company');
    });

    test('should handle OAuth sign-in for existing user', async () => {
      // Step 1: OAuth profile mapping (existing user)
      const existingUser = {
        _id: { toString: () => 'existing-id' },
        email: 'existing@company.com',
        name: 'Existing User',
        image: 'https://example.com/old.jpg',
        emailVerified: true,
      };
      mockUserCollection.findOne.mockResolvedValue(existingUser);

      const oauthProfile = {
        email: 'existing@company.com',
        name: 'Updated Name',
        picture: 'https://example.com/new.jpg',
      };

      const mapProfileToUser = betterAuthConfigUsed.socialProviders.google.mapProfileToUser;
      const mappedUser = await mapProfileToUser(oauthProfile);

      expect(mappedUser.id).toBe('existing-id');
      expect(mappedUser.name).toBe('Existing User'); // Preserves existing data

      // Step 2: Session creation
      mockMemberCollection.findOne.mockResolvedValue({
        userId: 'existing-id',
        organizationId: 'org-company',
      });

      const sessionData = {
        userId: 'existing-id',
        token: 'new-session-token',
      };

      const sessionCreateHook = betterAuthConfigUsed.databaseHooks.session.create.before;
      const sessionResult = await sessionCreateHook(sessionData);

      expect(sessionResult.data.activeOrganizationId).toBe('org-company');
    });

    test('should handle magic link sign-up flow', async () => {
      process.env.EMAIL_SERVICE = 'smtp';

      // Step 1: Send magic link
      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const sendMagicLink = magicLinkConfig.sendMagicLink;

      await sendMagicLink(
        {
          email: 'newuser@example.com',
          token: 'magic-token',
          url: 'http://localhost:3090/auth/magic-link?token=magic-token',
        },
        {},
      );

      expect(mockSendEmail).toHaveBeenCalled();

      // Step 2: User creation (when magic link is verified)
      mockUserCollection.findOne.mockResolvedValue(null);

      const newUserData = {
        email: 'newuser@example.com',
        emailVerified: true,
      };

      const userCreateHook = betterAuthConfigUsed.databaseHooks.user.create.before;
      const userData = await userCreateHook(newUserData);

      expect(userData).toEqual(newUserData);

      // Step 3: Session creation
      const sessionData = {
        userId: 'new-user-id',
        token: 'session-token',
      };

      const sessionCreateHook = betterAuthConfigUsed.databaseHooks.session.create.before;
      await sessionCreateHook(sessionData);
    });
  });

  describe('Error Boundary Testing', () => {
    test('should handle all database operations failing', async () => {
      const dbError = new Error('Complete database failure');
      mockUserCollection.findOne.mockRejectedValue(dbError);
      mockAccountCollection.findOne.mockRejectedValue(dbError);
      mockMemberCollection.findOne.mockRejectedValue(dbError);

      // Reset modules to ensure clean state
      vi.resetModules();

      // Re-mock the modules after reset
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: mockBetterAuthConfig,
      }));
      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      const authModule = await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();

      // Test all hooks still return gracefully
      const userCreateHook = betterAuthConfigUsed.databaseHooks.user.create.before;
      const accountCreateHook = betterAuthConfigUsed.databaseHooks.account.create.before;
      const sessionCreateHook = betterAuthConfigUsed.databaseHooks.session.create.before;

      const userData = await userCreateHook({ email: 'test@example.com' });
      expect(userData).toEqual({ email: 'test@example.com' });

      const accountData = await accountCreateHook({ providerId: 'google', userId: 'test' });
      expect(accountData).toEqual({ providerId: 'google', userId: 'test' });

      const sessionData = await sessionCreateHook({ userId: 'test', token: 'token' });
      expect(sessionData).toEqual({ userId: 'test', token: 'token' });

      expect(mockLogger.error).toHaveBeenCalledTimes(3);
    });

    test('should handle malformed data gracefully', async () => {
      // Reset modules to ensure clean state
      vi.resetModules();

      // Re-mock the modules after reset
      vi.doMock('#config/betterAuth.js', () => ({
        betterAuthConfig: mockBetterAuthConfig,
      }));
      vi.doMock('#config/index.js', () => ({
        logger: mockLogger,
      }));

      const authModule = await import('./auth.js');
      const connectionCallback = mockConnection.once.mock.calls[0][1];
      connectionCallback();

      // Test with null/undefined data
      const userCreateHook = betterAuthConfigUsed.databaseHooks.user.create.before;

      const resultNull = await userCreateHook(null);
      expect(resultNull).toBeNull();

      const resultUndefined = await userCreateHook(undefined);
      expect(resultUndefined).toBeUndefined();

      // Test with missing required fields
      const resultMissingEmail = await userCreateHook({ name: 'No Email' });
      expect(resultMissingEmail).toEqual({ name: 'No Email' });
    });
  });
});
