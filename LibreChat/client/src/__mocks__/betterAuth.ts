import { vi } from 'vitest';

// Comprehensive Better Auth mock
export const createBetterAuthMock = () => ({
  authClient: {
    // Session hooks
    useSession: vi.fn(() => ({
      data: {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        session: {
          id: 'session-123',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    })),

    getSession: vi.fn().mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { id: 'session-123' },
      },
      error: null,
    }),

    // Organization hooks
    useActiveOrganization: vi.fn(() => ({
      data: {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        createdAt: new Date(),
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn(),
    })),

    useListOrganizations: vi.fn(() => ({
      data: [
        {
          id: 'org-123',
          name: 'Test Organization',
          slug: 'test-org',
          role: 'owner',
        },
      ],
      error: null,
      isPending: false,
      refetch: vi.fn(),
    })),

    // Auth methods
    signUp: {
      email: vi.fn().mockResolvedValue({ success: true }),
    },

    signIn: {
      email: vi.fn().mockResolvedValue({ success: true }),
    },

    signOut: vi.fn().mockResolvedValue({}),

    // Organization methods
    organization: {
      create: vi.fn().mockResolvedValue({
        id: 'new-org-123',
        name: 'New Organization',
        slug: 'new-org',
      }),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
      setActive: vi.fn().mockResolvedValue({}),
      getFullOrganization: vi.fn().mockResolvedValue({
        data: {
          organization: { id: 'org-123', name: 'Test Organization' },
          members: [],
          invitations: [],
        },
      }),
      inviteMember: vi.fn().mockResolvedValue({}),
      updateMemberRole: vi.fn().mockResolvedValue({}),
      removeMember: vi.fn().mockResolvedValue({}),
      cancelInvitation: vi.fn().mockResolvedValue({}),
      checkDomain: vi.fn().mockResolvedValue({
        exists: false,
        organization: null,
      }),
    },

    // Admin methods
    admin: {
      listUsers: vi.fn().mockResolvedValue({ users: [] }),
      createUser: vi.fn().mockResolvedValue({ id: 'new-user-123' }),
      setRole: vi.fn().mockResolvedValue({}),
      listUserSessions: vi.fn().mockResolvedValue({ sessions: [] }),
      revokeUserSessions: vi.fn().mockResolvedValue({}),
    },
  },
});

// Export for direct use in vi.mock
export const authClient = createBetterAuthMock().authClient;
