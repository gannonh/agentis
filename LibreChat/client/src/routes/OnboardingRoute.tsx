/**
 * @fileoverview Onboarding route component
 * @module routes/OnboardingRoute
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { useLocalize } from '~/hooks';

export default function OnboardingRoute() {
  const localize = useLocalize();
  
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();

  // Show loading while checking auth state
  if (sessionLoading || orgsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div 
            className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"
            role="progressbar"
            aria-label={localize('com_ui_loading')}
          />
          <div className="text-gray-600 dark:text-gray-400">
            {localize('com_ui_loading')}...
          </div>
        </div>
      </div>
    );
  }

  // No session - redirect to login
  if (!session?.user) {
    return <Navigate to="/login" replace={true} />;
  }

  // Has session and organizations - redirect to chat
  if (organizations && organizations.length > 0) {
    return <Navigate to="/c/new" replace={true} />;
  }

  return <div>Onboarding content will go here</div>;
}