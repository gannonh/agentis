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
  verificationCode?: string;
  name?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
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
  const emailForDetection = watchedEmail || state?.email || '';

  const {
    organization,
    isNewDomain,
    isLoading: isDetectingOrg,
  } = useOrganizationDetection(emailForDetection);

  useEffect(() => {
    const formValues = {
      email: state?.email || '',
      name: state?.profileData?.name || '',
      username: state?.profileData?.username || '',
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
    reset,
  ]);

  const password = watch('password');
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
  }, [
    state?.currentStep,
    isNewDomain,
    organization,
    isDetectingOrg,
    state?.userRole,
    updateState,
    emailForDetection,
  ]);

  const onSubmit = async (data: StepFormData) => {
    setError('');
    setIsSubmitting(true);

    try {
      switch (state?.currentStep) {
        case RegistrationStep.EMAIL:
          updateState({ email: data.email! });
          goToNextStep();
          break;

        case RegistrationStep.VERIFICATION:
          try {
            await authClient.signUp.email({
              email: state?.email || '',
              name: '',
              password: '',
            });
            updateState({ emailVerified: true });
            goToNextStep();
          } catch (err: any) {
            throw new Error(err.message || 'Email verification failed');
          }
          break;

        case RegistrationStep.ORG_DETECTION:
          goToNextStep();
          break;

        case RegistrationStep.PROFILE:
          updateState({
            profileData: {
              name: data.name!,
              username: data.username,
            },
          });
          goToNextStep();
          break;

        case RegistrationStep.ORG_SETUP:
          try {
            const orgResult = await authClient.organization.create({
              name: data.organizationName!,
              slug: data.organizationSlug!,
            });
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
          clearState();
          navigate('/c/new', { replace: true });
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
            <h2 className="text-2xl font-semibold">{localize('com_auth_email')}</h2>
            <input
              {...register('email', {
                required: localize('com_auth_email_required'),
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: localize('com_auth_email_pattern'),
                },
              })}
              type="email"
              aria-label={localize('com_auth_email')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder={localize('com_auth_email')}
            />
            {errors.email && <span className="text-sm text-red-500">{errors.email.message}</span>}
          </div>
        );

      case RegistrationStep.VERIFICATION:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Verify your email</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We&apos;ve sent a verification code to {state?.email || ''}
            </p>
            <input
              {...register('verificationCode', {
                required: 'Verification code is required',
              })}
              type="text"
              aria-label="Verification code"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder="Enter verification code"
            />
            {errors.verificationCode && (
              <span className="text-sm text-red-500">{errors.verificationCode.message}</span>
            )}
          </div>
        );

      case RegistrationStep.ORG_DETECTION:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Checking organization</h2>
            <OrganizationDetectionDisplay email={emailForDetection} />
          </div>
        );

      case RegistrationStep.PROFILE:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Create your profile</h2>
            <input
              {...register('name', {
                required: localize('com_auth_name_required'),
                minLength: {
                  value: 3,
                  message: localize('com_auth_name_min_length'),
                },
              })}
              type="text"
              aria-label={localize('com_auth_full_name')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder={localize('com_auth_full_name')}
            />
            {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}

            <input
              {...register('username', {
                minLength: {
                  value: 2,
                  message: localize('com_auth_username_min_length'),
                },
              })}
              type="text"
              aria-label={localize('com_auth_username')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder={localize('com_auth_username') + ' (optional)'}
            />
            {errors.username && (
              <span className="text-sm text-red-500">{errors.username.message}</span>
            )}

            <input
              {...register('password', {
                required: localize('com_auth_password_required'),
                minLength: {
                  value: 8,
                  message: localize('com_auth_password_min_length'),
                },
              })}
              type="password"
              aria-label={localize('com_auth_password')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder={localize('com_auth_password')}
            />
            {errors.password && (
              <span className="text-sm text-red-500">{errors.password.message}</span>
            )}

            <input
              {...register('confirmPassword', {
                validate: (value) => value === password || localize('com_auth_password_not_match'),
              })}
              type="password"
              aria-label={localize('com_auth_password_confirm')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder={localize('com_auth_password_confirm')}
            />
            {errors.confirmPassword && (
              <span className="text-sm text-red-500">{errors.confirmPassword.message}</span>
            )}
          </div>
        );

      case RegistrationStep.ORG_SETUP:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Set up your organization</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You&apos;re creating a new organization for{' '}
              {state?.organizationData?.domain || state?.email?.split('@')[1] || ''}
            </p>
            <input
              {...register('organizationName', {
                required: 'Organization name is required',
              })}
              type="text"
              aria-label="Organization name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder="Organization name"
            />
            {errors.organizationName && (
              <span className="text-sm text-red-500">{errors.organizationName.message}</span>
            )}

            <input
              {...register('organizationSlug', {
                required: 'Organization URL is required',
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Only lowercase letters, numbers, and hyphens allowed',
                },
              })}
              type="text"
              aria-label="Organization URL"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder="organization-url"
            />
            {errors.organizationSlug && (
              <span className="text-sm text-red-500">{errors.organizationSlug.message}</span>
            )}

            <textarea
              {...register('organizationDescription')}
              aria-label="Organization description"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder="Organization description (optional)"
              rows={3}
            />
          </div>
        );

      case RegistrationStep.INVITE_MEMBERS:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Invite team members</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Add email addresses separated by commas
            </p>
            <textarea
              {...register('invitations')}
              aria-label="Team member emails"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
              placeholder="email1@example.com, email2@example.com"
              rows={4}
            />
          </div>
        );

      case RegistrationStep.WELCOME:
        return (
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-semibold">Welcome to LibreChat!</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {state?.organizationData
                ? `You&apos;ve successfully joined ${state.organizationData.name}`
                : 'Your account has been created successfully'}
            </p>
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
          {['Email', 'Verification', 'Organization', 'Profile', 'Welcome'].map((step, index) => (
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
              <Button
                type="button"
                variant="ghost"
                onClick={skipCurrentStep}
                disabled={isSubmitting}
              >
                Skip
              </Button>
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
