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

      // Force session refresh
      authClient
        .getSession()
        .then((sessionData) => {
          console.log('🔗 Session after magic link:', sessionData);
          if (sessionData?.data?.user && isMountedRef.current) {
            console.log('🔗 Magic link authentication successful!');
            // Redirect to main app
            navigate('/c/new');
          }
        })
        .catch((error) => {
          console.error('🔗 Error getting session after magic link:', error);
          if (isMountedRef.current) {
            setError(localize('com_auth_error_magic_link'));
          }
        });
    }
  }, [searchParams, navigate, localize]);

  // If user is already authenticated, redirect
  useEffect(() => {
    if (session?.user && !magicLinkSent) {
      navigate('/c/new');
    }
  }, [session, navigate, magicLinkSent]);

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
