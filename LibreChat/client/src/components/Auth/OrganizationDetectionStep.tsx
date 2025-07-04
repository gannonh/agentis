/**
 * @fileoverview Organization creation step component
 * @module components/Auth/OrganizationCreationStep
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { Button } from '~/components/ui';
import { authUtils } from '~/config/betterAuth';

interface DetectionResult {
  isPublicDomain: boolean;
  domain: string;
  hasOrganization: boolean;
  organizations: Array<{
    _id: string;
    name: string;
    domain?: string;
  }>;
  isInvited?: boolean;
  invitation?: {
    id: string;
    organization: {
      id: string;
      name: string;
    };
  };
}

interface OrganizationCreationStepProps {
  email: string;
  userName?: string;
  onNext: (data: {
    action: 'create' | 'skip' | 'join' | 'invite';
    organizationName?: string;
    enableDomainJoin?: boolean;
    organizationId?: string;
  }) => void;
  className?: string;
}

/**
 * Organization creation step component
 *
 * Provides a simple organization creation form matching Slack's onboarding flow.
 * Handles:
 * - Invitation acceptance (if present)
 * - Organization detection to prevent duplicate domains
 * - Organization creation with optional domain auto-join
 * - Skip for personal workspace
 *
 * @param props - Component props
 * @returns JSX.Element
 */
export default function OrganizationCreationStep({
  email,
  userName,
  onNext,
  className,
}: OrganizationCreationStepProps) {
  const localize = useLocalize();
  const [searchParams] = useSearchParams();
  const [organizationName, setOrganizationName] = useState('');
  const [enableDomainJoin, setEnableDomainJoin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);

  const inviteToken = searchParams.get('invite') || searchParams.get('inviteToken');
  const emailDomain = authUtils.getEmailDomain(email);

  useEffect(() => {
    detectOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, inviteToken]);

  const detectOrganization = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const requestBody: { email: string; inviteToken?: string } = { email };
      if (inviteToken) {
        requestBody.inviteToken = inviteToken;
      }

      const response = await fetch('/api/organization/detect-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to detect organization');
      }

      const result: DetectionResult = await response.json();
      setDetectionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect organization');
      // Set a default result on error to allow manual organization creation
      setDetectionResult({
        isPublicDomain: true,
        domain: emailDomain,
        hasOrganization: false,
        organizations: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = organizationName.trim();

    if (!trimmedName) {
      setError('Organization name is required');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Organization name must be 50 characters or less');
      return;
    }

    setIsSubmitting(true);
    onNext({
      action: 'create',
      organizationName: trimmedName,
      enableDomainJoin: enableDomainJoin && !detectionResult?.isPublicDomain,
    });
  };

  const handleSkip = () => {
    // Create personal workspace when skipping
    const personalWorkspaceName = userName
      ? `${userName.split(' ')[0]}'s workspace`
      : 'Personal workspace';
    onNext({
      action: 'skip',
      organizationName: personalWorkspaceName,
      enableDomainJoin: false,
    });
  };

  if (isLoading) {
    return (
      <div className={cn('py-8 text-center', className)}>
        <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          <span>Setting up your workspace...</span>
        </div>
      </div>
    );
  }

  if (!detectionResult) {
    return null;
  }

  // Handle invitation flow - automatically accept
  if (detectionResult.isInvited && detectionResult.invitation) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            You&apos;re invited!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            You&apos;ve been invited to join{' '}
            <strong>{detectionResult.invitation.organization.name}</strong>
          </p>
        </div>

        <Button
          onClick={() =>
            onNext({
              action: 'invite',
              organizationId: detectionResult.invitation?.organization.id,
            })
          }
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          Join {detectionResult.invitation.organization.name}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // If domain already has an organization, prevent creating another
  if (detectionResult.hasOrganization && !detectionResult.isPublicDomain) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Organization exists for {detectionResult.domain}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            An organization already exists for your domain. You&apos;ll need to request access from
            an admin.
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Contact your IT administrator or the person who set up Agentis for your company to get
            an invitation.
          </p>
        </div>

        <Button onClick={handleSkip} disabled={isSubmitting} className="w-full" size="lg">
          Create personal workspace instead
        </Button>
      </div>
    );
  }

  // Standard organization creation form
  return (
    <div className={cn('space-y-6', className)}>
      <form onSubmit={handleCreateSubmit} className="space-y-6">
        <div>
          <input
            id="org-name"
            type="text"
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="Acme Inc., Marketing Team, etc."
            maxLength={50}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>

        {!detectionResult.isPublicDomain && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="domain-join"
              checked={enableDomainJoin}
              onChange={(e) => setEnableDomainJoin(e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <label htmlFor="domain-join" className="text-sm text-gray-700 dark:text-gray-300">
              Let anyone with an @{emailDomain} email join this workspace
            </label>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="submit"
            disabled={!organizationName.trim() || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Creating...' : 'Next'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full text-sm text-gray-600 underline hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-gray-100"
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
