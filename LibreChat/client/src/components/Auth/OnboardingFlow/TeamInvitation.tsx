/**
 * @fileoverview Team invitation component for organization owners
 * @module components/Auth/OnboardingFlow/TeamInvitation
 */

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  Mail,
  Plus,
  X,
  Send,
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { authClient } from '~/config/betterAuth';

interface InvitationData {
  email: string;
  role: 'member' | 'admin';
  status?: 'pending' | 'sending' | 'sent' | 'error';
  error?: string;
}

interface TeamInvitationData {
  invitations: InvitationData[];
}

interface TeamInvitationProps {
  organizationName: string;
  onInvitationsComplete: (data: { sentCount: number; failedCount: number }) => void;
  onSkip: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Team invitation component for organization owners
 * Allows inviting team members during onboarding with Better Auth integration
 */
export const TeamInvitation: React.FC<TeamInvitationProps> = ({
  organizationName,
  onInvitationsComplete,
  onSkip,
  isLoading = false,
  className = '',
}) => {
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TeamInvitationData>({
    defaultValues: {
      invitations: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'invitations',
  });

  const watchedInvitations = watch('invitations');

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Bulk invitation mutation
  const sendInvitationsMutation = useMutation({
    mutationFn: async (
      invitations: InvitationData[],
    ): Promise<Array<{ email: string; success: boolean; error?: string }>> => {
      const results: Array<{ email: string; success: boolean; error?: string }> = [];

      for (const invitation of invitations) {
        try {
          // Update status to sending
          const index = fields.findIndex((f) => f.email === invitation.email);
          if (index !== -1) {
            update(index, { ...invitation, status: 'sending' });
          }

          // Use Better Auth invitation method
          await authClient.organization.inviteMember({
            email: invitation.email,
            role: invitation.role,
            // Note: invitedAt timestamp is now generated server-side for consistency
            // Note: Backend handles invitation tracking and expiration automatically
          });

          results.push({ email: invitation.email, success: true });

          // Update status to sent
          if (index !== -1) {
            update(index, { ...invitation, status: 'sent' });
          }
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to send invitation';
          results.push({ email: invitation.email, success: false, error: errorMessage });

          // Update status to error
          const index = fields.findIndex((f) => f.email === invitation.email);
          if (index !== -1) {
            update(index, { ...invitation, status: 'error', error: errorMessage });
          }
        }
      }

      return results;
    },
  });

  const validateAndAddEmail = () => {
    const email = currentEmail.trim().toLowerCase();

    if (!email) {
      setEmailError('Please enter an email address');
      return;
    }

    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check for duplicates
    if (watchedInvitations.some((inv) => inv.email === email)) {
      setEmailError('This email has already been added');
      return;
    }

    // Add the invitation
    append({
      email,
      role: 'member',
      status: 'pending',
    });

    // Clear the input
    setCurrentEmail('');
    setEmailError('');
  };

  const handleBulkAdd = () => {
    const emails = bulkEmails
      .split(/[,\n]/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email && emailRegex.test(email));

    const newInvitations = emails
      .filter((email) => !watchedInvitations.some((inv) => inv.email === email))
      .map((email) => ({
        email,
        role: 'member' as const,
        status: 'pending' as const,
      }));

    newInvitations.forEach((invitation) => append(invitation));
    setBulkEmails('');
    setShowBulkInput(false);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      validateAndAddEmail();
    }
  };

  const removeInvitation = (index: number) => {
    remove(index);
  };

  const updateRole = (index: number, role: 'member' | 'admin') => {
    const invitation = fields[index];
    update(index, { ...invitation, role });
  };

  const onSubmit = async (data: TeamInvitationData) => {
    if (data.invitations.length === 0) {
      // No invitations to send, just continue
      onInvitationsComplete({ sentCount: 0, failedCount: 0 });
      return;
    }

    try {
      const results = await sendInvitationsMutation.mutateAsync(data.invitations);
      const sentCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      onInvitationsComplete({ sentCount, failedCount });
    } catch (error) {
      console.error('Failed to send invitations:', error);
      onInvitationsComplete({ sentCount: 0, failedCount: data.invitations.length });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const pendingInvitations = fields.filter((f) => f.status === 'pending');
  const canSend = pendingInvitations.length > 0 && !sendInvitationsMutation.isLoading;

  return (
    <div className={className}>
      <div className="mb-8 text-center">
        <UserPlus className="mx-auto mb-4 h-12 w-12 text-green-600 dark:text-green-400" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Invite your team
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Add team members to {organizationName}</p>
      </div>

      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" role="form">
        {/* Email input */}
        <div>
          <Label
            htmlFor="emailInput"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Invite by email
          </Label>
          <div className="mt-1 flex space-x-2">
            <Input
              id="emailInput"
              data-testid="team-email-input"
              type="email"
              value={currentEmail}
              onChange={(e) => {
                setCurrentEmail(e.target.value);
                setEmailError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="colleague@company.com"
              className="flex-1"
              disabled={sendInvitationsMutation.isLoading}
            />
            <Button
              type="button"
              onClick={validateAndAddEmail}
              disabled={!currentEmail.trim() || sendInvitationsMutation.isLoading}
              variant="outline"
              className="px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {emailError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>
          )}

          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Press Enter or click + to add email</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowBulkInput(!showBulkInput)}
              className="h-auto p-0 text-xs"
              disabled={sendInvitationsMutation.isLoading}
            >
              {showBulkInput ? 'Hide' : 'Bulk add'}
            </Button>
          </div>

          {/* Bulk email input */}
          {showBulkInput && (
            <div className="mt-4 space-y-2">
              <textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="Enter multiple emails (comma or line separated)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                rows={3}
                disabled={sendInvitationsMutation.isLoading}
              />
              <Button
                type="button"
                onClick={handleBulkAdd}
                variant="outline"
                size="sm"
                disabled={!bulkEmails.trim() || sendInvitationsMutation.isLoading}
              >
                Add emails
              </Button>
            </div>
          )}
        </div>

        {/* Invitation list */}
        {fields.length > 0 && (
          <div>
            <Label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Team invitations ({fields.length})
            </Label>
            <div className="max-h-60 space-y-2 overflow-y-auto">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      {getStatusIcon(field.status)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.email}
                      </p>
                      <div className="flex items-center space-x-2">
                        <select
                          value={field.role}
                          onChange={(e) => updateRole(index, e.target.value as 'member' | 'admin')}
                          disabled={sendInvitationsMutation.isLoading || field.status === 'sent'}
                          className="border-none bg-transparent text-xs text-gray-500 dark:text-gray-400"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        {field.status === 'error' && field.error && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            - {field.error}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => removeInvitation(index)}
                    variant="ghost"
                    size="sm"
                    disabled={sendInvitationsMutation.isLoading || field.status === 'sending'}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {fields.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
              <Send className="h-5 w-5" />
              <span className="font-medium">
                Ready to send {pendingInvitations.length} invitation
                {pendingInvitations.length !== 1 ? 's' : ''}
                {fields.length > pendingInvitations.length && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {' '}
                    ({fields.length - pendingInvitations.length} processed)
                  </span>
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Invitations will be sent via email with instructions to join {organizationName}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button
            type="button"
            onClick={onSkip}
            variant="outline"
            className="flex-1"
            disabled={sendInvitationsMutation.isLoading}
          >
            Skip for now
          </Button>
          <Button
            type="submit"
            disabled={isLoading || sendInvitationsMutation.isLoading}
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
          >
            {sendInvitationsMutation.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : canSend ? (
              <>
                Send invitations
                <Send className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Help text */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You can always invite more team members later from the organization settings
        </p>
      </div>
    </div>
  );
};
