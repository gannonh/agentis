/**
 * @fileoverview Organization header component showing org context
 * @module components/Organization/OrganizationHeader
 */

import React from 'react';
import { Building2, Users, Crown, Settings, ChevronDown } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/DropdownMenu';
import { useOrganization } from '~/Providers/OrganizationProvider';

interface OrganizationHeaderProps {
  onSettingsClick?: () => void;
  className?: string;
}

/**
 * Organization header component
 * Shows current organization, user role, and quick actions
 */
export const OrganizationHeader: React.FC<OrganizationHeaderProps> = ({
  onSettingsClick,
  className = '',
}) => {
  const { organization, userRole, members, canManageOrganization } = useOrganization();

  if (!organization) {
    return null;
  }

  const roleDisplay = userRole === 'owner' ? 'Owner' : 'Member';
  const roleIcon = userRole === 'owner' ? Crown : Users;
  const RoleIcon = roleIcon;

  return (
    <div
      className={`border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Organization info */}
          <div className="flex items-center space-x-3">
            {/* Organization avatar/logo */}
            {organization.logo ? (
              <img
                src={organization.logo}
                alt={`${organization.name} logo`}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            )}

            {/* Organization details */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {organization.name}
              </h2>
              <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <RoleIcon className="h-4 w-4" />
                  <span>{roleDisplay}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center space-x-2">
            {canManageOrganization && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSettingsClick}
                className="flex items-center space-x-1"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
            )}

            {/* Organization menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                  <p className="font-medium text-gray-900 dark:text-white">{organization.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{organization.slug}</p>
                </div>

                <DropdownMenuItem onClick={onSettingsClick}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Organization Settings
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  View Members
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="text-gray-600 dark:text-gray-400">
                  <div className="flex flex-col">
                    <span className="text-xs">Organization ID</span>
                    <span className="font-mono text-xs">{organization.id}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};
