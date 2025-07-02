/**
 * @fileoverview Onboarding route component
 * @module routes/OnboardingRoute
 */

import React, { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { useLocalize } from '~/hooks';
import { useOnboardingState } from '~/hooks/useOnboardingState';

/**
 * Onboarding route component for new user flow
 *
 * Handles the complete onboarding experience for new users including:
 * - Authentication state checking
 * - Organization detection and creation
 * - Step-by-step guided setup
 * - Progress tracking and navigation
 * - Form validation and error handling
 *
 * The component implements proper routing guards:
 * - Redirects unauthenticated users to login
 * - Redirects users with existing organizations to chat
 * - Shows onboarding flow for authenticated users without organizations
 *
 * Features:
 * - Real-time form validation with accessibility support
 * - Loading states during async operations
 * - Error handling with user-friendly messages
 * - Progress visualization with step counter
 * - Responsive design with mobile support
 *
 * @returns {JSX.Element} The onboarding route component
 *
 * @example
 * ```tsx
 * // Used in router configuration
 * {
 *   path: '/onboarding',
 *   element: <OnboardingRoute />
 * }
 * ```
 */
export default function OnboardingRoute() {
  const localize = useLocalize();
  const { state, getProgress, goToNextStep } = useOnboardingState();

  // Form state
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();

  // Handle organization form submission
  const handleOrgSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedOrgName = orgName.trim();
    if (!trimmedOrgName) {
      setError('Organization name is required');
      return;
    }

    if (trimmedOrgName.length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    if (trimmedOrgName.length > 50) {
      setError('Organization name must be 50 characters or less');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: In Task #6 (Issue #103), this will integrate with actual organization creation
      // For now, just simulate the process and move to next step
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      goToNextStep();
    } catch (err) {
      setError('Failed to create organization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <form className="mx-auto max-w-md" onSubmit={handleOrgSubmit}>
            <div className="mb-4">
              <label htmlFor="org-name" className="mb-2 block text-sm font-medium text-gray-700">
                Organization Name
              </label>
              <input
                id="org-name"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={isSubmitting}
                className={`w-full rounded-md border px-3 py-2 transition-colors focus:outline-none focus:ring-2 ${
                  error
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } ${isSubmitting ? 'cursor-not-allowed bg-gray-100' : ''}`}
                aria-describedby={error ? 'org-name-error' : undefined}
                aria-invalid={error ? 'true' : 'false'}
                placeholder="Enter your organization name"
                minLength={2}
                maxLength={50}
              />
              {error && (
                <div
                  id="org-name-error"
                  role="alert"
                  className="mt-2 text-sm text-red-600"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !orgName.trim()}
              className={`w-full rounded-md px-4 py-2 text-white transition-colors ${
                isSubmitting || !orgName.trim()
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {isSubmitting ? 'Creating Organization...' : 'Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
