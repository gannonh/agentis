/**
 * @fileoverview Member management component for organization owners
 * @module components/Organization/MemberManagement
 */

import React, { useState } from 'react';
import {
  Users,
  Crown,
  Mail,
  MoreVertical,
  UserPlus,
  Shield,
  Trash2,
  Search,
  X,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/DropdownMenu';
import { InvitationDialog } from './InvitationDialog';
import { useOrganization } from '~/Providers/OrganizationProvider';
import type { OrganizationMember, UserRole } from '~/config/betterAuth';

interface MemberManagementProps {
  onInviteMember?: () => void;
  className?: string;
  showHeader?: boolean;
}

/**
 * Member management component
 * Allows organization owners to view and manage team members
 */
export const MemberManagement: React.FC<MemberManagementProps> = ({
  onInviteMember,
  className = '',
  showHeader = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

  const {
    organization,
    members,
    userRole,
    canManageMembers,
    canManageOrganization,
    removeMember,
    updateMemberRole,
    invitations,
    cancelInvitation,
  } = useOrganization();

  if (!organization) {
    return null;
  }

  // Filter members based on search and role
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleRemoveMember = async (memberId: string, memberName: string, memberEmail: string) => {
    if (!canManageMembers) return;

    // In a real implementation, we'd use a proper confirmation dialog
    // For E2E tests, we'll use browser confirm with specific message
    const confirmed = window.confirm(
      `Are you sure you want to remove ${memberEmail} from the organization?`,
    );
    if (!confirmed) return;

    try {
      await removeMember(memberId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    if (!canManageMembers) return;

    try {
      await updateMemberRole(memberId, newRole);
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!canManageMembers) return;

    // In a real implementation, we'd show a confirmation dialog
    // For E2E tests, we'll just proceed
    const confirmed = window.confirm(
      `Are you sure you want to cancel the invitation for ${email}?`,
    );
    if (!confirmed) return;

    try {
      await cancelInvitation(invitationId);
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'owner') {
      return (
        <div className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
          <Crown className="mr-1 h-3 w-3" />
          Owner
        </div>
      );
    }

    if (role === 'admin') {
      return (
        <div className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
          <Shield className="mr-1 h-3 w-3" />
          Admin
        </div>
      );
    }

    return (
      <div className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <Users className="mr-1 h-3 w-3" />
        Member
      </div>
    );
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatInvitationDate = (dateValue?: Date | string | null) => {
    try {
      if (!dateValue) return 'Recent';
      const date = new Date(dateValue);
      return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'Recent';
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className={`rounded-lg bg-white shadow dark:bg-gray-800 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage your organization&apos;s team members and their roles
              </p>
            </div>

            {canManageMembers &&
              (onInviteMember ? (
                <Button
                  onClick={onInviteMember}
                  variant="default"
                  size="sm"
                  className="flex items-center"
                  data-testid="invite-member-button"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              ) : (
                <InvitationDialog />
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="Search members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="member-search-input"
            />
          </div>

          {/* Role filter */}
          <div className="sm:w-48">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              data-testid="role-filter-select"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owners</option>
              <option value="admin">Admins</option>
              <option value="member">Members</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700" data-testid="member-list">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h4 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              No members found
            </h4>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery || selectedRole !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Your organization doesn&apos;t have any members yet'}
            </p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              data-testid="member-item"
              data-member-role={member.role}
              data-member-email={member.user.email}
            >
              <div className="flex items-center justify-between">
                {/* Member info */}
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt={`${member.user.name} avatar`}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white">
                      {getAvatarInitials(member.user.name)}
                    </div>
                  )}

                  {/* Details */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4
                        className="text-sm font-medium text-gray-900 dark:text-white"
                        data-testid="member-name"
                      >
                        {member.user.name}
                      </h4>
                      <div data-testid="member-role">{getRoleBadge(member.role)}</div>
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      <p
                        className="text-sm text-gray-600 dark:text-gray-400"
                        data-testid="member-email"
                      >
                        {member.user.email}
                      </p>
                      {member.user.emailVerified && (
                        <div className="h-2 w-2 rounded-full bg-green-500" title="Email verified" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {canManageMembers && member.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2"
                        data-testid="member-actions-button"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48"
                      data-testid="member-actions-menu"
                    >
                      {/* Role change options */}
                      {member.role !== 'admin' && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.id, 'admin')}
                          data-testid="make-admin-action"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                      )}

                      {member.role !== 'member' && (
                        <DropdownMenuItem
                          onClick={() => handleUpdateRole(member.id, 'member')}
                          data-testid="make-member-action"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Make Member
                        </DropdownMenuItem>
                      )}

                      {/* Only owners can make other owners */}
                      {userRole === 'owner' && (
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'owner')}>
                          <Crown className="mr-2 h-4 w-4" />
                          Make Owner
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Resend Invitation
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() =>
                          handleRemoveMember(member.id, member.user.name, member.user.email)
                        }
                        className="text-red-600 dark:text-red-400"
                        data-testid="remove-member-action"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h4 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
              Pending Invitations ({invitations.length})
            </h4>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20"
                  data-testid={`pending-invitation-${invitation.email}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                      <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invitation.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Invited as {invitation.role} • {formatInvitationDate(invitation.createdAt)}
                      </p>
                    </div>
                  </div>

                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      data-testid="cancel-invitation-button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats footer */}
      <div className="border-t border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600 dark:text-gray-400" data-testid="member-count-display">
            Showing {filteredMembers.length} of {members.length} members
          </div>
          <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1" data-testid="owner-count">
              <Crown className="h-4 w-4" />
              <span>
                {members.filter((m) => m.role === 'owner').length} owner
                {members.filter((m) => m.role === 'owner').length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-1" data-testid="admin-count">
              <Shield className="h-4 w-4" />
              <span>
                {members.filter((m) => m.role === 'admin').length} admin
                {members.filter((m) => m.role === 'admin').length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-1" data-testid="member-count">
              <Users className="h-4 w-4" />
              <span>
                {members.filter((m) => m.role === 'member').length} member
                {members.filter((m) => m.role === 'member').length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
