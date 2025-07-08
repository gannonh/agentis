/**
 * @fileoverview Organization preview step component for Issue #104
 * @module components/Auth/OrganizationPreviewStep
 * 
 * Shows organization details and allows users to either:
 * - Auto-join if domain join is enabled
 * - Request to join if manual approval is required
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Users, Globe, CheckCircle, UserPlus, Send } from 'lucide-react';
import { authClient } from '~/config/betterAuth';
import { cn } from '~/utils';
import { Button } from '~/components/ui';
import { NotificationSeverity } from '~/common/types';
import { useToastContext } from '~/Providers/ToastContext';

interface Organization {
  id: string;
  name: string;
  domain?: string;
  memberCount?: number;
  allowDomainJoin?: boolean;
  description?: string;
}

interface OrganizationPreviewStepProps {
  organization: Organization;
  userEmail: string;
  onNext: () => void;
  onSkip?: () => void;
  className?: string;
}

/**
 * Organization preview step component
 * 
 * Displays organization information and allows users to join.
 * Handles both auto-join (domain-based) and request-to-join flows.
 * 
 * @param props - Component props
 * @returns JSX.Element
 */
export default function OrganizationPreviewStep({
  organization,
  userEmail,
  onNext,
  onSkip,
  className,
}: OrganizationPreviewStepProps) {
  const { showToast } = useToastContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [canAutoJoin, setCanAutoJoin] = useState(false);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);

  const userDomain = userEmail.split('@')[1];
  const domainMatches = organization.domain === userDomain;

  const checkJoinEligibility = useCallback(async () => {
    try {
      const response = await fetch(`/api/organization/check-join-eligibility?organizationId=${organization.id}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCanAutoJoin(data.canAutoJoin);
      }
    } catch (error) {
      console.error('Failed to check join eligibility:', error);
      // Default to showing request-to-join if check fails
      setCanAutoJoin(false);
    } finally {
      setEligibilityChecked(true);
    }
  }, [organization.id]);

  const waitForMembershipConfirmation = useCallback(async (maxAttempts = 10, intervalMs = 500) => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`/api/organization/membership-status?organizationId=${organization.id}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isMember) {
            return true; // Membership confirmed
          }
        }
      } catch (error) {
        console.error(`Membership check attempt ${attempt + 1} failed:`, error);
      }

      // Wait before next attempt (except on last attempt)
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    return false; // Membership not confirmed after max attempts
  }, [organization.id]);

  useEffect(() => {
    checkJoinEligibility();
  }, [checkJoinEligibility]);

  const handleAutoJoin = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization/auto-join', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join organization');
      }

      // CRITICAL: Set the organization as active after successful join
      try {
        await authClient.organization.setActive({
          organizationId: organization.id,
        });
        console.log('Successfully set active organization after auto-join');
      } catch (error) {
        console.error('Failed to set active organization after auto-join:', error);
        // Don't fail the join flow, but log the error
      }

      // Wait for membership confirmation using polling
      const membershipConfirmed = await waitForMembershipConfirmation();
      
      if (!membershipConfirmed) {
        throw new Error('Failed to confirm organization membership. Please try again or contact support.');
      }

      // Show success toast only after membership is confirmed
      showToast({
        message: `Successfully joined ${organization.name}!`,
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
        duration: 3000,
      });

      // Proceed to next step only if membership is confirmed
      onNext();
    } catch (error) {
      console.error('Auto-join failed:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to join organization',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
        duration: 5000,
      });
      // Show request form as fallback
      setShowRequestForm(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestToJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/organization/request-join', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: organization.id,
          requestMessage: requestMessage.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit join request');
      }

      showToast({
        message: 'Join request sent! An admin will review your request.',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
        duration: 5000,
      });

      // Proceed to next step (they can continue with personal workspace while waiting)
      onNext();
    } catch (error) {
      console.error('Join request failed:', error);
      showToast({
        message: error instanceof Error ? error.message : 'Failed to submit join request',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while checking eligibility
  if (!eligibilityChecked) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          <span>Checking organization settings...</span>
        </div>
      </div>
    );
  }

  // Show request form if user clicked request or auto-join is not available
  if (showRequestForm || (!canAutoJoin && !showRequestForm)) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Organization preview card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
                <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {organization.name}
                </h3>
                {organization.domain && (
                  <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Globe className="h-3 w-3" />
                    {organization.domain}
                  </p>
                )}
              </div>
            </div>
          </div>

          {organization.memberCount && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              {organization.memberCount} members
            </div>
          )}
        </div>

        {/* Request form */}
        <form onSubmit={handleRequestToJoin} className="space-y-4">
          <div>
            <label
              htmlFor="request-message"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Message to admin (optional)
            </label>
            <textarea
              id="request-message"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Hi, I'd like to join the team..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Sending request...' : 'Request to Join'}
              <Send className="ml-2 h-4 w-4" />
            </Button>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                disabled={isSubmitting}
                className="w-full text-sm text-gray-600 underline hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Continue with personal workspace
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  // Auto-join available UI
  return (
    <div className={cn('space-y-6', className)}>
      {/* Organization card with auto-join indicator */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm dark:border-green-800 dark:bg-green-900/20">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-800/30">
              <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {organization.name}
              </h3>
              {organization.domain && (
                <p className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Globe className="h-3 w-3" />
                  {organization.domain}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            Auto-join enabled
          </div>
        </div>

        {organization.memberCount && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4" />
            {organization.memberCount} members
          </div>
        )}

        <div className="mt-4 rounded-md bg-green-100 p-3 dark:bg-green-800/20">
          <p className="text-sm text-green-800 dark:text-green-300">
            <CheckCircle className="mr-1 inline h-4 w-4" />
            You can automatically join this organization with your {userDomain} email
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleAutoJoin}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Joining...' : `Join ${organization.name}`}
          <UserPlus className="ml-2 h-4 w-4" />
        </Button>

        <button
          type="button"
          onClick={() => setShowRequestForm(true)}
          disabled={isSubmitting}
          className="w-full text-sm text-gray-600 underline hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-gray-100"
        >
          Request to join instead
        </button>

        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            disabled={isSubmitting}
            className="w-full text-sm text-gray-600 underline hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-gray-100"
          >
            Continue with personal workspace
          </button>
        )}
      </div>
    </div>
  );
}