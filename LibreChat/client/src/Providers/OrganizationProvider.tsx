/**
 * @fileoverview Organization context provider using Better-auth organization hooks
 * @module Providers/OrganizationProvider
 */

import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '~/config/betterAuth';
import type {
  OrganizationData,
  OrganizationMember,
  OrganizationInvitation,
  UserRole,
} from '~/config/betterAuth';

/**
 * Organization context interface
 */
interface OrganizationContextType {
  // Data
  organization: OrganizationData | null;
  userRole: UserRole | null;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];

  // Loading states
  isLoading: boolean;
  isLoadingMembers: boolean;
  isLoadingInvitations: boolean;

  // Error states
  error: Error | null;

  // Organization management functions
  inviteMember: (email: string, role: UserRole) => Promise<void>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateOrganization: (data: {
    name?: string;
    metadata?: Record<string, any>;
    slug?: string;
    logo?: string;
  }) => Promise<void>;

  // Invitation management
  cancelInvitation: (invitationId: string) => Promise<void>;

  // Organization creation (for onboarding)
  createOrganization: (name: string, slug?: string) => Promise<OrganizationData>;

  // Organization deletion
  deleteOrganization: () => Promise<void>;

  // Permission helpers
  canManageMembers: boolean;
  canManageOrganization: boolean;
  canInviteMembers: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

/**
 * Organization provider component
 * Provides organization context using Better-auth hooks
 */
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Get active organization from Better-auth
  const { data: activeOrganization, error: orgError } = authClient.useActiveOrganization();

  // Get current user session for role checking
  const { data: session } = authClient.useSession();

  // Get full organization with members and invitations
  const {
    data: fullOrganization,
    isLoading: orgLoading,
    error: fullOrgError,
  } = useQuery({
    queryKey: ['full-organization', activeOrganization?.id],
    queryFn: () => authClient.organization.getFullOrganization(),
    enabled: !!activeOrganization?.id,
    staleTime: 30000, // 30 seconds
  });

  const members = useMemo(
    () => fullOrganization?.data?.members || [],
    [fullOrganization?.data?.members],
  );
  const invitations = useMemo(
    () => fullOrganization?.data?.invitations || [],
    [fullOrganization?.data?.invitations],
  );

  // Determine user role in current organization
  const userRole = useMemo(() => {
    if (!session?.user?.id || !members.length) return null;

    const memberRecord = members.find((member) => member.userId === session.user.id);
    return memberRecord?.role || null;
  }, [session?.user?.id, members]);

  // Permission checks based on user role
  const permissions = useMemo(() => {
    const isOwner = userRole === 'owner';

    return {
      canManageMembers: isOwner,
      canManageOrganization: isOwner,
      canInviteMembers: isOwner,
    };
  }, [userRole]);

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      await authClient.organization.inviteMember({ email, role });
    },
    onSuccess: () => {
      // Invalidate and refetch invitations
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
    },
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: UserRole }) => {
      await authClient.organization.updateMemberRole({ memberId, role });
    },
    onSuccess: () => {
      // Invalidate and refetch full organization
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await authClient.organization.removeMember({ memberIdOrEmail: memberId });
    },
    onSuccess: () => {
      // Invalidate and refetch full organization
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
    },
  });

  // Update organization mutation
  const updateOrganizationMutation = useMutation({
    mutationFn: async (data: {
      name?: string;
      metadata?: Record<string, any>;
      slug?: string;
      logo?: string;
    }) => {
      await authClient.organization.update({ data });
    },
    onSuccess: () => {
      // Invalidate and refetch organization data
      queryClient.invalidateQueries({ queryKey: ['active-organization'] });
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await authClient.organization.cancelInvitation({ invitationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations'] });
    },
  });

  // Create organization mutation (for onboarding)
  const createOrganizationMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug?: string }) => {
      const orgSlug =
        slug ||
        name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      const result = await authClient.organization.create({ name, slug: orgSlug });
      return result.data as OrganizationData;
    },
    onSuccess: () => {
      // Invalidate organization queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['active-organization'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  // Delete organization mutation
  const deleteOrganizationMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganization?.id) {
        throw new Error('No active organization to delete');
      }
      await authClient.organization.delete({ organizationId: activeOrganization.id });
    },
    onSuccess: () => {
      // Invalidate all organization queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['active-organization'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
    },
  });

  // Callback functions
  const inviteMember = useCallback(
    async (email: string, role: UserRole) => {
      await inviteMemberMutation.mutateAsync({ email, role });
    },
    [inviteMemberMutation],
  );

  const updateMemberRole = useCallback(
    async (memberId: string, role: UserRole) => {
      await updateMemberRoleMutation.mutateAsync({ memberId, role });
    },
    [updateMemberRoleMutation],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      await removeMemberMutation.mutateAsync(memberId);
    },
    [removeMemberMutation],
  );

  const updateOrganization = useCallback(
    async (data: {
      name?: string;
      metadata?: Record<string, any>;
      slug?: string;
      logo?: string;
    }) => {
      await updateOrganizationMutation.mutateAsync(data);
    },
    [updateOrganizationMutation],
  );

  const cancelInvitation = useCallback(
    async (invitationId: string) => {
      await cancelInvitationMutation.mutateAsync(invitationId);
    },
    [cancelInvitationMutation],
  );

  const createOrganization = useCallback(
    async (name: string, slug?: string) => {
      const result = await createOrganizationMutation.mutateAsync({ name, slug });
      return result;
    },
    [createOrganizationMutation],
  );

  const deleteOrganization = useCallback(async () => {
    await deleteOrganizationMutation.mutateAsync();
  }, [deleteOrganizationMutation]);

  // Context value
  const contextValue = useMemo(
    () => ({
      // Data
      organization: activeOrganization || null,
      userRole,
      members,
      invitations,

      // Loading states
      isLoading: orgLoading,
      isLoadingMembers: orgLoading,
      isLoadingInvitations: orgLoading,

      // Error states
      error: (orgError || fullOrgError) as Error | null,

      // Functions
      inviteMember,
      updateMemberRole,
      removeMember,
      updateOrganization,
      cancelInvitation,
      createOrganization,
      deleteOrganization,

      // Permissions
      ...permissions,
    }),
    [
      activeOrganization,
      userRole,
      members,
      invitations,
      orgLoading,
      orgError,
      fullOrgError,
      inviteMember,
      updateMemberRole,
      removeMember,
      updateOrganization,
      cancelInvitation,
      createOrganization,
      deleteOrganization,
      permissions,
    ],
  );

  return (
    <OrganizationContext.Provider value={contextValue}>{children}</OrganizationContext.Provider>
  );
}

/**
 * Hook to use organization context
 * Must be used within OrganizationProvider
 */
export const useOrganization = () => {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }

  return context;
};

/**
 * Hook to check if user has specific organization permissions
 */
export const useOrganizationPermissions = () => {
  const { userRole } = useOrganization();

  return useMemo(
    () => ({
      isOwner: userRole === 'owner',
      isMember: userRole === 'member',
      canManageMembers: userRole === 'owner',
      canManageOrganization: userRole === 'owner',
      canInviteMembers: userRole === 'owner',
      canDeleteOrganization: userRole === 'owner',
    }),
    [userRole],
  );
};

/**
 * Hook for organization member management
 * Returns member-specific operations
 */
export const useOrganizationMembers = () => {
  const {
    members,
    isLoadingMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
    canManageMembers,
  } = useOrganization();

  return {
    members,
    isLoading: isLoadingMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
    canManageMembers,
    memberCount: members.length,
  };
};

/**
 * Hook for organization invitation management
 */
export const useOrganizationInvitations = () => {
  const { invitations, isLoadingInvitations, cancelInvitation, canInviteMembers } =
    useOrganization();

  return {
    invitations,
    isLoading: isLoadingInvitations,
    cancelInvitation,
    canInviteMembers,
    pendingInvitations: invitations.filter((inv) => inv.status === 'pending'),
  };
};
