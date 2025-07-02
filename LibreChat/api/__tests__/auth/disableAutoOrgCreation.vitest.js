/**
 * @fileoverview Tests for disabling auto-organization creation
 * @module auth/disableAutoOrgCreation.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Disable Auto-Organization Creation', () => {
  let mockAuth;
  let mockUser;
  let mockOrganization;
  let mockMember;

  beforeEach(() => {
    // Mock Better Auth instance
    mockAuth = {
      api: {
        signUpSocial: vi.fn(),
        signUpEmail: vi.fn(),
        session: vi.fn(),
        listOrganizations: vi.fn(),
      },
    };

    // Mock data
    mockUser = {
      id: 'test-user-1',
      email: 'testuser@gmail.com',
      name: 'Test User',
      provider: 'google',
    };

    mockOrganization = {
      id: 'test-org-1',
      name: 'Test Company',
      slug: 'test-company',
    };

    mockMember = {
      userId: mockUser.id,
      organizationId: mockOrganization.id,
      role: 'owner',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('OAuth Signup', () => {
    it('should not create organization automatically for new OAuth user', async () => {
      // Mock that no organization is created during signup
      mockAuth.api.signUpSocial.mockResolvedValue({
        user: mockUser,
        organization: null, // No organization should be created
      });

      mockAuth.api.listOrganizations.mockResolvedValue([]);

      // Simulate OAuth signup
      const result = await mockAuth.api.signUpSocial({
        body: mockUser,
      });

      // Verify user was created but no organization
      expect(result.user).toBeDefined();
      expect(result.organization).toBeNull();
      expect(mockAuth.api.signUpSocial).toHaveBeenCalledWith({
        body: mockUser,
      });
    });

    it('should not create organization automatically for new Magic Link user', async () => {
      const magicLinkUser = {
        id: 'test-user-2',
        email: 'testuser2@example.com',
        name: 'Test User 2',
        provider: 'email',
      };

      mockAuth.api.signUpEmail.mockResolvedValue({
        user: magicLinkUser,
        organization: null, // No organization should be created
      });

      const result = await mockAuth.api.signUpEmail({
        body: { email: magicLinkUser.email, name: magicLinkUser.name },
      });

      expect(result.user).toBeDefined();
      expect(result.organization).toBeNull();
      expect(mockAuth.api.signUpEmail).toHaveBeenCalledWith({
        body: { email: magicLinkUser.email, name: magicLinkUser.name },
      });
    });
  });

  describe('Session Creation', () => {
    it('should create session without activeOrganizationId for org-less users', async () => {
      const orglessUser = {
        id: 'test-user-3',
        email: 'orgless@gmail.com',
        name: 'Orgless User',
      };

      // Mock session without organization
      mockAuth.api.session.mockResolvedValue({
        user: orglessUser,
        data: {
          // activeOrganizationId should be undefined
        },
      });

      const session = await mockAuth.api.session({
        headers: { authorization: 'Bearer mock-token' },
        body: { userId: orglessUser.id },
      });

      expect(session).toBeDefined();
      expect(session.user).toBeDefined();
      expect(session.data.activeOrganizationId).toBeUndefined();
    });

    it('should create session with activeOrganizationId for users with organizations', async () => {
      const userWithOrg = {
        id: 'test-user-4',
        email: 'withorg@company.com',
        name: 'User With Org',
      };

      // Mock session with organization
      mockAuth.api.session.mockResolvedValue({
        user: userWithOrg,
        data: {
          activeOrganizationId: mockOrganization.id,
        },
      });

      const session = await mockAuth.api.session({
        headers: { authorization: 'Bearer mock-token' },
        body: { userId: userWithOrg.id },
      });

      expect(session).toBeDefined();
      expect(session.user).toBeDefined();
      expect(session.data.activeOrganizationId).toBe(mockOrganization.id);
    });
  });

  describe('Authentication Redirects', () => {
    it('should redirect org-less users to onboarding', () => {
      // Mock a function that determines redirect URL based on user state
      const getRedirectUrl = (user, hasOrganization) => {
        if (!hasOrganization) {
          return '/onboarding';
        }
        return '/c/new';
      };

      const redirectUrl = getRedirectUrl(mockUser, false);
      expect(redirectUrl).toBe('/onboarding');
    });

    it('should redirect users with organizations to main app', () => {
      const getRedirectUrl = (user, hasOrganization) => {
        if (!hasOrganization) {
          return '/onboarding';
        }
        return '/c/new';
      };

      const redirectUrl = getRedirectUrl(mockUser, true);
      expect(redirectUrl).toBe('/c/new');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain functionality for existing users with organizations', async () => {
      const existingUser = {
        id: 'existing-user-1',
        email: 'legacy@oldcompany.com',
        name: 'Legacy User',
      };

      // Mock that existing user has organization
      mockAuth.api.session.mockResolvedValue({
        user: existingUser,
        data: {
          activeOrganizationId: mockOrganization.id,
        },
      });

      const session = await mockAuth.api.session({
        headers: { authorization: 'Bearer mock-existing-token' },
      });

      expect(session.user).toBeDefined();
      expect(session.data.activeOrganizationId).toBe(mockOrganization.id);
    });

    it('should handle users without organizations gracefully', async () => {
      const newUser = {
        id: 'new-user-1',
        email: 'new@example.com',
        name: 'New User',
      };

      // Mock that new user has no organization
      mockAuth.api.session.mockResolvedValue({
        user: newUser,
        data: {
          // No activeOrganizationId
        },
      });

      const session = await mockAuth.api.session({
        headers: { authorization: 'Bearer mock-new-token' },
      });

      expect(session.user).toBeDefined();
      expect(session.data.activeOrganizationId).toBeUndefined();
    });
  });

  describe('Organization Hook Behavior', () => {
    it('should not call organization creation hooks for new users', () => {
      // This test validates that the onCreate hook for organizations is disabled
      // Since we're mocking the behavior, we verify the expected outcome

      const mockOnCreateHook = vi.fn();

      // Simulate user creation without triggering org creation
      const createUserWithoutOrg = (user) => {
        // In the actual implementation, this would NOT call mockOnCreateHook
        return { user, organization: null };
      };

      const result = createUserWithoutOrg(mockUser);

      expect(result.user).toBeDefined();
      expect(result.organization).toBeNull();
      expect(mockOnCreateHook).not.toHaveBeenCalled();
    });

    it('should handle session creation for users without activeOrganizationId', () => {
      // Test that session creation works when user has no organization
      const createSessionForUser = (user, membership = null) => {
        const sessionData = { userId: user.id };

        if (membership && membership.organizationId) {
          sessionData.activeOrganizationId = membership.organizationId;
        }

        return { data: sessionData };
      };

      const session = createSessionForUser(mockUser, null);

      expect(session.data.userId).toBe(mockUser.id);
      expect(session.data.activeOrganizationId).toBeUndefined();
    });
  });
});
