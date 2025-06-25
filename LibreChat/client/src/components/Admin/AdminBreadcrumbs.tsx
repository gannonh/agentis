/**
 * @fileoverview Admin breadcrumb navigation component
 * @module components/Admin/AdminBreadcrumbs
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/Button';

interface BreadcrumbItem {
  label: string;
  path: string;
  current: boolean;
}

interface AdminBreadcrumbsProps {
  className?: string;
}

/**
 * Admin breadcrumb navigation component
 * Provides navigation context and quick access back to dashboard
 */
const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageInfo = (pathname: string) => {
    const pageMap: Record<string, { title: string; icon?: React.ReactNode }> = {
      '/admin': { title: 'Dashboard', icon: <Home className="h-4 w-4" /> },
      '/admin/users': { title: 'User Management' },
      '/admin/sessions': { title: 'Session Management' },
      '/admin/organizations': { title: 'Organization Management' },
      '/admin/settings': { title: 'System Settings' },
    };

    return pageMap[pathname] || { title: 'Admin' };
  };

  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always include dashboard as root
    breadcrumbs.push({
      label: 'Dashboard',
      path: '/admin',
      current: location.pathname === '/admin',
    });

    // Add current page if not dashboard
    if (location.pathname !== '/admin') {
      const pageInfo = getPageInfo(location.pathname);
      breadcrumbs.push({
        label: pageInfo.title,
        path: location.pathname,
        current: true,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = buildBreadcrumbs();
  const isOnDashboard = location.pathname === '/admin';

  return (
    <div className={`mb-6 flex items-center justify-between ${className}`}>
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm">
        <div className="flex items-center space-x-2">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />}

              {crumb.current ? (
                <span className="flex items-center space-x-1 font-medium text-gray-900 dark:text-white">
                  {crumb.path === '/admin' && <Home className="h-4 w-4" />}
                  <span>{crumb.label}</span>
                </span>
              ) : (
                <button
                  onClick={() => navigate(crumb.path)}
                  className="flex items-center space-x-1 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {crumb.path === '/admin' && <Home className="h-4 w-4" />}
                  <span>{crumb.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      </nav>

      {/* Back to Dashboard Button (only show on subpages) */}
      {!isOnDashboard && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      )}
    </div>
  );
};

export { AdminBreadcrumbs };
