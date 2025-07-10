import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authClient } from '~/config/betterAuth';
import { useLocalize } from '~/hooks';
import { Button } from '~/components/ui';
import { Spinner } from '~/components/svg';
import { ErrorMessage } from './ErrorMessage';
import { cn } from '~/utils';

interface MagicLinkLoginFormData {
  email: string;
}

export const MagicLinkLogin: React.FC = () => {
  const navigate = useNavigate();
  const localize = useLocalize();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMountedRef = useRef(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [email, setEmail] = useState<string>('');

  // Better Auth session detection
  const { data: session } = authClient.useSession();

  // Debug component mount and session state
  useEffect(() => {
    console.log('🔗 MagicLinkLogin component mounted/updated:', {
      pathname: window.location.pathname,
      search: window.location.search,
      searchParams: Object.fromEntries(searchParams.entries()),
      hasSession: !!session,
      sessionData: session,
      timestamp: new Date().toISOString(),
    });
  }, [session, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MagicLinkLoginFormData>({
    mode: 'onChange',
  });

  // Check if we're returning from a magic link
  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      setError(localize('com_auth_error_magic_link'));
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    if (token) {
      // Magic link token detected in URL
      console.log('🔗 Magic link token detected, processing authentication...');

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Add a small delay to ensure the session is fully processed, then try multiple times
      let attempts = 0;
      const maxAttempts = 5;
      const attemptDelay = 1000; // 1 second between attempts

      const checkSessionAndRedirect = async () => {
        attempts++;
        console.log(`🔗 Magic link session check attempt ${attempts}/${maxAttempts}`);

        try {
          const sessionData = await authClient.getSession();
          console.log('🔗 Session data:', JSON.stringify(sessionData, null, 2));

          if (sessionData?.data?.user && isMountedRef.current) {
            console.log('🔗 Magic link authentication successful!');

            // CRITICAL: Get fresh user data from database to ensure accurate onboarding step
            // Better Auth session may have stale data, so we need to fetch current state
            try {
              const userResponse = await fetch('/api/user', {
                method: 'GET',
                credentials: 'include', // Include session cookies
              });

              if (userResponse.ok) {
                const freshUserData = await userResponse.json();
                console.log(
                  '🔗 Fresh user data from database:',
                  JSON.stringify(freshUserData, null, 2),
                );

                const onboardingStep = freshUserData.onboardingStep || 'organization';

                console.log('🔗 User onboarding status (fresh from DB):', {
                  onboardingStep,
                  sessionOnboardingStep: sessionData.data.user.onboardingStep,
                  freshOnboardingStep: freshUserData.onboardingStep,
                  usingFreshData: true,
                });

                // If user hasn't completed onboarding, redirect to onboarding
                if (onboardingStep !== 'complete' && onboardingStep !== 'welcome') {
                  console.log(
                    '🔗 Redirecting to onboarding with fresh step:',
                    `/onboarding?step=${onboardingStep}`,
                  );
                  navigate(`/onboarding?step=${onboardingStep}`);
                  return;
                } else {
                  // If onboarding is complete, redirect to main app
                  console.log('🔗 Redirecting to main app');
                  navigate('/c/new');
                  return;
                }
              } else {
                console.warn('🔗 Failed to fetch fresh user data, falling back to session data');
                // Fall back to session data if API call fails
                const user = sessionData.data.user;
                const onboardingStep = user.onboardingStep || 'organization';

                console.log('🔗 User onboarding status (fallback):', {
                  onboardingStep,
                  userObject: user,
                  hasOnboardingStep: 'onboardingStep' in user,
                  onboardingStepValue: user.onboardingStep,
                });

                // If user hasn't completed onboarding, redirect to onboarding
                if (onboardingStep !== 'complete' && onboardingStep !== 'welcome') {
                  console.log(
                    '🔗 Redirecting to onboarding:',
                    `/onboarding?step=${onboardingStep}`,
                  );
                  navigate(`/onboarding?step=${onboardingStep}`);
                  return;
                } else {
                  // If onboarding is complete, redirect to main app
                  console.log('🔗 Redirecting to main app');
                  navigate('/c/new');
                  return;
                }
              }
            } catch (fetchError) {
              console.error('🔗 Error fetching fresh user data:', fetchError);
              // Fall back to session data
              const user = sessionData.data.user;
              const onboardingStep = user.onboardingStep || 'organization';

              console.log('🔗 User onboarding status (error fallback):', {
                onboardingStep,
                userObject: user,
                hasOnboardingStep: 'onboardingStep' in user,
                onboardingStepValue: user.onboardingStep,
              });

              // If user hasn't completed onboarding, redirect to onboarding
              if (onboardingStep !== 'complete' && onboardingStep !== 'welcome') {
                console.log('🔗 Redirecting to onboarding:', `/onboarding?step=${onboardingStep}`);
                navigate(`/onboarding?step=${onboardingStep}`);
                return;
              } else {
                // If onboarding is complete, redirect to main app
                console.log('🔗 Redirecting to main app');
                navigate('/c/new');
                return;
              }
            }
          }

          // If we don't have session data and haven't exceeded max attempts, try again
          if (attempts < maxAttempts) {
            console.log(`🔗 No session data yet, retrying in ${attemptDelay}ms...`);
            setTimeout(checkSessionAndRedirect, attemptDelay);
          } else {
            console.error('🔗 Failed to get session after maximum attempts');
            if (isMountedRef.current) {
              setError(localize('com_auth_error_magic_link'));
            }
          }
        } catch (error) {
          console.error(`🔗 Error getting session (attempt ${attempts}):`, error);
          if (attempts < maxAttempts) {
            console.log(`🔗 Retrying in ${attemptDelay}ms...`);
            setTimeout(checkSessionAndRedirect, attemptDelay);
          } else {
            console.error('🔗 Failed after maximum attempts');
            if (isMountedRef.current) {
              setError(localize('com_auth_error_magic_link'));
            }
          }
        }
      };

      // Start checking after initial delay
      setTimeout(checkSessionAndRedirect, 500);
    }
  }, [searchParams, navigate, localize]);

  // If user is already authenticated, redirect based on onboarding status
  useEffect(() => {
    console.log('🔗 Checking existing session for redirect:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      magicLinkSent,
      sessionData: session,
      user: session?.user,
      onboardingStep: session?.user?.onboardingStep,
    });

    if (session?.user && !magicLinkSent) {
      // CRITICAL: Get fresh user data from database to ensure accurate onboarding step
      // Better Auth session may have stale data, so we need to fetch current state
      const fetchFreshUserDataAndRedirect = async () => {
        try {
          const userResponse = await fetch('/api/user', {
            method: 'GET',
            credentials: 'include', // Include session cookies
          });

          if (userResponse.ok) {
            const freshUserData = await userResponse.json();
            console.log(
              '🔗 Fresh user data from database (existing session):',
              JSON.stringify(freshUserData, null, 2),
            );

            const onboardingStep = freshUserData.onboardingStep || 'organization';

            console.log('🔗 User is authenticated, redirecting based on fresh onboarding step:', {
              onboardingStep,
              sessionOnboardingStep: session.user.onboardingStep,
              freshOnboardingStep: freshUserData.onboardingStep,
              shouldRedirectToOnboarding:
                onboardingStep !== 'complete' && onboardingStep !== 'welcome',
            });

            // If user hasn't completed onboarding, redirect to onboarding
            if (onboardingStep !== 'complete' && onboardingStep !== 'welcome') {
              console.log(
                '🔗 Redirecting to onboarding with fresh step:',
                `/onboarding?step=${onboardingStep}`,
              );
              navigate(`/onboarding?step=${onboardingStep}`);
            } else {
              // If onboarding is complete, redirect to main app
              console.log('🔗 Redirecting to main app');
              navigate('/c/new');
            }
          } else {
            console.warn(
              '🔗 Failed to fetch fresh user data in existing session, falling back to session data',
            );
            // Fall back to session data if API call fails
            const user = session.user;
            const onboardingStep = user.onboardingStep || 'organization';

            console.log(
              '🔗 User is authenticated, redirecting based on onboarding step (fallback):',
              {
                onboardingStep,
                shouldRedirectToOnboarding:
                  onboardingStep !== 'complete' && onboardingStep !== 'welcome',
              },
            );

            // If user hasn't completed onboarding, redirect to onboarding
            if (onboardingStep !== 'complete' && onboardingStep !== 'welcome') {
              console.log('🔗 Redirecting to onboarding:', `/onboarding?step=${onboardingStep}`);
              navigate(`/onboarding?step=${onboardingStep}`);
            } else {
              // If onboarding is complete, redirect to main app
              console.log('🔗 Redirecting to main app');
              navigate('/c/new');
            }
          }
        } catch (fetchError) {
          console.error('🔗 Error fetching fresh user data in existing session:', fetchError);
          // Fall back to session data
          const user = session.user;
          const onboardingStep = user.onboardingStep || 'organization';

          console.log(
            '🔗 User is authenticated, redirecting based on onboarding step (error fallback):',
            {
              onboardingStep,
              shouldRedirectToOnboarding:
                onboardingStep !== 'complete' && onboardingStep !== 'welcome',
            },
          );

          // If user hasn't completed onboarding, redirect to onboarding
          if (onboardingStep !== 'complete' && onboardingStep !== 'welcome') {
            console.log('🔗 Redirecting to onboarding:', `/onboarding?step=${onboardingStep}`);
            navigate(`/onboarding?step=${onboardingStep}`);
          } else {
            // If onboarding is complete, redirect to main app
            console.log('🔗 Redirecting to main app');
            navigate('/c/new');
          }
        }
      };

      fetchFreshUserDataAndRedirect();
    }
  }, [session, navigate, magicLinkSent]);

  // Additional effect to handle the case where user lands on login after magic link
  // but session is not immediately available - retry session checking
  useEffect(() => {
    // If no session yet and no magic link was sent (meaning user didn't manually request one)
    // this might be a post-magic-link redirect, so we should check for session
    if (!session && !magicLinkSent) {
      console.log(
        '🔗 No session found on login page, checking if this is post-magic-link redirect',
      );

      let attempts = 0;
      const maxAttempts = 5;
      const checkInterval = 1000; // 1 second

      const checkForSession = async () => {
        attempts++;
        console.log(
          `🔗 Session check attempt ${attempts}/${maxAttempts} for post-magic-link redirect`,
        );

        try {
          const sessionData = await authClient.getSession();
          console.log('🔗 Session check result:', sessionData);

          if (sessionData?.data?.user) {
            console.log('🔗 Found session after magic link redirect, triggering redirect logic');
            // The session useEffect will handle the redirect
          } else if (attempts < maxAttempts) {
            console.log('🔗 No session yet, retrying in 1 second...');
            setTimeout(checkForSession, checkInterval);
          } else {
            console.log('🔗 No session found after maximum attempts, user needs to authenticate');
          }
        } catch (error) {
          console.error('🔗 Error checking session:', error);
          if (attempts < maxAttempts) {
            setTimeout(checkForSession, checkInterval);
          }
        }
      };

      // Start checking after a short delay
      setTimeout(checkForSession, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onSubmit = async (data: MagicLinkLoginFormData) => {
    setError('');
    setIsSubmitting(true);

    try {
      console.log('🔗 Sending magic link request for:', data.email);
      setEmail(data.email);

      const result = await authClient.signIn.magicLink({
        email: data.email,
        callbackURL: `${window.location.origin}/login`,
      });

      console.log('🔗 Magic link response received:', result);

      if (result.error) {
        console.error('🔗 Magic link error:', result.error);
        throw new Error(result.error.message || localize('com_auth_error_magic_link_send'));
      }

      console.log('Magic link sent successfully to:', data.email);
      if (isMountedRef.current) {
        setMagicLinkSent(true);
      }
    } catch (err: any) {
      console.error('Magic link error:', err);
      if (isMountedRef.current) {
        setError(err.message || localize('com_auth_error_magic_link_send'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleResendLink = async () => {
    if (!email) return;

    if (isMountedRef.current) {
      setError('');
      setIsSubmitting(true);
    }

    try {
      const result = await authClient.signIn.magicLink({
        email: email,
        callbackURL: `${window.location.origin}/login`,
      });

      if (result.error) {
        throw new Error(result.error.message || localize('com_auth_error_magic_link_send'));
      }

      if (isMountedRef.current) {
        setError(''); // Clear any previous errors
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || localize('com_auth_error_magic_link_send'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  if (magicLinkSent) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
            Check your email
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We sent a magic link to{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">{email}</span>
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <Button
            variant="outline"
            onClick={handleResendLink}
            disabled={isSubmitting}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2" />
                Sending...
              </>
            ) : (
              'Resend link'
            )}
          </Button>

          <button
            onClick={() => {
              setMagicLinkSent(false);
              setEmail('');
            }}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Use a different email
          </button>
        </div>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    );
  }

  return (
    <>
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <form
        className="mt-6"
        aria-label="Login form"
        method="POST"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="mb-6">
          <input
            type="email"
            id="email"
            autoComplete="email"
            aria-label="Email address"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'Please enter a valid email address',
              },
            })}
            aria-invalid={!!errors.email}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            placeholder="name@work-email.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <span role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errors.email.message}
            </span>
          )}
        </div>

        <div className="mt-6">
          <button
            aria-label="Continue with email"
            data-testid="login-button"
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <Spinner className="mr-2" />
                Sending magic link...
              </div>
            ) : (
              'Sign In With Email'
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export default MagicLinkLogin;
