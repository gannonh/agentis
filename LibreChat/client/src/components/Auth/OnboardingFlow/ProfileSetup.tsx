/**
 * @fileoverview Profile setup component for onboarding flow
 * @module components/Auth/OnboardingFlow/ProfileSetup
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { User, Camera, Upload, Check, X, AlertCircle } from 'lucide-react';
import { fileConfig as defaultFileConfig, mergeFileConfig } from 'librechat-data-provider';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { useUploadAvatarMutation, useGetFileConfig } from '~/data-provider';
import useDebounce from '~/hooks/Input/useDebounce';

interface ProfileSetupData {
  name: string;
  username?: string;
  avatar?: string;
}

interface OAuthProfileData {
  name?: string;
  picture?: string;
  email?: string;
}

interface ProfileSetupProps {
  email: string;
  suggestedName?: string;
  oauthData?: OAuthProfileData;
  onProfileComplete: (data: ProfileSetupData) => void;
  isLoading?: boolean;
  className?: string;
}

// URL sanitization utility to prevent XSS attacks
const sanitizeAvatarUrl = (url: string): string => {
  if (!url) return '';

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'file:', 'about:'];
  const lowercaseUrl = url.toLowerCase().trim();

  for (const protocol of dangerousProtocols) {
    if (lowercaseUrl.startsWith(protocol)) {
      return ''; // Return empty string for dangerous URLs
    }
  }

  // Only allow http/https URLs, relative paths, or data URLs (for server uploads)
  if (
    lowercaseUrl.startsWith('http://') ||
    lowercaseUrl.startsWith('https://') ||
    lowercaseUrl.startsWith('/') ||
    lowercaseUrl.startsWith('data:')
  ) {
    return url;
  }

  // If it doesn't match safe patterns, return empty
  return '';
};

/**
 * Profile setup component for user name and avatar
 * Used in onboarding flow for both org creators and members
 */
export const ProfileSetup: React.FC<ProfileSetupProps> = ({
  email,
  suggestedName = '',
  oauthData,
  onProfileComplete,
  isLoading = false,
  className = '',
}) => {
  const [avatarPreview, setAvatarPreview] = useState<string>(
    sanitizeAvatarUrl(oauthData?.picture || ''),
  );
  const [avatarError, setAvatarError] = useState<string>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProfileSetupData>({
    defaultValues: {
      name: oauthData?.name || suggestedName || email.split('@')[0],
      username: '',
      avatar: sanitizeAvatarUrl(oauthData?.picture || ''),
    },
    mode: 'onChange',
  });

  const watchedName = watch('name');
  const watchedUsername = watch('username');
  const uploadAvatarMutation = useUploadAvatarMutation();

  // Get file configuration from backend
  const { data: fileConfig = defaultFileConfig } = useGetFileConfig({
    select: (data) => mergeFileConfig(data),
  });

  // Debounced username value
  const debouncedUsername = useDebounce(watchedUsername || '', 500);

  // Username availability checking
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
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
  }, []);

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
        setValue('avatar', sanitizedUrl);
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);

      // Parse error message from backend for specific feedback
      let errorMessage = 'Failed to upload avatar. Please try again.';

      if (error && typeof error === 'object' && 'message' in error) {
        const backendMessage = error.message as string;

        // Check for common backend error patterns and provide user-friendly messages
        const maxSizeMB = Math.round(
          (fileConfig.avatarSizeLimit ?? 5 * 1024 * 1024) / (1024 * 1024),
        );
        if (
          typeof backendMessage === 'string' &&
          (backendMessage.includes('file too large') || backendMessage.includes('size'))
        ) {
          errorMessage = `Image is too large. Please select an image smaller than ${maxSizeMB}MB.`;
        } else if (
          typeof backendMessage === 'string' &&
          (backendMessage.includes('file type') || backendMessage.includes('format'))
        ) {
          errorMessage = 'Invalid file format. Please select a JPEG, PNG, GIF, or WebP image.';
        } else if (
          typeof backendMessage === 'string' &&
          (backendMessage.includes('network') || backendMessage.includes('timeout'))
        ) {
          errorMessage =
            'Upload failed due to network issues. Please check your connection and try again.';
        } else if (
          typeof backendMessage === 'string' &&
          (backendMessage.includes('quota') || backendMessage.includes('limit'))
        ) {
          errorMessage = 'Upload limit reached. Please try again later or contact support.';
        }
      }

      setAvatarError(errorMessage);
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview('');
    setValue('avatar', '');
    setAvatarError('');
  };

  // Generate username suggestion from name or email
  const generateUsernameSuggestion = (name: string, email: string) => {
    const baseUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);

    if (baseUsername.length >= 3) {
      return baseUsername;
    }

    return email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
  };

  // Track when the initial auto-generation has happened
  const [initialUsernameGenerated, setInitialUsernameGenerated] = useState(false);

  // Auto-suggest username only on initial load when username is empty
  useEffect(() => {
    if (watchedName && !watchedUsername && !initialUsernameGenerated) {
      const suggestion = generateUsernameSuggestion(watchedName, email);
      setValue('username', suggestion);
      setInitialUsernameGenerated(true);
    }
  }, [watchedName, watchedUsername, email, setValue, initialUsernameGenerated]);

  // Reset username availability when username changes
  useEffect(() => {
    if (watchedUsername !== debouncedUsername) {
      setUsernameAvailable(null);
    }
  }, [watchedUsername, debouncedUsername]);

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
                data-testid="avatar-preview"
                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-lg dark:border-gray-700"
                onLoad={() => console.log('✅ Avatar loaded successfully')}
                onError={() => {
                  const isOAuthAvatar =
                    avatarPreview.includes('googleusercontent.com') ||
                    oauthData?.picture === avatarPreview;

                  if (isOAuthAvatar) {
                    console.warn(
                      'OAuth avatar failed to load, keeping URL for retry:',
                      avatarPreview,
                    );
                    // Keep OAuth avatars even if they fail to load initially
                    // They might load on retry or after CORS issues resolve
                  } else {
                    console.warn(
                      'User-uploaded avatar failed to load, showing initials instead:',
                      avatarPreview,
                    );
                    setAvatarPreview(''); // Only clear manually uploaded broken images
                  }
                }}
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
              disabled={avatarUploading || isLoading}
            />
          </div>

          <div className="mt-2 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {avatarPreview ? 'Change photo' : 'Upload a photo'}
            </p>
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
            Full name *
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
            disabled={isLoading}
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
                pattern: {
                  value: /^[a-zA-Z0-9_-]+$/,
                  message: 'Username can only contain letters, numbers, underscores, and hyphens',
                },
                minLength: {
                  value: 3,
                  message: 'Username must be at least 3 characters',
                },
                maxLength: {
                  value: 20,
                  message: 'Username must be less than 20 characters',
                },
              })}
              placeholder="Choose a username"
              disabled={isLoading}
            />
            {/* Username availability indicator */}
            {watchedUsername && watchedUsername.length >= 3 && (
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
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username.message}</p>
          )}
          {usernameAvailable === false && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              This username is already taken
            </p>
          )}
          {usernameAvailable === true && (
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">Username is available</p>
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
          data-testid="profile-continue-button"
          disabled={
            !isValid ||
            isLoading ||
            avatarUploading ||
            Boolean(watchedUsername && usernameAvailable === false)
          }
          className="w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          {isLoading || avatarUploading ? 'Saving...' : 'Continue'}
        </Button>
      </form>
    </div>
  );
};
