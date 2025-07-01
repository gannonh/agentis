/**
 * @fileoverview Unified status badge component for admin interfaces
 * @module components/Admin/shared/AdminStatusBadge
 */

import React from 'react';
import { cn } from '~/utils';

interface AdminStatusBadgeProps {
  variant: 'role' | 'status' | 'verification' | 'custom';
  value: string;
  className?: string;
}

/**
 * Consistent status badge component for admin interfaces
 */
const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({ variant, value, className = '' }) => {
  const getVariantClasses = () => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

    switch (variant) {
      case 'role':
        switch (value.toLowerCase()) {
          case 'admin':
            return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300`;
          case 'user':
            return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300`;
          default:
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`;
        }

      case 'status':
        switch (value.toLowerCase()) {
          case 'active':
            return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
          case 'banned':
          case 'suspended':
            return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300`;
          case 'pending':
            return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300`;
          default:
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`;
        }

      case 'verification':
        switch (value.toLowerCase()) {
          case 'verified':
            return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300`;
          case 'unverified':
            return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300`;
          default:
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`;
        }

      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300`;
    }
  };

  return <span className={cn(getVariantClasses(), className)}>{value}</span>;
};

export { AdminStatusBadge };
