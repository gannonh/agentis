/**
 * @fileoverview Account profile setup component for settings
 * @module components/Nav/SettingsTabs/Account/AccountProfileSetup
 *
 * Adapted from ProfileSetup component for use in Account settings
 * Provides profile management with Better Auth integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { User, Camera, Check, X, Save } from 'lucide-react';
import { fileConfig as defaultFileConfig, mergeFileConfig } from 'librechat-data-provider';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { useUploadAvatarMutation, useGetFileConfig } from '~/data-provider';
import { useToastContext } from '~/Providers/ToastContext';
import { authClient } from '~/config/betterAuth';
import { NotificationSeverity } from '~/common/types';
import useDebounce from '~/hooks/Input/useDebounce';
import { useGetUserQuery } from '~/data-provider';

interface ProfileData {
  name: string;
  username?: string;
  avatar?: string;
}

interface AccountProfileSetupProps {
  className?: string;
}

// URL sanitization utility to prevent XSS attacks
const sanitizeAvatarUrl = (url: string): string => {
  if (!url) return '';

  const trimmedUrl = url.trim();
  const lowercaseUrl = trimmedUrl.toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'file:', 'about:', 'data:'];

  for (const protocol of dangerousProtocols) {
    if (lowercaseUrl.startsWith(protocol)) {
      return ''; // Return empty string for dangerous URLs
    }
  }

  // Block any HTML/XML content that could contain event handlers
  if (trimmedUrl.includes('<') || trimmedUrl.includes('>')) {
    return '';
  }

  // Block URLs containing event handler patterns (e.g., onclick=, onerror=, etc.)
  const eventHandlerPattern = /on[a-z]+\s*=/i;
  if (eventHandlerPattern.test(trimmedUrl)) {
    return '';
  }

  // Only allow http/https URLs or relative paths
  if (
    lowercaseUrl.startsWith('http://') ||
    lowercaseUrl.startsWith('https://') ||
    lowercaseUrl.startsWith('/')
  ) {
    return trimmedUrl;
  }

  // If it doesn't match safe patterns, return empty
  return '';
};

/**
 * Account profile setup component for managing user profile in settings
 * Uses Better Auth for profile updates
 */
export const AccountProfileSetup: React.FC<AccountProfileSetupProps> = ({ className = '' }) => {
  const { showToast } = useToastContext();
  const { data: session, refetch: refetchSession } = authClient.useSession();

  // Get complete user data including avatar - following onboarding pattern
  const { data: userData, refetch: refetchUserData } = useGetUserQuery();

  const user = session?.user;
  const email = user?.email || '';

  // Initialize avatar preview exactly like onboarding ProfileSetup does
  const [avatarPreview, setAvatarPreview] = useState<string>(
    sanitizeAvatarUrl(userData?.avatar || userData?.image || ''),
  );
  const [avatarError, setAvatarError] = useState<string>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<ProfileData>({
    defaultValues: {
      name: user?.name || '',
      username: user?.username || '',
      avatar: sanitizeAvatarUrl(userData?.avatar || userData?.image || ''),
    },
    mode: 'onChange',
  });

  // Reset form when userData loads - following onboarding pattern
  useEffect(() => {
    if (userData && user) {
      const sanitizedAvatar = sanitizeAvatarUrl(userData.avatar || userData.image || '');
      reset({
        name: user.name || '',
        username: user.username || '',
        avatar: sanitizedAvatar,
      });
      setAvatarPreview(sanitizedAvatar);
    }
  }, [userData, user, reset]);

  const watchedUsername = watch('username');
  const watchedName = watch('name');
  const uploadAvatarMutation = useUploadAvatarMutation();

  // Get file configuration from backend
  const { data: fileConfig = defaultFileConfig } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  // Debounced username value
  const debouncedUsername = useDebounce(watchedUsername || '', 500);

  // Username availability checking
  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      // Don't check if it's the current username
      if (username === user?.username) {
        setUsernameAvailable(true);
        return;
      }

      setCheckingUsername(true);
      try {
        const response = await fetch(
          `/api/user/check-username?username=${encodeURIComponent(username)}`,
        );
        const result = await response.json();
        setUsernameAvailable(result.available);
      } catch (error) {
        console.error('Username check failed:', error);
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    },
    [user?.username],
  );

  // Check username availability when debounced value changes
  useEffect(() => {
    if (debouncedUsername) {
      checkUsernameAvailability(debouncedUsername);
    }
  }, [debouncedUsername, checkUsernameAvailability]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type with specific supported formats
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedTypes.includes(file.type.toLowerCase())) {
      setAvatarError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size using backend configuration
    const maxSize = fileConfig.avatarSizeLimit ?? 5 * 1024 * 1024; // Default to 5MB
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setAvatarError(
        `Image is too large (${fileSizeMB}MB). Please select an image smaller than ${maxSizeMB}MB.`,
      );
      return;
    }

    setAvatarError('');
    setAvatarUploading(true);

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('manual', 'true'); // Ensure avatar is saved to user profile

      // Upload through the avatar API
      const uploadResult = await uploadAvatarMutation.mutateAsync(formData);

      if (uploadResult?.url) {
        const sanitizedUrl = sanitizeAvatarUrl(uploadResult.url);
        setAvatarPreview(sanitizedUrl);
        setValue('avatar', sanitizedUrl, { shouldDirty: true });
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setAvatarError('Failed to upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = () => {
    console.log('🗑️ ACCOUNT SETTINGS: removeAvatar called');
    setAvatarPreview('');
    setValue('avatar', '', { shouldDirty: true }); // Mark form as dirty to enable Save button
    setAvatarError('');
  };

  // Reset username availability when username changes
  useEffect(() => {
    if (watchedUsername !== debouncedUsername) {
      setUsernameAvailable(null);
    }
  }, [watchedUsername, debouncedUsername]);

  const onSubmit = async (data: ProfileData) => {
    setIsSubmitting(true);

    try {
      // Build update data
      const updateData: any = {
        name: data.name.trim(),
      };

      // Add username if changed
      if (data.username && data.username !== user?.username) {
        updateData.username = data.username;
      }

      // Add avatar if changed
      if (data.avatar !== (userData?.avatar || '')) {
        // Explicitly handle avatar deletion
        if (data.avatar === '') {
          updateData.avatar = null;
        } else {
          updateData.avatar = data.avatar;
        }
      }

      console.log('💾 ACCOUNT: About to call authClient.updateUser with:', updateData);

      // Update user profile with Better Auth
      await authClient.updateUser(updateData);

      console.log('💾 ACCOUNT: authClient.updateUser completed, now refetching data');

      // Refresh both session and user data to get updated avatar
      await refetchSession();
      const updatedUserData = await refetchUserData();

      console.log('💾 ACCOUNT: Data refetched, updatedUserData:', updatedUserData?.data);

      showToast({
        message: 'Profile updated successfully',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });

      // Reset form dirty state with updated user data (avatar or fallback to image)
      const latestAvatar = updatedUserData?.data?.avatar || updatedUserData?.data?.image || '';
      const resetData = {
        name: data.name,
        username: data.username || '',
        avatar: sanitizeAvatarUrl(latestAvatar),
      };

      reset(resetData);

      // Update avatar preview with the latest user avatar
      setAvatarPreview(sanitizeAvatarUrl(latestAvatar));
    } catch (error) {
      console.error('Profile update failed:', error);
      showToast({
        message: 'Failed to update profile. Please try again.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate initials for avatar placeholder
  const initials = watchedName
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`rounded-lg bg-white p-6 shadow dark:bg-gray-800 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Update your profile photo and personal details
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar upload */}
        <div className="flex items-start space-x-6">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                data-testid="avatar-preview"
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg dark:border-gray-700"
                onError={() => {
                  setAvatarPreview('');
                  setValue('avatar', '');
                }}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-purple-600 text-xl font-semibold text-white shadow-lg dark:border-gray-700">
                {initials || <User className="h-8 w-8" />}
              </div>
            )}

            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border border-gray-200 bg-white p-2 shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              {avatarUploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              ) : (
                <Camera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </label>

            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
              disabled={avatarUploading || isSubmitting}
            />
          </div>

          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              JPG, GIF, WebP or PNG. Max size of{' '}
              {Math.round((fileConfig.avatarSizeLimit ?? 5 * 1024 * 1024) / (1024 * 1024))}MB.
            </p>
            {avatarPreview && (
              <button
                type="button"
                onClick={removeAvatar}
                className="mt-2 text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Remove photo
              </button>
            )}
            {avatarError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{avatarError}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name input */}
          <div className="sm:col-span-2">
            <Label
              htmlFor="fullName"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Full name
            </Label>
            <Input
              id="fullName"
              data-testid="profile-name-input"
              {...register('name', {
                required: 'Name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
                maxLength: {
                  value: 50,
                  message: 'Name must be less than 50 characters',
                },
              })}
              placeholder="Enter your full name"
              className="mt-1"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Username input */}
          <div>
            <Label
              htmlFor="username"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Username
            </Label>
            <div className="relative mt-1">
              <Input
                id="username"
                data-testid="profile-username-input"
                {...register('username', {
                  validate: (value) => {
                    // If username is empty, it's valid (optional field)
                    if (!value || value.trim() === '') {
                      return true;
                    }

                    // If username has a value, apply validation rules
                    if (value.length < 3) {
                      return 'Username must be at least 3 characters';
                    }

                    if (value.length > 20) {
                      return 'Username must be less than 20 characters';
                    }

                    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
                      return 'Username can only contain letters, numbers, underscores, and hyphens';
                    }

                    return true;
                  },
                })}
                placeholder="Choose a username"
                disabled={isSubmitting}
              />
              {/* Username availability indicator */}
              {watchedUsername &&
                watchedUsername.length >= 3 &&
                watchedUsername !== user?.username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
                    ) : usernameAvailable === true ? (
                      <Check className="h-4 w-4 text-green-500" data-testid="username-available" />
                    ) : usernameAvailable === false ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                )}
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.username.message}
              </p>
            )}
            {usernameAvailable === false && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                This username is already taken
              </p>
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
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button
            type="submit"
            data-testid="profile-save-button"
            disabled={
              !isValid ||
              !isDirty ||
              isSubmitting ||
              avatarUploading ||
              Boolean(watchedUsername && usernameAvailable === false)
            }
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
