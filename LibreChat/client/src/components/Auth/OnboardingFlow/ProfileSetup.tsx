/**
 * @fileoverview Profile setup component for onboarding flow
 * @module components/Auth/OnboardingFlow/ProfileSetup
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Camera, Upload } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';

interface ProfileSetupData {
  name: string;
  avatar?: string;
}

interface ProfileSetupProps {
  email: string;
  suggestedName?: string;
  onProfileComplete: (data: ProfileSetupData) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Profile setup component for user name and avatar
 * Used in onboarding flow for both org creators and members
 */
export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  email,
  suggestedName = '',
  onProfileComplete,
  isLoading = false,
  className = '',
}) => {
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarError, setAvatarError] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProfileSetupData>({
    defaultValues: {
      name: suggestedName || email.split('@')[0],
      avatar: '',
    },
    mode: 'onChange',
  });

  const watchedName = watch('name');

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image must be smaller than 2MB');
      return;
    }

    setAvatarError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAvatarPreview(result);
      setValue('avatar', result);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarPreview('');
    setValue('avatar', '');
    setAvatarError('');
  };

  const onSubmit = (data: ProfileSetupData) => {
    onProfileComplete(data);
  };

  // Generate initials for avatar placeholder
  const initials = watchedName
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={className}>
      <div className="mb-8 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-blue-600 dark:text-blue-400" />
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Set up your profile
        </h3>
        <p className="text-gray-600 dark:text-gray-400">Tell us a bit about yourself</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar upload */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg dark:border-gray-700"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-semibold text-white shadow-lg dark:border-gray-700">
                {initials || '?'}
              </div>
            )}

            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border border-gray-200 bg-white p-2 shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Camera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </label>

            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="mt-2 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Upload a photo</p>
            {avatarPreview && (
              <button
                type="button"
                onClick={removeAvatar}
                className="mt-1 text-xs text-red-600 hover:underline dark:text-red-400"
              >
                Remove photo
              </button>
            )}
          </div>

          {avatarError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{avatarError}</p>
          )}
        </div>

        {/* Name input */}
        <div>
          <Label
            htmlFor="fullName"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Full name
          </Label>
          <Input
            id="fullName"
            {...register('name', {
              required: 'Name is required',
              minLength: {
                value: 2,
                message: 'Name must be at least 2 characters',
              },
            })}
            placeholder="Enter your full name"
            className="mt-1"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>

        {/* Email display */}
        <div>
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Email address
          </Label>
          <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {email}
          </div>
        </div>

        <Button
          type="submit"
          disabled={!isValid || isLoading}
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </form>
    </div>
  );
};
