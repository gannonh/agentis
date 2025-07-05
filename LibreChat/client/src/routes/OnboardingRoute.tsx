/**
 * @fileoverview Onboarding route component with organization detection
 * @module routes/OnboardingRoute
 */

import React, { useState, FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { useOnboardingState, OnboardingStep } from '~/hooks/useOnboardingState';
import OnboardingLayout from '~/components/Auth/OnboardingLayout';
import OrganizationDetectionStep from '~/components/Auth/OrganizationDetectionStep';
import { Button } from '~/components/ui';
import { useToastContext } from '~/Providers/ToastContext';
import { NotificationSeverity } from '~/common/types';

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
 * @returns The onboarding route component
 */
export default function OnboardingRoute() {
  const navigate = useNavigate();
  const { state, getProgress, goToNextStep } = useOnboardingState();
  const { showToast } = useToastContext();

  // Form state
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();

  // Robust slug generation function with fallbacks
  const generateSlug = (name: string, fallbackPrefix = 'org'): string => {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    // If slug is empty after processing (e.g., "!!!" -> ""), use fallback
    if (!baseSlug) {
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits for uniqueness
      return `${fallbackPrefix}-${timestamp}`;
    }

    return baseSlug;
  };

  // Handle organization creation/join result
  const handleOrganizationAction = async (data: {
    action: 'create' | 'skip' | 'join' | 'invite';
    organizationName?: string;
    enableDomainJoin?: boolean;
    organizationId?: string;
  }) => {
    setIsSubmitting(true);
    setError('');

    try {
      if (data.action === 'create' && data.organizationName) {
        // Create organization with robust slug generation
        const slug = generateSlug(data.organizationName);

        const result = await authClient.organization.create({
          name: data.organizationName,
          slug,
        });

        if (result.data) {
          // Set the newly created organization as active
          await authClient.organization.setActive({
            organizationId: result.data.id,
          });

          // If domain join is enabled, update organization settings
          if (data.enableDomainJoin) {
            const domain = session?.user?.email?.split('@')[1];
            if (!domain) {
              console.warn('Cannot enable domain join: user email domain not found');
            } else {
              try {
                const response = await fetch('/api/organization/enable-domain-join', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include', // Include authentication cookies
                  body: JSON.stringify({
                    organizationId: result.data.id,
                    domain: domain,
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                  throw new Error(
                    `HTTP ${response.status}: ${errorData.error || 'Failed to enable domain join'}`,
                  );
                }

                const responseData = await response.json();
                console.log('Domain join enabled successfully:', responseData);
                showToast({
                  message: 'Automatic team joining enabled successfully!',
                  severity: NotificationSeverity.SUCCESS,
                  showIcon: true,
                  duration: 3000,
                });
              } catch (error) {
                console.error('Failed to enable domain join:', error);
                showToast({
                  message:
                    'Failed to enable automatic team joining. You can set this up later in organization settings.',
                  severity: NotificationSeverity.WARNING,
                  showIcon: true,
                  duration: 5000,
                });
                // Don't block onboarding flow, but inform the user
              }
            }
          }
        }
      } else if (data.action === 'skip' && data.organizationName) {
        // Create personal workspace with robust slug generation
        const baseSlug = generateSlug(data.organizationName, 'personal');
        const userSuffix = session?.user?.id?.slice(-6) || Date.now().toString().slice(-6);
        const slug = `${baseSlug}-${userSuffix}`;

        const result = await authClient.organization.create({
          name: data.organizationName,
          slug,
        });

        if (result.data) {
          // Set the personal workspace as active
          await authClient.organization.setActive({
            organizationId: result.data.id,
          });
        }
      } else if (data.action === 'invite' && data.organizationId) {
        // Accept invitation - check all possible URL parameter names for consistency with OrganizationDetectionStep
        const urlParams = new URLSearchParams(window.location.search);
        const inviteToken =
          urlParams.get('invitation') || urlParams.get('invite') || urlParams.get('inviteToken');

        if (!inviteToken) {
          throw new Error('No invitation token found in URL parameters');
        }

        await authClient.organization.acceptInvitation({
          invitationId: inviteToken,
        });

        // Set the joined organization as active
        await authClient.organization.setActive({
          organizationId: data.organizationId,
        });
      }

      goToNextStep();
    } catch (err) {
      console.error('Organization action error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to process organization action. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle profile completion
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUserName = profileName.trim();
    if (!trimmedUserName) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update user profile
      await authClient.updateUser({
        name: trimmedUserName,
      });
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
        <div className="py-8 text-center">
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
  // Only redirect if they have completed onboarding (have organizations)
  if (organizations && organizations.length > 0) {
    return <Navigate to="/c/new" replace={true} />;
  }

  const progress = getProgress();
  const userEmail = session?.user?.email || '';
  const userName = session?.user?.name || '';

  const stepConfig = {
    [OnboardingStep.ORGANIZATION]: {
      title: (
        <>
          What&apos;s the name of your
          <br />
          company or team?
        </>
      ),
      subtitle: 'This will be the name of your Agentis workspace.',
    },
    [OnboardingStep.PROFILE]: {
      title: 'Complete Your Profile',
      subtitle: 'Tell us a bit about yourself to personalize your experience.',
    },
    [OnboardingStep.TEAM]: {
      title: 'Invite Your Team',
      subtitle: 'Collaboration is better together. Invite your teammates to join.',
    },
    [OnboardingStep.WELCOME]: {
      title: 'Welcome to Agentis!',
      subtitle: "You're all set up. Let's start your AI conversation journey.",
    },
  };

  const currentStepConfig = stepConfig[state.currentStep];

  return (
    <OnboardingLayout
      title={currentStepConfig.title}
      subtitle={currentStepConfig.subtitle}
      step={{
        current: progress.current,
        total: progress.total,
      }}
    >
      {/* Organization Creation Step */}
      {state.currentStep === OnboardingStep.ORGANIZATION && (
        <OrganizationDetectionStep
          email={userEmail}
          userName={userName}
          onNext={handleOrganizationAction}
          className={isSubmitting ? 'pointer-events-none opacity-50' : ''}
        />
      )}

      {/* Profile Completion Step */}
      {state.currentStep === OnboardingStep.PROFILE && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="user-name"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Your Name
            </label>
            <input
              id="user-name"
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              placeholder="Enter your full name"
              maxLength={100}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || !profileName.trim()}
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
              You can invite team members now or skip this step and do it later from your workspace
              settings.
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={goToNextStep} className="w-full" size="lg">
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
            <p className="mb-4 text-lg">🎉 Congratulations! Your workspace is ready.</p>
            <p>
              You can now start having conversations with AI, create agents, execute code, and
              collaborate with your team.
            </p>
          </div>

          <Button onClick={() => navigate('/c/new')} className="w-full" size="lg">
            Start Your First Conversation
          </Button>
        </div>
      )}
    </OnboardingLayout>
  );
}
