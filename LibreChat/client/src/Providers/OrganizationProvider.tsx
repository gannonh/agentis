/**
 * @fileoverview Organization context provider using Better-auth organization hooks
 * @module Providers/OrganizationProvider
 */

import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '~/config/betterAuth';
import { dataService, type JoinRequest } from 'librechat-data-provider';
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
  joinRequests: JoinRequest[];

  // Loading states
  isLoading: boolean;
  isLoadingMembers: boolean;
  isLoadingInvitations: boolean;
  isLoadingJoinRequests: boolean;

  // Error states
  error: Error | null;

  // Organization management functions
  inviteMember: (email: string, role: UserRole) => Promise<void>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateOrganization: (data: {
    name?: string;
    description?: string;
    website?: string;
    metadata?: Record<string, any>;
    slug?: string;
    logo?: string;
  }) => Promise<void>;

  // Invitation management
  cancelInvitation: (invitationId: string) => Promise<void>;

  // Join request management
  getJoinRequests: () => Promise<void>;
  approveRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string, rejectionReason?: string) => Promise<void>;

  // Organization creation (for onboarding)
  createOrganization: (name: string, slug?: string) => Promise<OrganizationData>;

  // Organization deletion
  deleteOrganization: () => Promise<void>;

  // Permission helpers (client-side)
  canManageMembers: boolean;
  canManageOrganization: boolean;
  canInviteMembers: boolean;
  canDeleteOrganization: boolean;
  canUpdateSettings: boolean;
  canViewMembers: boolean;

  // Better Auth permission checks (server validation)
  checkPermissions: (permissions: Record<string, string[]>) => Promise<boolean>;
  hasPermission: (resource: string, actions: string[]) => Promise<boolean>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

/**
 * Organization provider component
 * Provides organization context using Better-auth hooks
 */
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Get active organization from Better-auth
  const { data: activeOrganizationResult, error: orgError } = authClient.useActiveOrganization();

  // Extract organization data
  const activeOrganization = useMemo(() => {
    return activeOrganizationResult;
  }, [activeOrganizationResult]);

  // Get current user session for role checking
  const { data: session } = authClient.useSession();

  // Get full organization with members and invitations from Better Auth
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

  // Get join requests for the organization
  const {
    data: joinRequestsData,
    isLoading: isLoadingJoinRequests,
    error: joinRequestsError,
    refetch: refetchJoinRequests,
  } = useQuery({
    queryKey: ['join-requests', activeOrganization?.id],
    queryFn: () => dataService.getOrganizationJoinRequests(activeOrganization!.id, 'pending'),
    enabled: !!activeOrganization?.id,
    staleTime: 30000, // 30 seconds
  });

  const joinRequests = useMemo(
    () => joinRequestsData?.requests || [],
    [joinRequestsData?.requests],
  );

  // Determine user role in current organization
  const userRole = useMemo(() => {
    if (!activeOrganization || !session?.user?.id || !members.length) return null;

    const memberRecord = members.find((member) => member.userId === session.user.id);
    return memberRecord?.role || null;
  }, [activeOrganization, session?.user?.id, members]);

  // Permission checks based on user role
  const permissions = useMemo(() => {
    const isOwner = userRole === 'owner';
    const isAdmin = userRole === 'admin';

    return {
      canManageMembers: isOwner || isAdmin,
      canManageOrganization: isOwner,
      canInviteMembers: isOwner || isAdmin,
      canDeleteOrganization: isOwner,
      canUpdateSettings: isOwner || isAdmin,
      canViewMembers: isOwner || isAdmin, // members can see other members too
    };
  }, [userRole]);

  // Better Auth permission checks (for server validation)
  const checkPermissions = useCallback(async (permissions: Record<string, string[]>) => {
    try {
      const result = await authClient.organization.hasPermission({ permissions });
      // Extract the success boolean from Better Auth response
      return result?.data?.success || false;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }, []);

  // Helper function to check specific permissions
  const hasPermission = useCallback(
    async (resource: string, actions: string[]) => {
      return checkPermissions({ [resource]: actions });
    },
    [checkPermissions],
  );

  // Invite member mutation
  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      await authClient.organization.inviteMember({ email, role });
    },
    onSuccess: () => {
      // Invalidate and refetch full organization (includes invitations)
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
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
      description?: string;
      website?: string;
      metadata?: Record<string, any>;
      slug?: string;
      logo?: string;
    }) => {
      // Extract description and website to store in metadata
      const { description, website, metadata = {}, ...rest } = data;

      // Prepare metadata with description and website
      const updatedMetadata = {
        ...metadata,
        ...(description !== undefined && { description }),
        ...(website !== undefined && { website }),
      };

      // Call Better Auth with metadata structure
      await authClient.organization.update({
        data: {
          ...rest,
          metadata: updatedMetadata,
        },
      });
    },
    onSuccess: () => {
      // Invalidate and refetch organization data
      queryClient.invalidateQueries({ queryKey: ['active-organization'] });
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await authClient.organization.cancelInvitation({ invitationId });
    },
    onSuccess: () => {
      // Invalidate and refetch full organization (includes invitations)
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
    },
  });

  // Approve join request mutation
  const approveJoinRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!activeOrganization?.id) {
        throw new Error('No active organization');
      }
      return await dataService.approveJoinRequest(activeOrganization.id, requestId);
    },
    onSuccess: () => {
      // Invalidate join requests and full organization to refresh member list
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
    },
  });

  // Reject join request mutation
  const rejectJoinRequestMutation = useMutation({
    mutationFn: async ({ requestId, rejectionReason }: { requestId: string; rejectionReason?: string }) => {
      if (!activeOrganization?.id) {
        throw new Error('No active organization');
      }
      return await dataService.rejectJoinRequest(activeOrganization.id, requestId, rejectionReason);
    },
    onSuccess: () => {
      // Invalidate join requests to refresh the list
      queryClient.invalidateQueries({ queryKey: ['join-requests'] });
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

      // Set the newly created organization as active
      if (result.data?.id) {
        await authClient.organization.setActive({ organizationId: result.data.id });
      }

      return result.data as OrganizationData;
    },
    onSuccess: () => {
      // Invalidate organization queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['active-organization'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['full-organization'] });
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
      description?: string;
      website?: string;
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

  // Join request management functions
  const getJoinRequests = useCallback(async () => {
    await refetchJoinRequests();
  }, [refetchJoinRequests]);

  const approveRequest = useCallback(
    async (requestId: string) => {
      await approveJoinRequestMutation.mutateAsync(requestId);
    },
    [approveJoinRequestMutation],
  );

  const rejectRequest = useCallback(
    async (requestId: string, rejectionReason?: string) => {
      await rejectJoinRequestMutation.mutateAsync({ requestId, rejectionReason });
    },
    [rejectJoinRequestMutation],
  );

  // Use organization data directly - no transformation needed
  const processedOrganization = useMemo(() => {
    // Use full organization data if available, otherwise fall back to active organization
    const orgData = fullOrganization?.data || activeOrganization;
    return orgData;
  }, [fullOrganization?.data, activeOrganization]);

  // Context value
  const contextValue = useMemo(
    () => ({
      // Data
      organization: processedOrganization,
      userRole,
      members,
      invitations,
      joinRequests,

      // Loading states
      isLoading: orgLoading,
      isLoadingMembers: orgLoading,
      isLoadingInvitations: orgLoading,
      isLoadingJoinRequests,

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
      getJoinRequests,
      approveRequest,
      rejectRequest,

      // Permissions
      ...permissions,

      // Better Auth permission checks (server validation)
      checkPermissions,
      hasPermission,
    }),
    [
      processedOrganization,
      userRole,
      members,
      invitations,
      joinRequests,
      orgLoading,
      isLoadingJoinRequests,
      orgError,
      fullOrgError,
      joinRequestsError,
      inviteMember,
      updateMemberRole,
      removeMember,
      updateOrganization,
      cancelInvitation,
      createOrganization,
      deleteOrganization,
      getJoinRequests,
      approveRequest,
      rejectRequest,
      permissions,
      checkPermissions,
      hasPermission,
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
