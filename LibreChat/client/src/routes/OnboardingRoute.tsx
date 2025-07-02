/**
 * @fileoverview Onboarding route component
 * @module routes/OnboardingRoute
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { useLocalize } from '~/hooks';
import { useOnboardingState } from '~/hooks/useOnboardingState';

export default function OnboardingRoute() {
  const localize = useLocalize();
  const { state, getProgress, goToNextStep } = useOnboardingState();

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
          <div className="text-gray-600 dark:text-gray-400">{localize('com_ui_loading')}...</div>
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

  const progress = getProgress();

  const stepTitles = {
    organization: 'Create Your Organization',
    profile: 'Complete Your Profile',
    team: 'Invite Team Members',
    welcome: 'Welcome to Agentis',
  };

  return (
    <div>
      <div className="p-4">
        <h1 className="mb-4 text-center text-2xl font-semibold">{stepTitles[state.currentStep]}</h1>
        <div
          role="progressbar"
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mb-4 h-2 w-full rounded-full bg-gray-200"
        >
          <div
            className="h-2 rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        <div className="text-center text-sm text-gray-600">
          Step {progress.current} of {progress.total}
        </div>
      </div>
      <div className="px-4">
        {state.currentStep === 'organization' && (
          <form className="mx-auto max-w-md">
            <div className="mb-4">
              <label htmlFor="org-name" className="mb-2 block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              onClick={goToNextStep}
            >
              Continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
