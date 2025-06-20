/**
 * @fileoverview Organization setup component for account owners
 * @module components/Auth/OnboardingFlow/OrganizationSetup
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { Textarea } from '~/components/ui/Textarea';
import { authClient } from '~/config/betterAuth';

interface OrganizationSetupData {
  name: string;
  description?: string;
  firstTeamName: string;
  slug?: string; // Add slug to the form data
}

interface OrganizationSetupProps {
  email: string;
  suggestedOrgName: string;
  onSetupComplete: (data: OrganizationSetupData) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Organization setup component for new organization creators
 * Allows customization of organization name and initial team setup
 */
export const OrganizationSetup: React.FC<OrganizationSetupProps> = ({
  email,
  suggestedOrgName,
  onSetupComplete,
  isLoading = false,
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState<'org' | 'team'>('org');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<OrganizationSetupData>({
    defaultValues: {
      name: suggestedOrgName,
      description: '',
      firstTeamName: 'General',
      slug: suggestedOrgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    },
    mode: 'onChange',
  });

  const watchedName = watch('name');
  const watchedSlug = watch('slug');

  // Auto-generate slug from name when name changes
  useEffect(() => {
    if (watchedName && currentStep === 'org') {
      const autoSlug = watchedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', autoSlug);
    }
  }, [watchedName, setValue, currentStep]);

  // Check if slug is available using Better Auth
  const { 
    data: slugCheckResult, 
    isLoading: isCheckingSlug, 
    error: slugError 
  } = useQuery({
    queryKey: ['check-slug', watchedSlug],
    queryFn: async () => {
      if (!watchedSlug || watchedSlug.length < 2) return null;
      try {
        const result = await authClient.organization.checkSlug({ slug: watchedSlug });
        return result;
      } catch (error) {
        console.error('Error checking slug:', error);
        return null;
      }
    },
    enabled: !!watchedSlug && watchedSlug.length >= 2,
    staleTime: 1000, // Cache for 1 second to avoid too many requests
  });

  // Determine slug availability status
  const getSlugStatus = () => {
    if (!watchedSlug || watchedSlug.length < 2) return null;
    if (isCheckingSlug) return 'checking';
    if (slugError) return 'error';
    if (slugCheckResult?.data?.status === false) return 'taken';
    if (slugCheckResult?.data?.status === true) return 'available';
    return 'unknown';
  };

  const slugStatus = getSlugStatus();
  const isSlugValid = slugStatus === 'available' || slugStatus === 'unknown';

  const handleOrgStepNext = () => {
    if (watchedName.trim() && isSlugValid) {
      setCurrentStep('team');
    }
  };

  const onSubmit = (data: OrganizationSetupData) => {
    // Include the validated slug in the submission
    onSetupComplete({
      ...data,
      slug: watchedSlug,
    });
  };

  const renderSlugValidation = () => {
    if (!watchedSlug || watchedSlug.length < 2) return null;

    switch (slugStatus) {
      case 'checking':
        return (
          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking availability...</span>
          </div>
        );
      case 'available':
        return (
          <div className="mt-2 flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span>agentis.ai/{watchedSlug} is available</span>
          </div>
        );
      case 'taken':
        return (
          <div className="mt-2 flex items-center space-x-2 text-sm text-red-600 dark:text-red-400">
            <X className="h-4 w-4" />
            <span>agentis.ai/{watchedSlug} is already taken</span>
          </div>
        );
      case 'error':
        return (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Unable to check availability
          </div>
        );
      default:
        return (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            URL: agentis.ai/{watchedSlug}
          </div>
        );
    }
  };

  if (currentStep === 'org') {
    return (
      <div className={className}>
        <div className="mb-8 text-center">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-blue-600 dark:text-blue-400" />
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Name your organization
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            This will be visible to your team members
          </p>
        </div>

        <form onSubmit={handleSubmit(handleOrgStepNext)} className="space-y-6">
          <div>
            <Label
              htmlFor="orgName"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Organization name
            </Label>
            <Input
              id="orgName"
              {...register('name', {
                required: 'Organization name is required',
                minLength: {
                  value: 2,
                  message: 'Organization name must be at least 2 characters',
                },
              })}
              placeholder="Enter organization name"
              className="mt-1"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="orgSlug"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Organization URL
            </Label>
            <Input
              id="orgSlug"
              {...register('slug', {
                required: 'Organization URL is required',
                minLength: {
                  value: 2,
                  message: 'URL must be at least 2 characters',
                },
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Only lowercase letters, numbers, and hyphens allowed',
                },
              })}
              placeholder="organization-url"
              className={`mt-1 ${
                slugStatus === 'taken' 
                  ? 'border-red-500 focus:border-red-500' 
                  : slugStatus === 'available' 
                  ? 'border-green-500 focus:border-green-500' 
                  : ''
              }`}
            />
            {errors.slug && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slug.message}</p>
            )}
            {renderSlugValidation()}
          </div>

          <div>
            <Label
              htmlFor="orgDescription"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Description (optional)
            </Label>
            <Textarea
              id="orgDescription"
              {...register('description')}
              placeholder="What does your organization do?"
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>You&apos;ll be the organization owner</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!watchedName.trim() || !isSlugValid || isCheckingSlug}
            className="w-full bg-blue-600 text-white hover:bg-blue-700"
          >
            {isCheckingSlug ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  // Team setup step
  return (
    <div className={className}>
      <div className="mb-8 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-green-600 dark:text-green-400" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Create your first team
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Teams help organize conversations and projects
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Label
            htmlFor="teamName"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Team name
          </Label>
          <Input
            id="teamName"
            {...register('firstTeamName', {
              required: 'Team name is required',
              minLength: {
                value: 2,
                message: 'Team name must be at least 2 characters',
              },
            })}
            placeholder="e.g., General, Marketing, Engineering"
            className="mt-1"
          />
          {errors.firstTeamName && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.firstTeamName.message}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <h4 className="mb-2 font-medium text-green-800 dark:text-green-200">
            Organization summary
          </h4>
          <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>{watchedName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>First team: {watch('firstTeamName')}</span>
            </div>
            {watchedSlug && (
              <div className="flex items-center space-x-2">
                <span className="text-xs">URL: agentis.ai/{watchedSlug}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep('org')}
            className="flex-1"
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
          >
            {isLoading ? 'Creating...' : 'Create Organization'}
          </Button>
        </div>
      </form>
    </div>
  );
};
