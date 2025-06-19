import React from 'react';
import { useOrganizationDetection } from '~/hooks';
import { Spinner } from '~/components/svg';

interface OrganizationDetectionDisplayProps {
  email: string;
  className?: string;
}

/**
 * Component to display organization detection results based on email domain
 * Shows whether user will join existing org or create new one
 */
export const OrganizationDetectionDisplay: React.FC<OrganizationDetectionDisplayProps> = ({
  email,
  className = '',
}) => {
  const { organization, isNewDomain, isLoading, domain } = useOrganizationDetection(email);

  // Don't show anything if no valid email
  if (!email || !domain) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 ${className}`}>
        <Spinner className="h-4 w-4" />
        <span>Checking organization...</span>
      </div>
    );
  }

  // Existing organization
  if (organization) {
    return (
      <div className={`rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300 ${className}`}>
        <p className="font-medium">
          You'll join the existing <strong>{organization.name}</strong> organization
        </p>
        {organization.memberCount && (
          <p className="mt-1 text-xs opacity-80">
            {organization.memberCount} member{organization.memberCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    );
  }

  // New organization
  if (isNewDomain) {
    return (
      <div className={`rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300 ${className}`}>
        <p className="font-medium">
          You'll create a new organization for <strong>{domain}</strong>
        </p>
        <p className="mt-1 text-xs opacity-80">
          You'll be the organization owner
        </p>
      </div>
    );
  }

  return null;
};

export default OrganizationDetectionDisplay; 