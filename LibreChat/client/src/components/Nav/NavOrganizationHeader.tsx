/**
 * @fileoverview Compact organization header for navigation sidebar
 * @module components/Nav/NavOrganizationHeader
 */

import React, { useState } from 'react';
import { Building2, Crown, Users } from 'lucide-react';
import { SettingsTabValues } from 'librechat-data-provider';
import { useOrganization } from '~/Providers/OrganizationProvider';
import Settings from './Settings';
import { cn } from '~/utils';

/**
 * Compact organization header for the navigation sidebar
 * Shows organization context and role in a condensed format
 */
export const NavOrganizationHeader: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const { organization, userRole, members, isLoading, canManageOrganization } = useOrganization();

  if (isLoading || !organization) {
    return null;
  }

  const roleIcon = userRole === 'owner' ? Crown : Users;
  const RoleIcon = roleIcon;

  const handleClick = () => {
    // Only open settings if user can manage organization
    if (canManageOrganization) {
      // Open settings modal with organization tab
      setShowSettings(true);
    }
    // If user is not an owner, this button should not be clickable
    // (handled by the UI state below)
  };

  return (
    <>
      <div
        data-testid="nav-organization-header"
        className={cn(
          'mx-2 mb-3 rounded-lg bg-surface-secondary p-3',
          canManageOrganization && 'cursor-pointer transition-colors duration-200 hover:bg-surface-tertiary',
          !canManageOrganization && 'cursor-default opacity-75',
        )}
        onClick={canManageOrganization ? handleClick : undefined}
        role={canManageOrganization ? "button" : undefined}
        tabIndex={canManageOrganization ? 0 : -1}
        onKeyDown={canManageOrganization ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        } : undefined}
      >
        <div className="flex items-center space-x-3">
          {/* Organization icon */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-purple-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>

          {/* Organization info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-text-primary">{organization.name}</h3>
            <div className="flex items-center space-x-2 text-xs text-text-secondary">
              <div className="flex items-center space-x-1">
                <RoleIcon className="h-3 w-3" />
                <span>{userRole === 'owner' ? 'Owner' : 'Member'}</span>
              </div>
              <span className="text-text-tertiary">•</span>
              <span>{members.length} members</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings modal with organization tab */}
      {showSettings && (
        <Settings
          open={showSettings}
          onOpenChange={setShowSettings}
          initialTab={SettingsTabValues.ORGANIZATION}
        />
      )}
    </>
  );
};

export default NavOrganizationHeader;
