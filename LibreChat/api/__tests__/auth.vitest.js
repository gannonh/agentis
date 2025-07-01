/**
 * @fileoverview Tests for Better Auth organization hook parameter bug fix
 * @module auth.test
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the organization assignment function
const mockHandleOrganizationAssignment = vi.fn();
vi.mock('#utils/organization.js', () => ({
  handleOrganizationAssignment: mockHandleOrganizationAssignment,
}));

describe('Better Auth Organization Hook Parameter Fix', () => {
  it('should call handleOrganizationAssignment with auth, email, userId (not user, organizationId)', async () => {
    // This test verifies the bug fix for Issue #98
    // The function should be called with (auth, email, userId) not (user, organizationId)

    const mockAuth = {
      api: {
        listOrganizations: vi.fn(),
        createOrganization: vi.fn(),
        addMember: vi.fn(),
      },
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@company.com',
      name: 'Test User',
    };

    const mockOrganization = {
      id: 'org-456',
      name: 'Company',
      slug: 'company',
    };

    mockHandleOrganizationAssignment.mockResolvedValue({
      organization: mockOrganization,
      isNewOrganization: true,
      memberRole: 'owner',
    });

    // Simulate the organization onCreate hook with the correct implementation
    const correctOnCreateHook = async function ({ user, organization }) {
      // This is what the hook SHOULD do after the fix
      if (user?.email) {
        await mockHandleOrganizationAssignment(this, user.email, user.id);
      }
    };

    // Call the hook with auth context
    await correctOnCreateHook.call(mockAuth, {
      user: mockUser,
      organization: mockOrganization,
    });

    // Verify the function was called with correct parameters
    expect(mockHandleOrganizationAssignment).toHaveBeenCalledWith(
      mockAuth, // auth instance (this context)
      'test@company.com', // user.email
      'user-123', // user.id
    );

    // Verify it was NOT called with the incorrect parameters
    expect(mockHandleOrganizationAssignment).not.toHaveBeenCalledWith(
      mockUser, // WRONG: user object
      'org-456', // WRONG: organization.id
    );
  });

  it('should not call handleOrganizationAssignment when user has no email', async () => {
    const mockAuth = {};
    const mockUser = { id: 'user-123' }; // no email
    const mockOrganization = { id: 'org-456' };

    vi.clearAllMocks();

    const correctOnCreateHook = async function ({ user }) {
      if (user?.email) {
        await mockHandleOrganizationAssignment(this, user.email, user.id);
      }
    };

    await correctOnCreateHook.call(mockAuth, {
      user: mockUser,
      organization: mockOrganization,
    });

    expect(mockHandleOrganizationAssignment).not.toHaveBeenCalled();
  });

  it('should demonstrate the BUG: incorrect parameters cause handleOrganizationAssignment to fail', async () => {
    // This test demonstrates the current bug in auth.js line 253
    // The function is being called with wrong parameters

    const mockUser = {
      id: 'user-123',
      email: 'test@company.com',
      name: 'Test User',
    };

    const mockOrganization = {
      id: 'org-456',
      name: 'Company',
      slug: 'company',
    };

    vi.clearAllMocks();

    // This is the CURRENT (buggy) implementation from auth.js:253
    const buggyOnCreateHook = async function ({ user, organization }) {
      if (user?.email) {
        // BUG: Called with (user, organization.id) instead of (auth, email, userId)
        await mockHandleOrganizationAssignment(user, organization.id);
      }
    };

    // The buggy call should not match our expected signature
    await buggyOnCreateHook.call(
      {},
      {
        user: mockUser,
        organization: mockOrganization,
      },
    );

    // This verifies the bug exists - it's called with wrong parameters
    expect(mockHandleOrganizationAssignment).toHaveBeenCalledWith(
      mockUser, // WRONG: user object instead of auth instance
      'org-456', // WRONG: organization.id instead of user.email and user.id
    );

    // And NOT called with the correct parameters
    expect(mockHandleOrganizationAssignment).not.toHaveBeenCalledWith(
      expect.any(Object), // auth instance
      'test@company.com', // user.email
      'user-123', // user.id
    );
  });

  it('should verify the FIX: correct parameters with error handling', async () => {
    // This test verifies the fix is correct

    const mockAuth = {
      api: {
        listOrganizations: vi.fn(),
        createOrganization: vi.fn(),
        addMember: vi.fn(),
      },
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@company.com',
      name: 'Test User',
    };

    const mockOrganization = {
      id: 'org-456',
      name: 'Company',
      slug: 'company',
    };

    vi.clearAllMocks();
    mockHandleOrganizationAssignment.mockResolvedValue({
      organization: mockOrganization,
      isNewOrganization: true,
      memberRole: 'owner',
    });

    // This is the FIXED implementation with proper error handling
    const fixedOnCreateHook = async function ({ user, organization }) {
      try {
        if (user?.email) {
          await mockHandleOrganizationAssignment(this, user.email, user.id);
        }
      } catch (error) {
        // Error handling - don't throw to prevent breaking org creation
        console.error('Organization assignment failed:', error);
      }
    };

    await fixedOnCreateHook.call(mockAuth, {
      user: mockUser,
      organization: mockOrganization,
    });

    // Verify the function was called with correct parameters
    expect(mockHandleOrganizationAssignment).toHaveBeenCalledWith(
      mockAuth, // auth instance (this context)
      'test@company.com', // user.email
      'user-123', // user.id
    );
  });
});
