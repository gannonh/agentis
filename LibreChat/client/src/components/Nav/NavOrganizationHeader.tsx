/**
 * @fileoverview Compact organization header for navigation sidebar
 * @module components/Nav/NavOrganizationHeader
 */

import React from 'react';
import { Building2, Crown, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '~/Providers/OrganizationProvider';
import { cn } from '~/utils';

/**
 * Compact organization header for the navigation sidebar
 * Shows organization context and role in a condensed format
 */
export const NavOrganizationHeader: React.FC = () => {
  const navigate = useNavigate();
  const { organization, userRole, members, isLoading } = useOrganization();

  if (isLoading || !organization) {
    return null;
  }

  const roleIcon = userRole === 'owner' ? Crown : Users;
  const RoleIcon = roleIcon;

  const handleClick = () => {
    // Navigate to organization settings (to be implemented)
    navigate('/settings/organization');
  };

  return (
    <div
      className={cn(
        'mx-2 mb-3 cursor-pointer rounded-lg bg-surface-secondary p-3',
        'transition-colors duration-200 hover:bg-surface-tertiary',
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
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
  );
};

export default NavOrganizationHeader;
