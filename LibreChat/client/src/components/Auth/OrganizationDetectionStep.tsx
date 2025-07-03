/**
 * @fileoverview Organization detection step component
 * @module components/Auth/OrganizationDetectionStep
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, Users, Plus, ArrowRight, Shield, Mail, CheckCircle } from 'lucide-react';
import { cn } from '~/utils';
import { useLocalize } from '~/hooks';
import { Button } from '~/components/ui';

interface Organization {
  _id: string;
  name: string;
  domain?: string;
  memberCount?: number;
}

interface DetectionResult {
  isPublicDomain: boolean;
  bypassDomainCheck?: boolean;
  domain: string;
  hasOrganization: boolean;
  organizations: Organization[];
  canAutoJoin: boolean;
  isInvited?: boolean;
  invitation?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
    organization: {
      id: string;
      name: string;
      domain: string;
      slug: string;
    };
  };
  invitationError?: string;
}

interface OrganizationDetectionStepProps {
  email: string;
  onNext: (data: { selectedOrganization?: Organization; action: 'create' | 'join' | 'invite' }) => void;
  className?: string;
}

/**
 * Organization detection step component
 * 
 * Handles organization detection logic based on email domain and invitation tokens.
 * Displays appropriate UI for different scenarios:
 * - Join invited organization
 * - Create new organization (public domains)
 * - Auto-join organization (domain allows)
 * - Request to join organization
 * 
 * @param props - Component props
 * @returns JSX.Element
 */
export default function OrganizationDetectionStep({
  email,
  onNext,
  className
}: OrganizationDetectionStepProps) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  // Extract invitation token from URL
  const inviteToken = searchParams.get('invite') || searchParams.get('inviteToken');

  useEffect(() => {
    detectOrganization();
  }, [email, inviteToken]);

  const detectOrganization = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const requestBody: { email: string; inviteToken?: string } = { email };
      if (inviteToken) {
        requestBody.inviteToken = inviteToken;
      }

      const response = await fetch('/api/auth/organization/detect-domain', {
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

      // Auto-select organization for invitation flow
      if (result.isInvited && result.organizations.length === 1) {
        setSelectedOrganization(result.organizations[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect organization');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: 'create' | 'join' | 'invite') => {
    onNext({
      selectedOrganization: selectedOrganization || undefined,
      action
    });
  };

  if (isLoading) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          <span>Detecting your organization...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-red-600 dark:text-red-400 mb-4">
          <Shield className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
        <Button
          onClick={detectOrganization}
          variant="outline"
          size="sm"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!detectionResult) {
    return null;
  }

  // Invitation flow - user has valid invitation
  if (detectionResult.isInvited && detectionResult.invitation) {
    const { invitation } = detectionResult;
    
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            You're invited!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Join <strong>{invitation.organization.name}</strong> as a {invitation.role}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {invitation.organization.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {invitation.organization.domain}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Invited as: <span className="font-medium">{invitation.role}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => handleAction('invite')}
          className="w-full"
          size="lg"
        >
          Join {invitation.organization.name}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Invitation error
  if (detectionResult.invitationError) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Invitation Issue
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {detectionResult.invitationError}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Continuing with standard organization detection...
          </p>
        </div>
      </div>
    );
  }

  // Public domain - create new organization
  if (detectionResult.isPublicDomain && !detectionResult.hasOrganization) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mb-4">
            <Plus className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Create Your Organization
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Since you're using a personal email ({detectionResult.domain}), 
            you'll need to create a new organization.
          </p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
          <h3 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">
            What you'll get:
          </h3>
          <ul className="space-y-1 text-sm text-indigo-700 dark:text-indigo-200">
            <li>• Your own workspace</li>
            <li>• Ability to invite team members</li>
            <li>• Organization-level settings and controls</li>
            <li>• Custom branding options</li>
          </ul>
        </div>

        <Button
          onClick={() => handleAction('create')}
          className="w-full"
          size="lg"
        >
          Create New Organization
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Corporate domain with existing organization(s)
  if (detectionResult.hasOrganization && detectionResult.organizations.length > 0) {
    const canAutoJoin = detectionResult.canAutoJoin;
    const multipleOrgs = detectionResult.organizations.length > 1;

    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full mb-4">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {canAutoJoin ? 'Join Your Organization' : 'Organization Found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {canAutoJoin 
              ? `We found your organization for ${detectionResult.domain}`
              : `We found ${detectionResult.organizations.length} organization${detectionResult.organizations.length > 1 ? 's' : ''} for ${detectionResult.domain}`
            }
          </p>
        </div>

        <div className="space-y-3">
          {detectionResult.organizations.map((org) => (
            <div
              key={org._id}
              className={cn(
                'border rounded-lg p-4 cursor-pointer transition-all',
                'hover:border-indigo-300 hover:shadow-sm',
                selectedOrganization?._id === org._id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
              )}
              onClick={() => setSelectedOrganization(org)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {org.name}
                    </div>
                    {org.domain && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {org.domain}
                      </div>
                    )}
                  </div>
                </div>
                {org.memberCount && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="h-4 w-4" />
                    <span>{org.memberCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleAction('join')}
            disabled={!selectedOrganization}
            className="w-full"
            size="lg"
          >
            {canAutoJoin ? 'Join Organization' : 'Request to Join'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {!canAutoJoin && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              An admin will need to approve your request to join
            </p>
          )}
        </div>
      </div>
    );
  }

  // Corporate domain but no organization exists
  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
          <Building2 className="h-8 w-8 text-gray-600 dark:text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Create Organization for {detectionResult.domain}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Be the first to create an organization for your company domain.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
          As the first member, you'll be able to:
        </h3>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <li>• Set up the organization for your team</li>
          <li>• Control who can join automatically</li>
          <li>• Manage organization settings</li>
          <li>• Invite colleagues from {detectionResult.domain}</li>
        </ul>
      </div>

      <Button
        onClick={() => handleAction('create')}
        className="w-full"
        size="lg"
      >
        Create Organization
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}