import React, { useState, useEffect } from 'react';
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
      authClient.getSession().then((sessionData) => {
        console.log('🔗 Session after magic link:', sessionData);
        if (sessionData?.data?.user) {
          console.log('🔗 Magic link authentication successful!');
          // Redirect to main app
          navigate('/c/new');
        }
      }).catch((error) => {
        console.error('🔗 Error getting session after magic link:', error);
        setError(localize('com_auth_error_magic_link'));
      });
    }
  }, [searchParams, navigate, localize]);

  // If user is already authenticated, redirect
  useEffect(() => {
    if (session?.user && !magicLinkSent) {
      navigate('/c/new');
    }
  }, [session, navigate, magicLinkSent]);

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
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error('Magic link error:', err);
      setError(err.message || localize('com_auth_error_magic_link_send'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendLink = async () => {
    if (!email) return;
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const result = await authClient.signIn.magicLink({
        email: email,
        callbackURL: `${window.location.origin}/login`,
      });
      
      if (result.error) {
        throw new Error(result.error.message || localize('com_auth_error_magic_link_send'));
      }
      
      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.message || localize('com_auth_error_magic_link_send'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
            {localize('com_auth_check_your_email')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {localize('com_auth_magic_link_sent')}{' '}
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
                {localize('com_auth_sending')}
              </>
            ) : (
              localize('com_auth_resend_link')
            )}
          </Button>
          
          <button
            onClick={() => {
              setMagicLinkSent(false);
              setEmail('');
            }}
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {localize('com_auth_use_different_email')}
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
        aria-label={localize('com_auth_login_form')}
        method="POST"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="mb-4">
          <div className="relative">
            <input
              type="email"
              id="email"
              autoComplete="email"
              aria-label={localize('com_auth_email')}
              {...register('email', {
                required: localize('com_auth_email_required'),
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: localize('com_auth_email_pattern'),
                },
              })}
              aria-invalid={!!errors.email}
              className="webkit-dark-styles transition-color peer w-full rounded-2xl border border-border-light bg-surface-primary px-3.5 pb-2.5 pt-3 text-text-primary duration-200 focus:border-green-500 focus:outline-none"
              placeholder=" "
              disabled={isSubmitting}
            />
            <label
              htmlFor="email"
              className="absolute start-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-75 transform bg-surface-primary px-2 text-sm text-text-secondary-alt duration-200 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-green-600 dark:peer-focus:text-green-500 rtl:peer-focus:left-auto rtl:peer-focus:translate-x-1/4"
            >
              {localize('com_auth_email_address')}
            </label>
          </div>
          {errors.email && (
            <span role="alert" className="mt-1 text-sm text-red-500 dark:text-red-900">
              {errors.email.message}
            </span>
          )}
        </div>

        <div className="mt-6">
          <button
            aria-label={localize('com_auth_continue')}
            data-testid="login-button"
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors',
              'hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-green-600',
              'dark:bg-green-600 dark:hover:bg-green-700',
            )}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <Spinner className="mr-2" />
                {localize('com_auth_sending_magic_link')}
              </div>
            ) : (
              localize('com_auth_continue_with_email')
            )}
          </button>
        </div>
      </form>
    </>
  );
};

export default MagicLinkLogin;