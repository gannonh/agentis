/**
 * @fileoverview Onboarding route component with organization detection
 * @module routes/OnboardingRoute
 */

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { useOnboardingState, OnboardingStep } from '~/hooks/useOnboardingState';
import OnboardingLayout from '~/components/Auth/OnboardingLayout';
import OrganizationDetectionStep from '~/components/Auth/OrganizationDetectionStep';
import { ProfileSetup } from '~/components/Auth/OnboardingFlow/ProfileSetup';
import { TeamInvitation } from '~/components/Auth/OnboardingFlow/TeamInvitation';
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

  // Form state with persistence
  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Organization form state with persistence
  const [organizationName, setOrganizationName] = useState('');
  const [enableDomainJoin, setEnableDomainJoin] = useState(false);

  const {
    data: session,
    isPending: sessionLoading,
    refetch: refetchSession,
  } = authClient.useSession();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();

  // Form data persistence keys
  const ONBOARDING_STORAGE_KEY = `onboarding_${session?.user?.id}`;

  // Load persisted form data on component mount
  useEffect(() => {
    if (!session?.user?.id) return;

    try {
      const savedData = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);

        // Restore form data based on current step
        if (parsedData.profileName && state.currentStep === 'profile') {
          setProfileName(parsedData.profileName);
        }
        if (parsedData.organizationName && state.currentStep === 'organization') {
          setOrganizationName(parsedData.organizationName);
        }
        if (
          typeof parsedData.enableDomainJoin === 'boolean' &&
          state.currentStep === 'organization'
        ) {
          setEnableDomainJoin(parsedData.enableDomainJoin);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted onboarding data:', error);
    }
  }, [session?.user?.id, state.currentStep, ONBOARDING_STORAGE_KEY]);

  // Save form data to localStorage whenever it changes
  const saveFormData = useCallback(
    (
      data: Partial<{
        profileName: string;
        organizationName: string;
        enableDomainJoin: boolean;
      }>,
    ) => {
      if (!session?.user?.id) return;

      try {
        const existingData = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        const currentData = existingData ? JSON.parse(existingData) : {};
        const updatedData = { ...currentData, ...data };

        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updatedData));
      } catch (error) {
        console.warn('Failed to save onboarding data:', error);
      }
    },
    [session?.user?.id, ONBOARDING_STORAGE_KEY],
  );

  // Clear form data from localStorage when onboarding is complete
  const clearFormData = useCallback(() => {
    if (!session?.user?.id) return;

    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear onboarding data:', error);
    }
  }, [session?.user?.id, ONBOARDING_STORAGE_KEY]);

  // Clear form data when user navigates to main app (onboarding complete)
  useEffect(() => {
    return () => {
      // Component unmounting (likely navigating away from onboarding)
      if (session?.user?.id) {
        clearFormData();
      }
    };
  }, [session?.user?.id, clearFormData]);

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
      if (data.action === 'join' && data.organizationId) {
        // User joined an existing organization through preview step
        // Set the joined organization as active
        await authClient.organization.setActive({
          organizationId: data.organizationId,
        });
      } else if (data.action === 'create' && data.organizationName) {
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

          // Always set the domain metadata for organization detection, regardless of auto-join setting
          const domain = session?.user?.email?.split('@')[1];
          if (!domain) {
            console.warn('Cannot set organization domain: user email domain not found');
          } else {
            try {
              console.log('Setting organization domain:', {
                organizationId: result.data.id,
                organizationIdType: typeof result.data.id,
                organizationData: result.data,
                domain: domain,
                userEmail: session?.user?.email,
                enableDomainJoin: data.enableDomainJoin,
              });

              const response = await fetch('/api/organization/enable-domain-join', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include', // Include authentication cookies
                body: JSON.stringify({
                  organizationId: result.data.id,
                  domain: domain,
                  enableDomainJoin: data.enableDomainJoin, // Pass the auto-join setting
                }),
              });

              console.log('Organization domain API response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Organization domain API error:', {
                  status: response.status,
                  statusText: response.statusText,
                  errorData,
                });
                throw new Error(
                  `HTTP ${response.status}: ${errorData.error || 'Failed to set organization domain'}`,
                );
              }

              const responseData = await response.json();
              console.log('Organization domain set successfully:', responseData);

              if (data.enableDomainJoin) {
                showToast({
                  message: 'Automatic team joining enabled successfully!',
                  severity: NotificationSeverity.SUCCESS,
                  showIcon: true,
                  duration: 3000,
                });
              }
            } catch (error) {
              console.error('Failed to set organization domain:', error);
              const message = data.enableDomainJoin
                ? 'Failed to enable automatic team joining. You can set this up later in organization settings.'
                : 'Failed to set organization domain. This may affect team discovery.';
              showToast({
                message,
                severity: NotificationSeverity.WARNING,
                showIcon: true,
                duration: 5000,
              });
              // Don't block onboarding flow, but inform the user
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

      // Clear organization form data since step is completed
      saveFormData({ organizationName: undefined, enableDomainJoin: undefined });

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

  // Enhanced form change handlers that save data
  const handleProfileNameChange = (value: string) => {
    setProfileName(value);
    saveFormData({ profileName: value });
  };

  const handleOrganizationNameChange = (value: string) => {
    setOrganizationName(value);
    saveFormData({ organizationName: value });
  };

  const handleEnableDomainJoinChange = (value: boolean) => {
    setEnableDomainJoin(value);
    saveFormData({ enableDomainJoin: value });
  };

  // Handle profile completion from ProfileSetup component
  const handleProfileComplete = async (data: {
    name: string;
    username?: string;
    avatar?: string;
  }) => {
    setError('');
    setIsSubmitting(true);

    try {
      // Update user profile with all data
      const updateData: any = {
        name: data.name.trim(),
      };

      // Add optional fields if provided
      // Only include avatar if it's a manually uploaded local avatar, not an OAuth URL
      if (data.avatar && data.avatar.startsWith('/images/')) {
        updateData.avatar = data.avatar;
      }

      // Add username directly to user object (already supported in schema)
      if (data.username) {
        updateData.username = data.username;
      }

      await authClient.updateUser(updateData);

      // Clear form data for profile step since it's completed
      saveFormData({ profileName: undefined });

      goToNextStep();
    } catch (err) {
      console.error('Profile update error:', err);
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

  // Don't redirect to chat based on organizations alone
  // Users should complete the full onboarding flow regardless of having organizations
  // The only redirect to chat should happen when clicking "Start Your First Conversation"

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
    // Handle 'complete' step for edge cases
    complete: {
      title: 'Setup Complete!',
      subtitle: 'Redirecting you to your workspace...',
    },
  };

  const currentStepConfig = stepConfig[state.currentStep];

  // Safety check - if currentStepConfig is undefined, provide defaults
  if (!currentStepConfig) {
    console.error('❌ No config found for current step:', state.currentStep);
    console.error('❌ Available steps:', Object.keys(stepConfig));
    return (
      <OnboardingLayout
        title="Loading..."
        subtitle="Setting up your workspace..."
        step={{
          current: progress.current,
          total: progress.total,
        }}
      >
        <div className="py-8 text-center">
          <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-300">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
            <span>Loading onboarding step...</span>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

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
          organizationName={organizationName}
          enableDomainJoin={enableDomainJoin}
          onOrganizationNameChange={handleOrganizationNameChange}
          onEnableDomainJoinChange={handleEnableDomainJoinChange}
        />
      )}

      {/* Profile Completion Step */}
      {state.currentStep === OnboardingStep.PROFILE && (
        <>
          <ProfileSetup
            email={userEmail}
            suggestedName={userName}
            oauthData={{
              name: session?.user?.name,
              picture: (session?.user as any)?.image, // OAuth profile picture from 'image' field
              email: session?.user?.email,
            }}
            onProfileComplete={handleProfileComplete}
            isLoading={isSubmitting}
            className=""
          />

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Team Invitation Step */}
      {state.currentStep === OnboardingStep.TEAM && (
        <TeamInvitation
          organizationName={organizationName || 'your workspace'}
          onInvitationsComplete={(results) => {
            console.log('Invitations sent:', results);
            showToast({
              message: `${results.sentCount} invitations sent successfully${results.failedCount > 0 ? `, ${results.failedCount} failed` : ''}`,
              severity:
                results.failedCount > 0
                  ? NotificationSeverity.WARNING
                  : NotificationSeverity.SUCCESS,
            });
            goToNextStep();
          }}
          onSkip={goToNextStep}
          isLoading={isSubmitting}
        />
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

          <Button
            onClick={async () => {
              try {
                console.log('Welcome button clicked - completing onboarding...');

                // Mark onboarding as complete
                await authClient.updateUser({
                  onboardingStep: 'complete',
                });
                console.log('✅ Updated user onboarding step to: complete');

                // Refresh session to ensure OnboardGuard sees the update
                try {
                  await refetchSession();
                  console.log('✅ Refreshed session after completing onboarding');
                } catch (sessionError) {
                  console.warn('⚠️ Session refresh failed but continuing:', sessionError);
                }

                // Navigate to chat - use hard navigation to avoid React Router issues
                console.log('🚀 Navigating to /c/new...');
                window.location.href = '/c/new';
              } catch (error) {
                console.error('❌ Failed to complete onboarding:', error);
                console.log('🚀 Navigating anyway to avoid blocking user...');
                window.location.href = '/c/new';
              }
            }}
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
