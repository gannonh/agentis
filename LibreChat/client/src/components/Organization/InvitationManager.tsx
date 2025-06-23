/**
 * @fileoverview Invitation manager component for organization owners
 * @module components/Organization/InvitationManager
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Mail,
  Plus,
  X,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/Select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/DropdownMenu';
import { useOrganization } from '~/Providers/OrganizationProvider';
import type { OrganizationInvitation, UserRole } from '~/config/betterAuth';

interface InviteFormData {
  email: string;
  role: UserRole;
}

interface InvitationManagerProps {
  className?: string;
}

/**
 * Invitation manager component
 * Allows organization owners to send and manage member invitations
 */
export const InvitationManager: React.FC<InvitationManagerProps> = ({ className = '' }) => {
  const {
    organization,
    invitations,
    isLoadingInvitations,
    canInviteMembers,
    inviteMember,
    cancelInvitation,
  } = useOrganization();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    defaultValues: {
      email: '',
      role: 'member',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    try {
      await inviteMember(data.email, data.role);
      reset();
    } catch (error) {
      console.error('Failed to send invitation:', error);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    // Note: Better Auth doesn't have a built-in resend feature
    // You would need to implement this by canceling and re-inviting
    try {
      const invitation = invitations.find((inv) => inv.id === invitationId);
      if (invitation) {
        await cancelInvitation(invitationId);
        await inviteMember(invitation.email, invitation.role);
      }
    } catch (error) {
      console.error('Failed to resend invitation:', error);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const copyInvitationLink = (invitationId: string) => {
    const link = `${window.location.origin}/invite/${invitationId}`;
    navigator.clipboard.writeText(link);
    // You could add a toast notification here
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'expired':
        return 'Expired';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

    if (role === 'owner') {
      return (
        <span
          className={`${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300`}
        >
          Owner
        </span>
      );
    }

    return (
      <span
        className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300`}
      >
        Member
      </span>
    );
  };

  if (!organization || !canInviteMembers) {
    return (
      <div className="py-12 text-center">
        <Mail className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don&apos;t have permission to manage invitations.
        </p>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');
  const completedInvitations = invitations.filter((inv) => inv.status !== 'pending');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Send New Invitation */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Send Invitation
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Email Input */}
            <div className="md:col-span-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address',
                  },
                })}
                placeholder="colleague@company.com"
                className="mt-1"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Role Select */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Role</Label>
              <Select
                value={watch('role')}
                onValueChange={(value) => setValue('role', value as UserRole)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? (
              'Sending...'
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pending Invitations ({pendingInvitations.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                      <Mail className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invitation.email}
                        </p>
                        {getRoleBadge(invitation.role)}
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(invitation.status)}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getStatusLabel(invitation.status)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sent{' '}
                        {invitation.createdAt
                          ? new Date(invitation.createdAt).toLocaleDateString()
                          : 'Recently'}
                        {invitation.expiresAt && (
                          <> • Expires {new Date(invitation.expiresAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Plus className="h-4 w-4 rotate-45" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Resend Invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyInvitationLink(invitation.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Invitation Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCancelInvitation(invitation.id)}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel Invitation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitation History */}
      {completedInvitations.length > 0 && (
        <div className="rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="border-b border-gray-200 p-6 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Invitation History
            </h3>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {completedInvitations.map((invitation) => (
              <div key={invitation.id} className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    {getStatusIcon(invitation.status)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invitation.email}
                      </p>
                      {getRoleBadge(invitation.role)}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getStatusLabel(invitation.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Sent{' '}
                      {invitation.createdAt
                        ? new Date(invitation.createdAt).toLocaleDateString()
                        : 'Recently'}
                      {invitation.status === 'accepted' && <> • Accepted</>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {invitations.length === 0 && !isLoadingInvitations && (
        <div className="py-12 text-center">
          <Mail className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            No invitations yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Send your first invitation to start building your team.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoadingInvitations && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading invitations...</p>
        </div>
      )}
    </div>
  );
};
