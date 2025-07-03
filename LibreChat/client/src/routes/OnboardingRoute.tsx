/**
 * @fileoverview Onboarding route component with organization detection
 * @module routes/OnboardingRoute
 */

import React, { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { useLocalize } from '~/hooks';
import { useOnboardingState, OnboardingStep } from '~/hooks/useOnboardingState';
import OnboardingLayout from '~/components/Auth/OnboardingLayout';
import OrganizationDetectionStep from '~/components/Auth/OrganizationDetectionStep';
import { Button } from '~/components/ui';

/**
 * Onboarding route component for new user flow with modern design
 *
 * Handles the complete onboarding experience for new users including:
 * - Authentication state checking
 * - Organization detection based on email domain and invitation tokens
 * - Step-by-step guided setup with Slack-inspired design
 * - Progress tracking and navigation
 * - Form validation and error handling
 *
 * Features:
 * - Modern Slack-inspired layout with generous spacing
 * - URL parameter handling for invitation tokens
 * - Real-time organization detection
 * - Different UI states for various organization scenarios
 * - Accessibility compliant design
 *
 * @returns {JSX.Element} The onboarding route component
 */
export default function OnboardingRoute() {
  const localize = useLocalize();
  const { state, getProgress, goToNextStep } = useOnboardingState();

  // Form state
  const [orgName, setOrgName] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();

  // Handle organization detection result
  const handleOrganizationDetected = async (data: { 
    selectedOrganization?: any; 
    action: 'create' | 'join' | 'invite' 
  }) => {
    setIsSubmitting(true);
    setError('');

    try {
      // TODO: Implement actual organization creation/joining logic
      console.log('Organization detection result:', data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      goToNextStep();
    } catch (err) {
      setError('Failed to process organization action. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle organization creation form (fallback)
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
      // TODO: Integrate with actual organization creation API
      await new Promise((resolve) => setTimeout(resolve, 500));
      goToNextStep();
    } catch (err) {
      setError('Failed to create organization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle profile completion
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUserName = userName.trim();
    if (!trimmedUserName) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Integrate with actual profile update API
      await new Promise((resolve) => setTimeout(resolve, 500));
      goToNextStep();
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth state
  if (sessionLoading || orgsLoading) {
    return (
      <OnboardingLayout title="Loading...">
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
            <span>Checking your account...</span>
          </div>
        </div>
      </OnboardingLayout>
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
  const userEmail = session?.user?.email || '';

  const stepConfig = {
    [OnboardingStep.ORGANIZATION]: {
      title: 'Join or Create Your Organization',
      subtitle: 'Let\'s find the right workspace for you based on your email address.'
    },
    [OnboardingStep.PROFILE]: {
      title: 'Complete Your Profile',
      subtitle: 'Tell us a bit about yourself to personalize your experience.'
    },
    [OnboardingStep.TEAM]: {
      title: 'Invite Your Team',
      subtitle: 'Collaboration is better together. Invite your teammates to join.'
    },
    [OnboardingStep.WELCOME]: {
      title: 'Welcome to Agentis!',
      subtitle: 'You\'re all set up. Let\'s start your AI conversation journey.'
    }
  };

  const currentStepConfig = stepConfig[state.currentStep];

  return (
    <OnboardingLayout
      title={currentStepConfig.title}
      subtitle={currentStepConfig.subtitle}
      step={{
        current: progress.current,
        total: progress.total
      }}
      maxWidth="lg"
    >
      {/* Organization Detection Step */}
      {state.currentStep === OnboardingStep.ORGANIZATION && (
        <OrganizationDetectionStep
          email={userEmail}
          onNext={handleOrganizationDetected}
          className={isSubmitting ? 'pointer-events-none opacity-50' : ''}
        />
      )}

      {/* Profile Completion Step */}
      {state.currentStep === OnboardingStep.PROFILE && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="user-name" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Your Name
            </label>
            <input
              id="user-name"
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Enter your full name"
              maxLength={100}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !userName.trim()}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </Button>
        </form>
      )}

      {/* Team Invitation Step */}
      {state.currentStep === OnboardingStep.TEAM && (
        <div className="space-y-6 text-center">
          <div className="text-gray-600 dark:text-gray-300">
            <p className="mb-4">
              You can invite team members now or skip this step and do it later from your workspace settings.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={goToNextStep}
              className="w-full"
              size="lg"
            >
              Skip for Now
            </Button>
            
            <Button
              onClick={() => {
                // TODO: Implement team invitation flow
                console.log('Team invitation flow');
                goToNextStep();
              }}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Invite Team Members
            </Button>
          </div>
        </div>
      )}

      {/* Welcome Step */}
      {state.currentStep === OnboardingStep.WELCOME && (
        <div className="space-y-6 text-center">
          <div className="text-gray-600 dark:text-gray-300">
            <p className="text-lg mb-4">
              🎉 Congratulations! Your workspace is ready.
            </p>
            <p>
              You can now start having conversations with AI, create agents, execute code, and collaborate with your team.
            </p>
          </div>

          <Button
            onClick={() => window.location.href = '/c/new'}
            className="w-full"
            size="lg"
          >
            Start Your First Conversation
          </Button>
        </div>
      )}
    </OnboardingLayout>
  );
}
