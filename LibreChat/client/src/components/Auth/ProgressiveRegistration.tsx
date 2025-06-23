import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  useRegistrationState,
  RegistrationStep,
  UserRole,
  useOrganizationDetection,
  useLocalize,
  useMediaQuery,
} from '~/hooks';
import { authClient } from '~/config/betterAuth';
import { OrganizationDetectionDisplay } from './OrganizationDetectionDisplay';
import { Spinner } from '~/components/svg';
import { ErrorMessage } from './ErrorMessage';
import { Button } from '~/components/ui';
import { cn } from '~/utils';

interface StepFormData {
  email?: string;
  name?: string;
  username?: string;
  organizationName?: string;
  organizationSlug?: string;
  organizationDescription?: string;
  invitations?: string;
}

export const ProgressiveRegistration: React.FC = () => {
  const navigate = useNavigate();
  const localize = useLocalize();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Better Auth session detection
  const { data: session } = authClient.useSession();

  const {
    state,
    updateState,
    goToNextStep,
    goToPreviousStep,
    skipCurrentStep,
    canGoBack,
    canSkip,
    clearState,
    getProgress,
    getSteps,
  } = useRegistrationState();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
    getValues,
    reset,
  } = useForm<StepFormData>({
    mode: 'onChange',
    defaultValues: {
      email: state?.email || '',
      name: state?.profileData?.name || '',
      username: state?.profileData?.username || '',
      organizationName: state?.organizationSetup?.name || '',
      organizationSlug: state?.organizationSetup?.slug || '',
      organizationDescription: state?.organizationSetup?.description || '',
    },
  });

  const watchedEmail = watch('email');
  const emailForDetection = state?.email || watchedEmail || '';

  // Debug: log email values
  console.log('ProgressiveRegistration email debug:', {
    watchedEmail,
    stateEmail: state?.email,
    emailForDetection,
    currentStep: state?.currentStep,
  });

  const {
    organization,
    isNewDomain,
    isLoading: isDetectingOrg,
  } = useOrganizationDetection(emailForDetection);

  useEffect(() => {
    const formValues = {
      email: state?.email || '',
      name: state?.profileData?.name || session?.user?.name || '',
      username: state?.profileData?.username || session?.user?.username || '',
      organizationName: state?.organizationSetup?.name || '',
      organizationSlug: state?.organizationSetup?.slug || '',
      organizationDescription: state?.organizationSetup?.description || '',
    };

    reset(formValues);
  }, [
    state?.timestamp,
    state?.email,
    state?.profileData?.name,
    state?.profileData?.username,
    state?.organizationSetup?.name,
    state?.organizationSetup?.slug,
    state?.organizationSetup?.description,
    session?.user?.name,
    session?.user?.username,
    reset,
  ]);

  const progress = getProgress();
  const steps = getSteps();

  useEffect(() => {
    if (
      state?.currentStep === RegistrationStep.ORG_DETECTION &&
      !isDetectingOrg &&
      emailForDetection
    ) {
      const newRole = isNewDomain ? UserRole.ACCOUNT_OWNER : UserRole.MEMBER;
      if (state?.userRole !== newRole) {
        updateState({
          userRole: newRole,
          organizationData: organization || null,
        });
      }
    }

    // Reset magic link state when leaving verification step
    if (state?.currentStep !== RegistrationStep.VERIFICATION && magicLinkSent) {
      setMagicLinkSent(false);
    }
  }, [
    state?.currentStep,
    isNewDomain,
    organization,
    isDetectingOrg,
    state?.userRole,
    updateState,
    emailForDetection,
    magicLinkSent,
  ]);

  // Pre-populate organization form when reaching the setup step
  useEffect(() => {
    if (state?.currentStep === RegistrationStep.ORG_SETUP && state?.email) {
      const domain = state.email.split('@')[1];
      if (domain) {
        // Create organization name from domain (e.g., "astro-labs.app" -> "Astro Labs")
        const orgName = domain
          .split('.')[0] // Remove TLD
          .split('-') // Split on hyphens
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize
          .join(' '); // Join with spaces

        // Create slug from domain (e.g., "astro-labs.app" -> "astro-labs")
        const orgSlug = domain.split('.')[0];

        // Only pre-populate if the fields are empty
        const currentValues = getValues();
        if (!currentValues.organizationName) {
          setValue('organizationName', orgName);
        }
        if (!currentValues.organizationSlug) {
          setValue('organizationSlug', orgSlug);
        }
      }
    }
  }, [state?.currentStep, state?.email, setValue, getValues]);

  // Handle magic link authentication via session detection (Better Auth best practice)
  useEffect(() => {
    if (session?.user && state?.currentStep === RegistrationStep.VERIFICATION && magicLinkSent) {
      // User is now authenticated via magic link
      console.log('Magic link authentication successful:', session.user.email);
      updateState({
        emailVerified: true,
        currentStep: RegistrationStep.PROFILE,
      });
    }
  }, [session, state?.currentStep, magicLinkSent, updateState]);

  // Handle authentication errors from URL parameters (Better Auth error handling)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    // Only show error if we're still in verification step and there's actually an error
    if (error && state?.currentStep === RegistrationStep.VERIFICATION) {
      console.log('🔗 Authentication error detected:', error);
      setError('Magic link authentication failed. Please try again.');
      setMagicLinkSent(false); // Reset so user can try again

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [state?.currentStep]);

  // Handle already authenticated users (skip to appropriate step)
  useEffect(() => {
    if (session?.user) {
      console.log('🔐 User session detected:', session.user.email);
      console.log('🔐 Current step:', state?.currentStep);

      // If user is authenticated but still in early steps, advance them
      if (
        state?.currentStep === RegistrationStep.EMAIL ||
        state?.currentStep === RegistrationStep.VERIFICATION
      ) {
        console.log('User already authenticated, advancing to organization detection');
        updateState({
          email: session.user.email || state?.email || '',
          emailVerified: true,
          currentStep: RegistrationStep.ORG_DETECTION,
        });
      }
    }
  }, [session, state?.currentStep, state?.email, updateState]);

  // Handle magic link callback URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const success = urlParams.get('success');

    if (token || success) {
      console.log('🔗 Magic link callback detected with token/success parameter');

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Force session refresh by calling getSession
      authClient
        .getSession()
        .then((sessionData) => {
          console.log('🔗 Session after magic link:', sessionData);
          if (sessionData?.data?.user) {
            // Session is now active, the existing useEffect should handle advancement
            console.log('🔗 Magic link authentication successful!');
          }
        })
        .catch((error) => {
          console.error('🔗 Error getting session after magic link:', error);
        });
    }
  }, []);

  const onSubmit = async (data: StepFormData) => {
    setError('');
    setIsSubmitting(true);

    try {
      switch (state?.currentStep) {
        case RegistrationStep.EMAIL:
          console.log('🔗 EMAIL step - form data:', data);
          console.log('🔗 EMAIL step - data.email:', data.email);
          console.log('🔗 EMAIL step - before updateState, current state:', state);
          // Update state and move to next step in one call to avoid race condition
          updateState({
            email: data.email!,
            currentStep: RegistrationStep.VERIFICATION,
          });
          console.log('🔗 EMAIL step - after combined updateState call');
          break;

        case RegistrationStep.VERIFICATION:
          try {
            if (!magicLinkSent) {
              // Send magic link for authentication
              console.log('🔗 Debug - Current state:', state);
              console.log('🔗 Debug - Email value:', state?.email);
              console.log('🔗 Debug - Email is empty?', !state?.email);
              console.log('🔗 Sending magic link request for:', state?.email);

              if (!state?.email) {
                throw new Error('Email is required but not found in state');
              }

              const result = await authClient.signIn.magicLink({
                email: state.email,
                callbackURL: `${window.location.origin}/register`,
              });

              console.log('🔗 Magic link response received:', result);

              // Check if the request was successful
              if (result.error) {
                console.error('🔗 Magic link error:', result.error);
                throw new Error(result.error.message || 'Failed to send magic link');
              }

              console.log('Magic link sent successfully to:', state?.email);
              setMagicLinkSent(true);
              updateState({ magicLinkSent: true });
            } else {
              // User has received the magic link, proceed to next step
              goToNextStep();
            }
          } catch (err: any) {
            console.error('Magic link error:', err);
            // Reset state so user can try again
            setMagicLinkSent(false);
            updateState({ magicLinkSent: false });
            throw new Error(err.message || 'Failed to send magic link. Please try again.');
          }
          break;

        case RegistrationStep.ORG_DETECTION:
          goToNextStep();
          break;

        case RegistrationStep.PROFILE:
          try {
            // Store profile data locally
            updateState({
              profileData: {
                name: data.name!,
                username: data.username,
              },
            });

            // Update user profile in Better Auth
            if (session?.user?.id) {
              await authClient.updateUser({
                name: data.name!,
                username: data.username,
              });
              console.log('✅ User profile updated in Better Auth');
            } else {
              console.warn('⚠️ No session found, cannot update user profile');
            }

            // Continue to next step
            goToNextStep();
          } catch (err: any) {
            throw new Error(err.message || 'Profile setup failed');
          }
          break;

        case RegistrationStep.ORG_SETUP:
          try {
            const orgResult = await authClient.organization.create({
              name: data.organizationName!,
              slug: data.organizationSlug!,
            });

            // Force session refresh to update organization membership immediately
            console.log('🔄 Forcing session refresh after organization creation...');
            await authClient.getSession();
            console.log('✅ Session refreshed, organization hooks should update');

            updateState({
              organizationSetup: {
                name: data.organizationName!,
                slug: data.organizationSlug!,
                description: data.organizationDescription,
              },
              organizationData: orgResult as any,
            });
            goToNextStep();
          } catch (err: any) {
            throw new Error(err.message || 'Organization creation failed');
          }
          break;

        case RegistrationStep.INVITE_MEMBERS:
          if (data.invitations) {
            const emails = data.invitations
              .split(',')
              .map((e) => e.trim())
              .filter(Boolean);
            try {
              for (const email of emails) {
                await authClient.organization.inviteMember({
                  organizationId: state?.organizationData!.id,
                  email,
                  role: 'member',
                });
              }
              updateState({ invitations: emails });
            } catch (err: any) {
              throw new Error(err.message || 'Failed to send invitations');
            }
          }
          goToNextStep();
          break;

        case RegistrationStep.WELCOME:
          // User completed onboarding - refresh session to ensure organization membership is loaded
          console.log('🎉 Welcome step completed, refreshing session before navigation...');

          try {
            // Force session refresh to pick up organization membership
            const sessionData = await authClient.getSession();
            console.log('🔄 Session refreshed after onboarding:', sessionData);

            // Note: Organization data will be refreshed automatically by the hooks
            console.log(
              '🏢 Session refresh completed, organization hooks will update automatically',
            );

            clearState();
            navigate('/c/new', { replace: true });
          } catch (error) {
            console.error('❌ Error refreshing session after onboarding:', error);
            // Still navigate even if session refresh fails
            clearState();
            navigate('/c/new', { replace: true });
          }
          break;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (state?.currentStep) {
      case RegistrationStep.EMAIL:
        return (
          <div className="space-y-4">
            <div className="relative">
              <input
                {...register('email', {
                  required: localize('com_auth_email_required'),
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: localize('com_auth_email_pattern'),
                  },
                })}
                type="email"
                id="email"
                autoComplete="email"
                aria-label={localize('com_auth_email')}
                aria-invalid={!!errors.email}
                className="webkit-dark-styles transition-color peer w-full rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                placeholder=" "
              />
              <label
                htmlFor="email"
                className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
              >
                {localize('com_auth_email')}
              </label>
            </div>
            {errors.email && (
              <span role="alert" className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </span>
            )}
          </div>
        );

      case RegistrationStep.VERIFICATION:
        return (
          <div className="space-y-4">
            {!magicLinkSent ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    🪄 Ready to Sign In
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    We&apos;ll send a magic link to <strong>{state?.email || ''}</strong>
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Passwordless Authentication
                      </h4>
                      <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                        <p>Click &quot;Send Magic Link&quot; to receive a secure sign-in link.</p>
                        <p className="mt-1">
                          No passwords needed - just click the link in your email!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    ✨ Magic Link Sent!
                  </h3>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                        Check Your Email
                      </h4>
                      <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                        <p>
                          We&apos;ve sent a magic link to <strong>{state?.email || ''}</strong>
                        </p>
                        <p className="mt-1">
                          Click the link to sign in instantly and continue your setup.
                        </p>
                        <p className="mt-2 text-xs">
                          Link expires in 5 minutes. Don&apos;t see it? Check spam or resend below.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsSubmitting(true);
                        setError(''); // Clear previous errors

                        console.log('🔗 Resending magic link for:', state?.email);
                        const result = await authClient.signIn.magicLink({
                          email: state?.email || '',
                          callbackURL: `${window.location.origin}/register`,
                        });

                        console.log('🔗 Resend magic link response:', result);

                        if (result.error) {
                          console.error('🔗 Resend magic link error:', result.error);
                          throw new Error(result.error.message || 'Failed to resend magic link');
                        }

                        console.log('Magic link resent successfully to:', state?.email);
                      } catch (err: any) {
                        console.error('Resend magic link error:', err);
                        setError(err.message || 'Failed to resend magic link. Please try again.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="text-sm text-green-600 underline hover:text-green-700 disabled:opacity-50 dark:text-green-400 dark:hover:text-green-300"
                  >
                    {isSubmitting ? 'Sending...' : 'Resend Magic Link'}
                  </button>
                </div>

                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  After clicking the magic link, you&apos;ll be automatically signed in and can
                  continue.
                </p>
              </div>
            )}
          </div>
        );

      case RegistrationStep.ORG_DETECTION:
        // Safety check: if no email, go back to email step
        if (!emailForDetection) {
          console.warn('No email found for organization detection, redirecting to email step');
          updateState({ currentStep: RegistrationStep.EMAIL });
          return null;
        }

        return (
          <div className="space-y-4">
            <OrganizationDetectionDisplay email={emailForDetection} />
          </div>
        );

      case RegistrationStep.PROFILE:
        return (
          <div className="space-y-4">
            <div className="relative">
              <input
                {...register('name', {
                  required: localize('com_auth_name_required'),
                  minLength: {
                    value: 3,
                    message: localize('com_auth_name_min_length'),
                  },
                })}
                type="text"
                id="name"
                autoComplete="name"
                aria-label={localize('com_auth_full_name')}
                aria-invalid={!!errors.name}
                className="webkit-dark-styles transition-color peer w-full rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                placeholder=" "
              />
              <label
                htmlFor="name"
                className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
              >
                {localize('com_auth_full_name')}
              </label>
            </div>
            {errors.name && (
              <span role="alert" className="mt-1 text-sm text-red-500">
                {errors.name.message}
              </span>
            )}

            <div className="relative">
              <input
                {...register('username', {
                  minLength: {
                    value: 2,
                    message: localize('com_auth_username_min_length'),
                  },
                })}
                type="text"
                id="username"
                autoComplete="username"
                aria-label={localize('com_auth_username')}
                aria-invalid={!!errors.username}
                className="webkit-dark-styles transition-color peer w-full rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                placeholder=" "
              />
              <label
                htmlFor="username"
                className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
              >
                {localize('com_auth_username')} (optional)
              </label>
            </div>
            {errors.username && (
              <span role="alert" className="mt-1 text-sm text-red-500">
                {errors.username.message}
              </span>
            )}
          </div>
        );

      case RegistrationStep.ORG_SETUP:
        // Debug what's available in state
        console.log('🔍 ORG_SETUP - Current state:', state);
        console.log('🔍 ORG_SETUP - Email domain:', state?.email?.split('@')[1]);
        console.log('🔍 ORG_SETUP - Organization data:', state?.organizationData);

        return (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              You&apos;re creating a new organization for{' '}
              {state?.organizationData?.domain || state?.email?.split('@')[1] || ''}
            </p>

            <div className="relative">
              <input
                {...register('organizationName', {
                  required: 'Organization name is required',
                })}
                type="text"
                id="organizationName"
                aria-label="Organization name"
                aria-invalid={!!errors.organizationName}
                defaultValue={(state?.organizationData?.domain || state?.email?.split('@')[1] || '')
                  .split('.')[0]
                  .split('-')
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(' ')}
                className="webkit-dark-styles transition-color peer w-full rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                placeholder=" "
              />
              <label
                htmlFor="organizationName"
                className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
              >
                Organization name
              </label>
            </div>
            {errors.organizationName && (
              <span role="alert" className="mt-1 text-sm text-red-500">
                {errors.organizationName.message}
              </span>
            )}

            <div className="relative">
              <input
                {...register('organizationSlug', {
                  required: 'Organization URL is required',
                  pattern: {
                    value: /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
                    message:
                      'Must start and end with letter/number, can contain letters, numbers, hyphens, and periods',
                  },
                  minLength: {
                    value: 2,
                    message: 'Must be at least 2 characters',
                  },
                })}
                type="text"
                id="organizationSlug"
                aria-label="Organization URL"
                aria-invalid={!!errors.organizationSlug}
                defaultValue={(
                  state?.organizationData?.domain ||
                  state?.email?.split('@')[1] ||
                  ''
                ).replace(/\./g, '-')}
                className="webkit-dark-styles transition-color peer w-full rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                placeholder=" "
              />
              <label
                htmlFor="organizationSlug"
                className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
              >
                Organization URL
              </label>
            </div>
            {errors.organizationSlug && (
              <span role="alert" className="mt-1 text-sm text-red-500">
                {errors.organizationSlug.message}
              </span>
            )}

            <div className="relative">
              <textarea
                {...register('organizationDescription')}
                id="organizationDescription"
                aria-label="Organization description"
                className="webkit-dark-styles transition-color peer w-full resize-none rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                placeholder=" "
                rows={3}
              />
              <label
                htmlFor="organizationDescription"
                className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
              >
                Organization description (optional)
              </label>
            </div>
          </div>
        );

      case RegistrationStep.INVITE_MEMBERS:
        return (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Add email addresses separated by commas
            </p>
            <div className="relative">
              <textarea
                {...register('invitations')}
                id="invitations"
                aria-label="Team member emails"
                className="webkit-dark-styles transition-color peer w-full resize-none rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
                rows={4}
              />
              <label
                htmlFor="invitations"
                className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-3 peer-placeholder-shown:-translate-y-0 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
              >
                Team member emails
              </label>
            </div>
          </div>
        );

      case RegistrationStep.WELCOME:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <svg
                    className="h-8 w-8 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Welcome to Agentis!
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {state?.organizationData
                  ? `You&apos;ve successfully joined ${state.organizationData.name}`
                  : 'Your account has been created successfully'}
              </p>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Setup Complete
                  </h4>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>Your account is now fully configured and ready to use.</p>
                    <p className="mt-1">
                      Click &quot;Get Started&quot; to begin exploring Agentis!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderProgressBar = () => {
    return (
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Step {progress.current} of {progress.total}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{progress.percentage}%</span>
        </div>
        <div className="relative">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
              role="progressbar"
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-between">
          {['Email', 'Magic Link', 'Organization', 'Profile', 'Welcome'].map((step, index) => (
            <span
              key={step}
              className={cn(
                'text-xs',
                index < progress.current
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-600',
              )}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn('flex min-h-screen items-center justify-center', isMobile ? 'px-4' : 'px-8')}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={cn('w-full space-y-6', isMobile ? 'max-w-full' : 'max-w-md')}
        aria-label="Progressive registration form"
      >
        {renderProgressBar()}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {renderStepContent()}

        <div className="flex justify-between gap-4">
          {canGoBack() && (
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}

          <div className="ml-auto flex gap-2">
            {canSkip() && (
              <button
                type="button"
                onClick={skipCurrentStep}
                disabled={isSubmitting}
                className="inline-flex p-1 text-sm font-medium text-green-600 transition-colors hover:text-green-700 disabled:opacity-50 dark:text-green-400 dark:hover:text-green-300"
              >
                Skip
              </button>
            )}

            <Button
              type="submit"
              variant="default"
              disabled={
                isSubmitting ||
                (state?.currentStep === RegistrationStep.ORG_DETECTION && isDetectingOrg)
              }
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <Spinner className="h-4 w-4" />
              ) : state?.currentStep === RegistrationStep.WELCOME ? (
                'Get Started'
              ) : state?.currentStep === RegistrationStep.VERIFICATION && !magicLinkSent ? (
                '🪄 Send Magic Link'
              ) : state?.currentStep === RegistrationStep.VERIFICATION && magicLinkSent ? (
                'Continue'
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
