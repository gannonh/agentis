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

  // Debug: log the email and domain values
  console.log('OrganizationDetectionDisplay:', { email, domain, isLoading, organization });

  // Don't show anything if no valid email
  if (!email || !domain) {
    return (
      <div className={`text-center ${className}`}>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-8 dark:border-yellow-700 dark:bg-yellow-900/20">
          <div className="text-yellow-600 dark:text-yellow-400">
            <svg className="mx-auto mb-4 h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium">Email not found</p>
            <p className="text-xs mt-1">Debug: email="{email}", domain="{domain}"</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`text-center ${className}`}>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 dark:border-blue-700 dark:bg-blue-900/20">
          <div className="flex items-center justify-center">
            <Spinner className="mr-3 h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                Looking for your organization...
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Checking if <strong>{domain}</strong> has an existing workspace
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Existing organization
  if (organization) {
    return (
      <div className={`text-center ${className}`}>
        <div className="rounded-lg border border-green-200 bg-green-50 p-8 dark:border-green-700 dark:bg-green-900/20">
          <div className="text-green-600 dark:text-green-400">
            <svg className="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mb-2 text-xl font-semibold text-green-900 dark:text-green-100">
              Great! You'll join {organization.name}
            </h3>
            <div className="mb-4 text-sm text-green-700 dark:text-green-300">
              <p>
                <strong>{domain}</strong> already has a workspace on LibreChat
              </p>
              {organization.memberCount && organization.memberCount > 0 && (
                <p className="mt-1">
                  {organization.memberCount} team member{organization.memberCount !== 1 ? 's are' : ' is'} already using LibreChat
                </p>
              )}
            </div>
            <div className="rounded-md border border-green-300 bg-green-100 px-4 py-2 dark:border-green-600 dark:bg-green-800/30">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                You'll be added as a team member
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New organization
  if (isNewDomain) {
    return (
      <div className={`text-center ${className}`}>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 dark:border-blue-700 dark:bg-blue-900/20">
          <div className="text-blue-600 dark:text-blue-400">
            <svg className="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="mb-2 text-xl font-semibold text-blue-900 dark:text-blue-100">
              You'll create a workspace for {domain}
            </h3>
            <div className="mb-4 text-sm text-blue-700 dark:text-blue-300">
              <p>
                <strong>{domain}</strong> doesn't have an Agentis workspace yet.
              </p>
              <p className="mt-1">You'll be the first person from your organization to join!</p>
            </div>
            <div className="rounded-md border border-blue-300 bg-blue-100 px-4 py-2 dark:border-blue-600 dark:bg-blue-800/30">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                You'll be the workspace owner and can invite team members
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default OrganizationDetectionDisplay;
