/**
 * @fileoverview Team invitation component for organization owners
 * @module components/Auth/OnboardingFlow/TeamInvitation
 */

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Mail, Plus, X, Send, UserPlus, ArrowRight } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';

interface InvitationData {
  email: string;
  role: 'member' | 'owner';
}

interface TeamInvitationData {
  invitations: InvitationData[];
}

interface TeamInvitationProps {
  organizationName: string;
  onInvitationsComplete: (data: TeamInvitationData) => void;
  onSkip: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Team invitation component for organization owners
 * Allows inviting team members during onboarding
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'invitations',
  });

  const watchedInvitations = watch('invitations');

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    });

    // Clear the input
    setCurrentEmail('');
    setEmailError('');
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

  const onSubmit = (data: TeamInvitationData) => {
    onInvitationsComplete(data);
  };

  return (
    <div className={className}>
      <div className="mb-8 text-center">
        <UserPlus className="mx-auto mb-4 h-12 w-12 text-green-600 dark:text-green-400" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Invite your team
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Add team members to {organizationName}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              type="email"
              value={currentEmail}
              onChange={(e) => {
                setCurrentEmail(e.target.value);
                setEmailError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="colleague@company.com"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={validateAndAddEmail}
              disabled={!currentEmail.trim()}
              variant="outline"
              className="px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {emailError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>
          )}

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Press Enter or click + to add email
          </p>
        </div>

        {/* Invitation list */}
        {fields.length > 0 && (
          <div>
            <Label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Team invitations ({fields.length})
            </Label>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Will be invited as member
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => removeInvitation(index)}
                    variant="ghost"
                    size="sm"
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
                Ready to send {fields.length} invitation{fields.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              Invitations will be sent via email with instructions to join {organizationName}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-3">
          <Button type="button" onClick={onSkip} variant="outline" className="flex-1">
            Skip for now
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
          >
            {isLoading ? (
              'Sending...'
            ) : fields.length > 0 ? (
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
