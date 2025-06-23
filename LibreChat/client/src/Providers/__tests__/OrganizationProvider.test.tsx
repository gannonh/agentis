/**
 * @fileoverview Tests for OrganizationProvider component
 * @module Providers/__tests__/OrganizationProvider.test
 */

// @ts-nocheck - Test file with complex Better Auth/React Query type compatibility issues

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  OrganizationProvider,
  useOrganization,
  useOrganizationPermissions,
  useOrganizationMembers,
  useOrganizationInvitations,
} from '../OrganizationProvider';
import { authClient } from '~/config/betterAuth';
import type {
  OrganizationData,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
} from '~/config/betterAuth';

// Mock the auth client
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useActiveOrganization: vi.fn(),
    useSession: vi.fn(),
    organization: {
      getFullOrganization: vi.fn(),
      inviteMember: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      update: vi.fn(),
      cancelInvitation: vi.fn(),
      create: vi.fn(),
      setActive: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock @tanstack/react-query
let actualQueryClient: QueryClient;

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: () => actualQueryClient,
  };
});

// Test data
// Raw organization data as it comes from Better Auth (with description/website in metadata)
const mockRawOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  logo: 'https://example.com/logo.png',
  metadata: {
    domain: 'test.com',
    autoCreated: false,
    createdFromEmail: 'test@test.com',
    description: 'Test organization description',
    website: 'https://test.com',
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

// Processed organization data as the frontend expects it (with description/website as direct properties)
const mockOrganization: OrganizationData = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  logo: 'https://example.com/logo.png',
  metadata: {
    domain: 'test.com',
    autoCreated: false,
    createdFromEmail: 'test@test.com',
    description: 'Test organization description',
    website: 'https://test.com',
  },
  createdAt: new Date('2024-01-01T00:00:00Z'),
  description: 'Test organization description',
  website: 'https://test.com',
};

const mockMembers: OrganizationMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    organizationId: 'org-1',
    role: 'owner' as UserRole,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    user: {
      id: 'user-1',
      name: 'Organization Owner',
      email: 'owner@example.com',
      emailVerified: true,
      // @ts-ignore - Mock user object for testing
      image: null,
    },
  },
  {
    id: 'member-2',
    userId: 'user-2',
    organizationId: 'org-1',
    role: 'member' as UserRole,
    createdAt: new Date('2024-01-02T00:00:00Z'),
    user: {
      id: 'user-2',
      name: 'Organization Member',
      email: 'member@example.com',
      emailVerified: true,
      // @ts-ignore - Mock user object for testing
      image: null,
    },
  },
];

const mockInvitations: OrganizationInvitation[] = [
  {
    id: 'invite-1',
    organizationId: 'org-1',
    email: 'invited@example.com',
    role: 'member' as UserRole,
    status: 'pending',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    inviterId: 'user-1',
  },
];

const mockSession = {
  user: {
    id: 'user-1',
    name: 'Organization Owner',
    email: 'owner@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    banned: false,
    image: null,
    displayUsername: null,
  },
  session: {
    id: 'session-1',
    token: 'mock-token',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  },
};

const mockFullOrganization = {
  data: {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    logo: 'https://example.com/logo.png',
    metadata: {
      domain: 'test.com',
      autoCreated: false,
      createdFromEmail: 'test@test.com',
    },
    createdAt: new Date('2024-01-01T00:00:00Z'),
    description: 'Test organization description',
    website: 'https://test.com',
    members: mockMembers,
    invitations: mockInvitations,
  },
};

// Test components
const TestComponent: React.FC = () => {
  const {
    organization,
    userRole,
    members,
    invitations,
    isLoading,
    isLoadingMembers,
    isLoadingInvitations,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
    updateOrganization,
    cancelInvitation,
    createOrganization,
    deleteOrganization,
    canManageMembers,
    canManageOrganization,
    canInviteMembers,
  } = useOrganization();

  return (
    <div>
      <div data-testid="org-name">{organization?.name || 'No organization'}</div>
      <div data-testid="user-role">{userRole || 'No role'}</div>
      <div data-testid="members-count">{members.length}</div>
      <div data-testid="invitations-count">{invitations.length}</div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="loading-members">{isLoadingMembers ? 'loading' : 'loaded'}</div>
      <div data-testid="loading-invitations">{isLoadingInvitations ? 'loading' : 'loaded'}</div>
      <div data-testid="error">{error?.message || 'no error'}</div>
      <div data-testid="can-manage-members">{canManageMembers ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-organization">{canManageOrganization ? 'yes' : 'no'}</div>
      <div data-testid="can-invite-members">{canInviteMembers ? 'yes' : 'no'}</div>

      <button
        data-testid="invite-member-btn"
        onClick={() => inviteMember('test@example.com', 'member')}
      >
        Invite Member
      </button>
      <button data-testid="update-role-btn" onClick={() => updateMemberRole('member-2', 'admin')}>
        Update Role
      </button>
      <button data-testid="remove-member-btn" onClick={() => removeMember('member-2')}>
        Remove Member
      </button>
      <button
        data-testid="update-org-btn"
        onClick={() => updateOrganization({ name: 'Updated Org' })}
      >
        Update Organization
      </button>
      <button data-testid="cancel-invitation-btn" onClick={() => cancelInvitation('invite-1')}>
        Cancel Invitation
      </button>
      <button data-testid="create-org-btn" onClick={() => createOrganization('New Org')}>
        Create Organization
      </button>
      <button data-testid="delete-org-btn" onClick={() => deleteOrganization()}>
        Delete Organization
      </button>
    </div>
  );
};

const PermissionsTestComponent: React.FC = () => {
  const permissions = useOrganizationPermissions();

  return (
    <div>
      <div data-testid="is-owner">{permissions.isOwner ? 'yes' : 'no'}</div>
      <div data-testid="is-member">{permissions.isMember ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-members-perm">{permissions.canManageMembers ? 'yes' : 'no'}</div>
      <div data-testid="can-manage-organization-perm">
        {permissions.canManageOrganization ? 'yes' : 'no'}
      </div>
      <div data-testid="can-invite-members-perm">{permissions.canInviteMembers ? 'yes' : 'no'}</div>
      <div data-testid="can-delete-organization">
        {permissions.canDeleteOrganization ? 'yes' : 'no'}
      </div>
    </div>
  );
};

const MembersTestComponent: React.FC = () => {
  const membersData = useOrganizationMembers();

  return (
    <div>
      <div data-testid="members-hook-count">{membersData.members.length}</div>
      <div data-testid="members-hook-loading">{membersData.isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="member-count">{membersData.memberCount}</div>
      <div data-testid="members-can-manage">{membersData.canManageMembers ? 'yes' : 'no'}</div>

      <button
        data-testid="members-invite-btn"
        onClick={() => membersData.inviteMember('member@example.com', 'member')}
      >
        Invite via Hook
      </button>
      <button
        data-testid="members-update-role-btn"
        onClick={() => membersData.updateMemberRole('member-2', 'admin')}
      >
        Update Role via Hook
      </button>
      <button data-testid="members-remove-btn" onClick={() => membersData.removeMember('member-2')}>
        Remove via Hook
      </button>
    </div>
  );
};

const InvitationsTestComponent: React.FC = () => {
  const invitationsData = useOrganizationInvitations();

  return (
    <div>
      <div data-testid="invitations-hook-count">{invitationsData.invitations.length}</div>
      <div data-testid="invitations-hook-loading">
        {invitationsData.isLoading ? 'loading' : 'loaded'}
      </div>
      <div data-testid="pending-invitations-count">{invitationsData.pendingInvitations.length}</div>
      <div data-testid="invitations-can-invite">
        {invitationsData.canInviteMembers ? 'yes' : 'no'}
      </div>

      <button
        data-testid="invitations-cancel-btn"
        onClick={() => invitationsData.cancelInvitation('invite-1')}
      >
        Cancel via Hook
      </button>
    </div>
  );
};

// Error test component
const ErrorComponent: React.FC = () => {
  useOrganization(); // Should throw error outside provider
  return <div>Should not render</div>;
};

describe('OrganizationProvider', () => {
  // Suppress unhandled promise rejections during error testing
  const originalUPR = process.listeners('unhandledRejection');

  beforeAll(() => {
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', () => {
      // Suppress during testing
    });
  });

  afterAll(() => {
    process.removeAllListeners('unhandledRejection');
    originalUPR.forEach((listener) => process.on('unhandledRejection', listener));
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a real QueryClient instance and spy on its methods
    actualQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.spyOn(actualQueryClient, 'invalidateQueries');

    // Setup default mocks
    // Mock auth client hooks
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: mockRawOrganization,
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as any);

    vi.mocked(authClient.useSession).mockReturnValue({
      data: mockSession,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock useQuery for full organization
    const { useQuery, useMutation } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: mockFullOrganization,
      isLoading: false,
      error: null,
      isError: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      isPending: false,
      isRefetching: false,
      isFetching: false,
      isFetched: true,
      isFetchedAfterMount: true,
      isStale: false,
      isPlaceholderData: false,
      isPaused: false,
      failureCount: 0,
      failureReason: null,
      refetch: vi.fn(),
      remove: vi.fn(),
      fetchStatus: 'idle' as const,
      status: 'success' as const,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
    } as any);

    // Mock mutations to execute the mutation function
    vi.mocked(useMutation).mockImplementation((options: any) => {
      const mutation = {
        mutateAsync: vi.fn().mockImplementation(async (args: any) => {
          // Execute the mutation function
          let result = {};
          if (options.mutationFn) {
            result = await options.mutationFn(args);
          }
          // Execute onSuccess callback with result, args, and context
          if (options.onSuccess) {
            options.onSuccess(result, args, {});
          }
          return result;
        }),
        mutate: vi.fn(),
        data: undefined,
        error: null,
        isError: false,
        isIdle: true,
        isLoading: false,
        isPending: false,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: 'idle' as const,
        variables: undefined,
        submittedAt: 0,
        reset: vi.fn(),
        context: undefined,
      };
      return mutation as any;
    });

    // Mock organization API methods
    vi.mocked(authClient.organization.inviteMember).mockResolvedValue({});
    vi.mocked(authClient.organization.updateMemberRole).mockResolvedValue({});
    vi.mocked(authClient.organization.removeMember).mockResolvedValue({});
    vi.mocked(authClient.organization.update).mockResolvedValue({});
    vi.mocked(authClient.organization.cancelInvitation).mockResolvedValue({});
    vi.mocked(authClient.organization.create).mockResolvedValue({
      data: {
        id: 'new-org-123',
        name: 'New Org',
        slug: 'new-org',
        createdAt: new Date(),
        metadata: {},
      },
    });
    vi.mocked(authClient.organization.setActive).mockResolvedValue({});
    vi.mocked(authClient.organization.delete).mockResolvedValue({});
  });

  describe('Provider Setup', () => {
    it('should provide organization context to children', () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('org-name')).toHaveTextContent('Test Organization');
      expect(screen.getByTestId('user-role')).toHaveTextContent('owner');
      expect(screen.getByTestId('members-count')).toHaveTextContent('2');
      expect(screen.getByTestId('invitations-count')).toHaveTextContent('1');
    });

    it('should throw error when useOrganization is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<ErrorComponent />)).toThrow(
        'useOrganization must be used within OrganizationProvider',
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing organization data', () => {
      vi.mocked(authClient.useActiveOrganization).mockReturnValue({
        data: null,
        error: null,
      } as any);

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('org-name')).toHaveTextContent('No organization');
      expect(screen.getByTestId('user-role')).toHaveTextContent('No role');
    });

    it('should handle missing session data', () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
      } as any);

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('user-role')).toHaveTextContent('No role');
    });
  });

  describe('Loading States', () => {
    it('should handle loading state for organization data', async () => {
      const { useQuery } = await import('@tanstack/react-query');
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      } as any);

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
      expect(screen.getByTestId('loading-members')).toHaveTextContent('loading');
      expect(screen.getByTestId('loading-invitations')).toHaveTextContent('loading');
    });

    it('should show loaded state when data is available', () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
      expect(screen.getByTestId('loading-members')).toHaveTextContent('loaded');
      expect(screen.getByTestId('loading-invitations')).toHaveTextContent('loaded');
    });
  });

  describe('Error Handling', () => {
    it('should handle organization fetch errors', async () => {
      const testError = new Error('Failed to fetch organization');
      const { useQuery } = await import('@tanstack/react-query');
      vi.mocked(useQuery).mockReturnValue({
        data: null,
        isLoading: false,
        error: testError,
      } as any);

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch organization');
    });

    it('should handle auth client errors', () => {
      const authError = new Error('Auth failed');
      vi.mocked(authClient.useActiveOrganization).mockReturnValue({
        data: null,
        error: authError,
      } as any);

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('error')).toHaveTextContent('Auth failed');
    });
  });

  describe('User Role Detection', () => {
    it('should detect owner role correctly', () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('user-role')).toHaveTextContent('owner');
      expect(screen.getByTestId('can-manage-members')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-manage-organization')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-invite-members')).toHaveTextContent('yes');
    });

    it('should detect member role correctly', () => {
      const memberSession = {
        user: {
          id: 'user-2', // user-2 is a member
          email: 'member@example.com',
          name: 'Organization Member',
        },
      };

      // @ts-ignore - Mock session for testing purposes
      vi.mocked(authClient.useSession).mockReturnValue({
        data: memberSession,
      });

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('user-role')).toHaveTextContent('member');
      expect(screen.getByTestId('can-manage-members')).toHaveTextContent('no');
      expect(screen.getByTestId('can-manage-organization')).toHaveTextContent('no');
      expect(screen.getByTestId('can-invite-members')).toHaveTextContent('no');
    });

    it('should handle user not in organization', () => {
      const outsiderSession = {
        user: {
          id: 'user-999', // Not in organization
          email: 'outsider@example.com',
          name: 'Outsider',
        },
      };

      vi.mocked(authClient.useSession).mockReturnValue({
        data: outsiderSession,
      });

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByTestId('user-role')).toHaveTextContent('No role');
      expect(screen.getByTestId('can-manage-members')).toHaveTextContent('no');
    });
  });

  describe('Organization Management Actions', () => {
    it('should handle member invitation', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('invite-member-btn').click();
      });

      expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
        email: 'test@example.com',
        role: 'member',
      });
    });

    it('should handle member role update', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('update-role-btn').click();
      });

      expect(authClient.organization.updateMemberRole).toHaveBeenCalledWith({
        memberId: 'member-2',
        role: 'admin',
      });
    });

    it('should handle member removal', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('remove-member-btn').click();
      });

      expect(authClient.organization.removeMember).toHaveBeenCalledWith({
        memberIdOrEmail: 'member-2',
      });
    });

    it('should handle organization update', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('update-org-btn').click();
      });

      expect(authClient.organization.update).toHaveBeenCalledWith({
        data: { name: 'Updated Org', metadata: {} },
      });
    });

    it('should handle organization update with description and website', async () => {
      const TestComponent = () => {
        const { updateOrganization } = useOrganization();
        return (
          <button
            data-testid="update-org-with-details-btn"
            onClick={() =>
              updateOrganization({
                name: 'Updated Org',
                description: 'New description',
                website: 'https://new-website.com',
              })
            }
          >
            Update Org with Details
          </button>
        );
      };

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('update-org-with-details-btn').click();
      });

      expect(authClient.organization.update).toHaveBeenCalledWith({
        data: { 
          name: 'Updated Org', 
          metadata: { 
            description: 'New description',
            website: 'https://new-website.com'
          } 
        },
      });
    });

    it('should handle invitation cancellation', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('cancel-invitation-btn').click();
      });

      expect(authClient.organization.cancelInvitation).toHaveBeenCalledWith({
        invitationId: 'invite-1',
      });
    });

    it('should handle organization creation', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('create-org-btn').click();
      });

      expect(authClient.organization.create).toHaveBeenCalledWith({
        name: 'New Org',
        slug: 'new-org',
      });
    });

    it('should handle organization deletion', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('delete-org-btn').click();
      });

      expect(authClient.organization.delete).toHaveBeenCalledWith({
        organizationId: 'org-1',
      });
    });

    it('should handle deletion without active organization', async () => {
      vi.mocked(authClient.useActiveOrganization).mockReturnValue({
        data: null,
        error: null,
      });

      const { useMutation } = await import('@tanstack/react-query');
      const mockMutation = {
        mutateAsync: vi.fn().mockImplementation(async () => {
          throw new Error('No active organization to delete');
        }),
      };
      vi.mocked(useMutation).mockReturnValue(mockMutation);

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('delete-org-btn').click();
      });

      // Should attempt to call the mutation even without active org
      expect(mockMutation.mutateAsync).toHaveBeenCalled();
    });
  });

  describe('Query Invalidation', () => {
    it('should invalidate queries after member invitation', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('invite-member-btn').click();
      });

      expect(actualQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['organization-invitations'],
      });
    });

    it('should invalidate queries after member role update', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('update-role-btn').click();
      });

      expect(actualQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['full-organization'],
      });
    });

    it('should invalidate queries after organization creation', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('create-org-btn').click();
      });

      expect(actualQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['active-organization'],
      });
      expect(actualQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['organizations'],
      });
    });
  });

  describe('Slug Generation', () => {
    it('should generate slug from organization name', async () => {
      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('create-org-btn').click();
      });

      expect(authClient.organization.create).toHaveBeenCalledWith({
        name: 'New Org',
        slug: 'new-org',
      });
    });

    it('should use provided slug when creating organization', async () => {
      const TestSlugComponent: React.FC = () => {
        const { createOrganization } = useOrganization();

        return (
          <button
            data-testid="create-org-with-slug-btn"
            onClick={() => createOrganization('Custom Org', 'custom-slug')}
          >
            Create with Slug
          </button>
        );
      };

      render(
        <QueryClientProvider client={actualQueryClient}>
          <OrganizationProvider>
            <TestSlugComponent />
          </OrganizationProvider>
        </QueryClientProvider>,
      );

      await act(async () => {
        screen.getByTestId('create-org-with-slug-btn').click();
      });

      expect(authClient.organization.create).toHaveBeenCalledWith({
        name: 'Custom Org',
        slug: 'custom-slug',
      });
    });
  });
});

describe('useOrganizationPermissions Hook', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: mockRawOrganization,
      error: null,
    });

    vi.mocked(authClient.useSession).mockReturnValue({
      data: mockSession,
    });

    const { useQuery, useMutation } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: mockFullOrganization,
      isLoading: false,
      error: null,
    });

    // Mock mutations to execute the mutation function
    vi.mocked(useMutation).mockImplementation((config) => {
      const mutation = {
        mutateAsync: vi.fn().mockImplementation(async (args) => {
          // Execute the mutation function
          if (config.mutationFn) {
            await config.mutationFn(args);
          }
          // Execute onSuccess callback
          if (config.onSuccess) {
            config.onSuccess({}, args, {});
          }
          return {};
        }),
      };
      return mutation;
    });
  });

  it('should provide correct permissions for owner', () => {
    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <PermissionsTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('is-owner')).toHaveTextContent('yes');
    expect(screen.getByTestId('is-member')).toHaveTextContent('no');
    expect(screen.getByTestId('can-manage-members-perm')).toHaveTextContent('yes');
    expect(screen.getByTestId('can-manage-organization-perm')).toHaveTextContent('yes');
    expect(screen.getByTestId('can-invite-members-perm')).toHaveTextContent('yes');
    expect(screen.getByTestId('can-delete-organization')).toHaveTextContent('yes');
  });

  it('should provide correct permissions for member', () => {
    const memberSession = {
      user: {
        id: 'user-2',
        name: 'Member',
        email: 'member@example.com',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        banned: false,
        image: null,
        displayUsername: null,
      },
      session: {
        id: 'session-2',
        token: 'mock-token-2',
        userId: 'user-2',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
    };

    vi.mocked(authClient.useSession).mockReturnValue({
      data: memberSession,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <PermissionsTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('is-owner')).toHaveTextContent('no');
    expect(screen.getByTestId('is-member')).toHaveTextContent('yes');
    expect(screen.getByTestId('can-manage-members-perm')).toHaveTextContent('no');
    expect(screen.getByTestId('can-manage-organization-perm')).toHaveTextContent('no');
    expect(screen.getByTestId('can-invite-members-perm')).toHaveTextContent('no');
    expect(screen.getByTestId('can-delete-organization')).toHaveTextContent('no');
  });

  it('should provide no permissions for non-member', () => {
    const outsiderSession = {
      user: {
        id: 'user-999',
        name: 'Outsider',
        email: 'outsider@example.com',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        banned: false,
        image: null,
        displayUsername: null,
      },
      session: {
        id: 'session-999',
        token: 'mock-token-999',
        userId: 'user-999',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
    };

    vi.mocked(authClient.useSession).mockReturnValue({
      data: outsiderSession,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <PermissionsTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('is-owner')).toHaveTextContent('no');
    expect(screen.getByTestId('is-member')).toHaveTextContent('no');
    expect(screen.getByTestId('can-manage-members-perm')).toHaveTextContent('no');
    expect(screen.getByTestId('can-manage-organization-perm')).toHaveTextContent('no');
    expect(screen.getByTestId('can-invite-members-perm')).toHaveTextContent('no');
    expect(screen.getByTestId('can-delete-organization')).toHaveTextContent('no');
  });
});

describe('useOrganizationMembers Hook', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: mockRawOrganization,
      error: null,
    });

    vi.mocked(authClient.useSession).mockReturnValue({
      data: mockSession,
    });

    const { useQuery, useMutation } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: mockFullOrganization,
      isLoading: false,
      error: null,
    });

    // Mock mutations to execute the mutation function
    vi.mocked(useMutation).mockImplementation((config) => {
      const mutation = {
        mutateAsync: vi.fn().mockImplementation(async (args) => {
          // Execute the mutation function
          if (config.mutationFn) {
            await config.mutationFn(args);
          }
          // Execute onSuccess callback
          if (config.onSuccess) {
            config.onSuccess({}, args, {});
          }
          return {};
        }),
      };
      return mutation;
    });
  });

  it('should provide members data and operations', () => {
    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <MembersTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('members-hook-count')).toHaveTextContent('2');
    expect(screen.getByTestId('members-hook-loading')).toHaveTextContent('loaded');
    expect(screen.getByTestId('member-count')).toHaveTextContent('2');
    expect(screen.getByTestId('members-can-manage')).toHaveTextContent('yes');
  });

  it('should handle member operations through hook', async () => {
    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <MembersTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      screen.getByTestId('members-invite-btn').click();
    });

    expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
      email: 'member@example.com',
      role: 'member',
    });

    await act(async () => {
      screen.getByTestId('members-update-role-btn').click();
    });

    expect(authClient.organization.updateMemberRole).toHaveBeenCalledWith({
      memberId: 'member-2',
      role: 'admin',
    });

    await act(async () => {
      screen.getByTestId('members-remove-btn').click();
    });

    expect(authClient.organization.removeMember).toHaveBeenCalledWith({
      memberIdOrEmail: 'member-2',
    });
  });
});

describe('useOrganizationInvitations Hook', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: mockRawOrganization,
      error: null,
    });

    vi.mocked(authClient.useSession).mockReturnValue({
      data: mockSession,
    });

    const { useQuery, useMutation } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: mockFullOrganization,
      isLoading: false,
      error: null,
    });

    // Mock mutations to execute the mutation function
    vi.mocked(useMutation).mockImplementation((config) => {
      const mutation = {
        mutateAsync: vi.fn().mockImplementation(async (args) => {
          // Execute the mutation function
          if (config.mutationFn) {
            await config.mutationFn(args);
          }
          // Execute onSuccess callback
          if (config.onSuccess) {
            config.onSuccess({}, args, {});
          }
          return {};
        }),
      };
      return mutation;
    });
  });

  it('should provide invitations data and operations', () => {
    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <InvitationsTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('invitations-hook-count')).toHaveTextContent('1');
    expect(screen.getByTestId('invitations-hook-loading')).toHaveTextContent('loaded');
    expect(screen.getByTestId('pending-invitations-count')).toHaveTextContent('1');
    expect(screen.getByTestId('invitations-can-invite')).toHaveTextContent('yes');
  });

  it('should handle invitation operations through hook', async () => {
    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <InvitationsTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      screen.getByTestId('invitations-cancel-btn').click();
    });

    expect(authClient.organization.cancelInvitation).toHaveBeenCalledWith({
      invitationId: 'invite-1',
    });
  });

  it('should filter pending invitations correctly', async () => {
    const mixedInvitations = [
      ...mockInvitations,
      {
        id: 'invite-2',
        organizationId: 'org-1',
        email: 'accepted@example.com',
        role: 'member' as UserRole,
        status: 'accepted' as const,
        expiresAt: new Date('2024-12-31T23:59:59Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
      },
    ];

    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValue({
      data: {
        data: {
          ...mockOrganization,
          members: mockMembers,
          invitations: mixedInvitations,
        },
      },
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={actualQueryClient}>
        <OrganizationProvider>
          <InvitationsTestComponent />
        </OrganizationProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('invitations-hook-count')).toHaveTextContent('2');
    expect(screen.getByTestId('pending-invitations-count')).toHaveTextContent('1');
  });
});
