/**
 * @fileoverview Organization detection component for onboarding flow
 * @module components/Auth/OnboardingFlow/OrganizationDetection
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, Plus } from 'lucide-react';
import { authClient } from '~/config/betterAuth';
import type { OrganizationData } from '~/config/betterAuth';

interface OrganizationDetectionProps {
  email: string;
  onOrganizationDetected: (org: OrganizationData | null, willCreateNew: boolean) => void;
  className?: string;
}

/**
 * Component that detects if user's email domain has an existing organization
 * Shows different UI based on whether they'll join existing or create new org
 */
export const OrganizationDetection: React.FC<OrganizationDetectionProps> = ({
  email,
  onOrganizationDetected,
  className = '',
}) => {
  const [domain, setDomain] = useState<string>('');

  // Extract domain from email
  useEffect(() => {
    if (email) {
      const emailDomain = email.split('@')[1];
      setDomain(emailDomain);
    }
  }, [email]);

  // Check if organization exists for this domain
  const {
    data: existingOrg,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['organization-by-domain', domain],
    queryFn: async () => {
      if (!domain) return null;

      // Note: This would be a custom endpoint to check organization by domain
      // The Better-auth organization plugin doesn't have this built-in,
      // so we'd need to implement this on the backend
      try {
        const response = await fetch(`/api/auth/organization/check-domain?domain=${domain}`);
        if (response.ok) {
          const data = await response.json();
          return data.organization || null;
        }
        return null;
      } catch (err) {
        console.warn('Could not check domain organization:', err);
        return null;
      }
    },
    enabled: !!domain,
    staleTime: 300000, // 5 minutes
  });

  // Notify parent component when organization detection is complete
  useEffect(() => {
    if (!isLoading && domain) {
      onOrganizationDetected(existingOrg || null, !existingOrg);
    }
  }, [existingOrg, isLoading, domain, onOrganizationDetected]);

  if (isLoading) {
    return (
      <div className={`text-center ${className}`}>
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p className="text-gray-600 dark:text-gray-400">Checking for existing organization...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center ${className}`}>
        <div className="mb-4 text-yellow-600 dark:text-yellow-400">
          <Building2 className="mx-auto mb-2 h-12 w-12" />
          <p>We&apos;ll create a new organization for you</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Unable to check for existing organizations
        </div>
      </div>
    );
  }

  if (existingOrg) {
    // User will join existing organization
    return (
      <div className={`text-center ${className}`}>
        <div className="mb-6 text-green-600 dark:text-green-400">
          <Users className="mx-auto mb-4 h-16 w-16" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            You&apos;ll join {existingOrg.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {existingOrg.memberCount || 'Several'} team members are already using Agentis
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300">
            <Building2 className="h-5 w-5" />
            <span className="font-medium">{domain}</span>
          </div>
          <p className="mt-2 text-sm text-green-600 dark:text-green-400">
            You&apos;ll be added as a team member
          </p>
        </div>
      </div>
    );
  }

  // User will create new organization
  return (
    <div className={`text-center ${className}`}>
      <div className="mb-6 text-blue-600 dark:text-blue-400">
        <Plus className="mx-auto mb-4 h-16 w-16" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          You&apos;ll create a new organization
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Set up {domain} on Agentis and invite your team
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-center justify-center space-x-2 text-blue-700 dark:text-blue-300">
          <Building2 className="h-5 w-5" />
          <span className="font-medium">{domain}</span>
        </div>
        <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
          You&apos;ll be the organization owner
        </p>
      </div>
    </div>
  );
};
