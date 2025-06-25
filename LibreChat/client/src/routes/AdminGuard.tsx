import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { roleCheckers } from '~/config/betterAuth';
import { logger } from '~/services/logger';

/**
 * AdminGuard component that protects admin routes using Better Auth
 * Only allows access to users with platform admin role
 */
interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  logger.debug('AdminGuard auth state check', {
    component: 'AdminGuard',
    action: 'checkAuth',
    sessionLoading,
    hasSession: !!session?.user,
    userRole: session?.user?.role,
    isAdmin: session?.user?.role === 'admin',
  });

  // Show loading while checking auth state
  if (sessionLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // No session - redirect to login
  if (!session?.user) {
    logger.info('No session found, redirecting to login', {
      component: 'AdminGuard',
      action: 'redirect',
      reason: 'no-session',
      to: '/login',
    });
    return <Navigate to="/login" replace={true} />;
  }

  // Check if user has Better Auth admin role
  // The backend admin plugin is configured with adminRoles: ['admin']
  // But we should also support custom admin roles if configured
  const adminRoles = ['admin', 'superadmin']; // TODO: Get from Better Auth config
  const isAdmin = adminRoles.includes(session.user.role || '');

  // User is not admin - redirect to main chat
  if (!isAdmin) {
    logger.warn('User lacks admin privileges, redirecting to chat', {
      component: 'AdminGuard',
      action: 'redirect',
      reason: 'insufficient-role',
      userRole: session.user.role,
      to: '/c/new',
    });
    return <Navigate to="/c/new" replace={true} />;
  }

  // User is admin - render children
  logger.debug('Admin access granted', {
    component: 'AdminGuard',
    action: 'allow-access',
    userRole: session.user.role,
  });
  return <>{children}</>;
}
