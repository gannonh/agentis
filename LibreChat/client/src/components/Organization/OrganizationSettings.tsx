/**
 * @fileoverview Organization settings page for owners
 * @module components/Organization/OrganizationSettings
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Building2,
  Camera,
  Save,
  Trash2,
  AlertTriangle,
  Upload,
  ExternalLink,
  Globe,
  Users,
  UserPlus,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { Textarea } from '~/components/ui/Textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/AlertDialog';
import { OGDialog, OGDialogTrigger } from '~/components';
import OGDialogTemplate from '~/components/ui/OGDialogTemplate';
import { MemberManagement } from './MemberManagement';
import { useOrganization } from '~/Providers/OrganizationProvider';
import { useLocalize } from '~/hooks';
import type { OrganizationData } from '~/config/betterAuth';

interface OrganizationFormData {
  name: string;
  description?: string;
  website?: string;
  logo?: string;
}

interface OrganizationSettingsProps {
  className?: string;
}

/**
 * Organization settings page component
 * Allows organization owners to manage organization details
 */
export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ className = '' }) => {
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoError, setLogoError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const localize = useLocalize();
  const {
    organization,
    userRole,
    canUpdateSettings,
    canManageOrganization,
    updateOrganization,
    deleteOrganization,
    isLoading,
    members,
  } = useOrganization();

  console.log('OrganizationSettings - organization data:', organization);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<OrganizationFormData>({
    defaultValues: {
      name: organization?.name || '',
      description: organization?.metadata?.description || '',
      website: organization?.metadata?.website || '',
      logo: organization?.logo || '',
    },
  });

  // Set form values when organization data changes
  React.useEffect(() => {
    if (organization) {
      console.log('Setting form values from organization:', organization);
      console.log('organization.metadata:', organization.metadata);
      console.log('typeof organization.metadata:', typeof organization.metadata);

      // Check if metadata is a string that needs parsing
      let metadata = organization.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
          console.log('Parsed metadata:', metadata);
        } catch (e) {
          console.error('Failed to parse metadata:', e);
        }
      }

      const descValue = metadata?.description || '';
      const webValue = metadata?.website || '';
      console.log('Setting description to:', descValue);
      console.log('Setting website to:', webValue);

      setValue('name', organization.name || '');
      setValue('description', descValue);
      setValue('website', webValue);
      setValue('logo', organization.logo || '');
    }
  }, [organization, setValue]);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="text-gray-600 dark:text-gray-400">Loading organization settings...</div>
      </div>
    );
  }

  if (!organization || !canUpdateSettings) {
    return (
      <div className="py-12 text-center">
        <Building2 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don&apos;t have permission to manage organization settings.
        </p>
      </div>
    );
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setLogoError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Image must be smaller than 5MB');
      return;
    }

    setLogoError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      setValue('logo', result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview('');
    setValue('logo', '');
    setLogoError('');
  };

  const onSubmit = async (data: OrganizationFormData) => {
    try {
      await updateOrganization(data);
    } catch (error) {
      console.error('Failed to update organization:', error);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization) return;

    setIsDeleting(true);
    try {
      await deleteOrganization();
    } catch (error) {
      console.error('Failed to delete organization:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const currentLogo = logoPreview || organization.logo;

  return (
    <div className={`mx-auto max-w-2xl ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organization Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your organization&apos;s profile and settings
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Organization Logo */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Organization Logo
          </h3>

          <div className="flex items-center space-x-6">
            {/* Logo Preview */}
            <div className="relative">
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt={`${organization.name} logo`}
                  className="h-20 w-20 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
              )}

              <label
                htmlFor="logo-upload"
                className="absolute -bottom-2 -right-2 cursor-pointer rounded-full border border-gray-200 bg-white p-2 shadow-lg hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                <Camera className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </label>

              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            {/* Logo Actions */}
            <div className="flex-1">
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                Upload a logo for your organization. Recommended size: 200x200px.
              </p>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                {currentLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Remove
                  </Button>
                )}
              </div>
              {logoError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{logoError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Basic Information
          </h3>

          <div className="space-y-4">
            {/* Organization Name */}
            <div>
              <Label
                htmlFor="orgName"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Organization Name
              </Label>
              <Input
                id="orgName"
                {...register('name', {
                  required: 'Organization name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                placeholder="Enter organization name"
                className="mt-1"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
              )}
            </div>

            {/* Organization Slug (Read-only) */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Organization Slug
              </Label>
              <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                {organization.slug}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The organization slug cannot be changed
              </p>
            </div>

            {/* Description */}
            <div>
              <Label
                htmlFor="description"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe your organization..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Website */}
            <div>
              <Label
                htmlFor="website"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Website
              </Label>
              <div className="relative mt-1">
                <Input
                  id="website"
                  type="url"
                  {...register('website', {
                    pattern: {
                      value: /^https?:\/\/.+/,
                      message: 'Please enter a valid URL starting with http:// or https://',
                    },
                  })}
                  placeholder="https://example.com"
                  className="pr-10"
                />
                <ExternalLink className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              </div>
              {errors.website && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.website.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Organization Details */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Organization Details
          </h3>

          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Organization ID:</span>
              <span className="ml-2 font-mono text-gray-900 dark:text-white">
                {organization.id}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {new Date(organization.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Your Role:</span>
              <span className="ml-2 capitalize text-gray-900 dark:text-white">{userRole}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Domain:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {organization.metadata?.domain || 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Member Management */}
        {canManageOrganization && (
          <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Team Members
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage your organization members and their roles
                </p>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <OGDialog open={isUserManagementOpen} onOpenChange={setIsUserManagementOpen}>
                <OGDialogTrigger asChild>
                  <Button variant="outline" data-testid="manage-users-button">
                    <Users className="mr-2 h-4 w-4" />
                    Manage
                  </Button>
                </OGDialogTrigger>
                <OGDialogTemplate
                  title="Team Members"
                  className="max-w-[1000px]"
                  showCancelButton={false}
                  buttons={
                    <Button className="bg-blue-600 text-white hover:bg-blue-700">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  }
                  main={<MemberManagement onInviteMember={() => {/* TODO: Implement invite flow */}} showHeader={false} />}
                />
              </OGDialog>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            type="submit"
            disabled={!isDirty || isSubmitting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>

          {/* Delete Organization */}
          {userRole === 'owner' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-500" />
                    Delete Organization
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the organization
                    &quot;
                    {organization.name}&quot; and remove all associated data, including all members
                    and conversations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteOrganization}
                    disabled={isDeleting}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Organization'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </form>
    </div>
  );
};
