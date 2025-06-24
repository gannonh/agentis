import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { roleCheckers } from '~/config/betterAuth';

/**
 * AdminGuard component that protects admin routes using Better Auth
 * Only allows access to users with platform admin role
 */
interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  console.log('AdminGuard Better Auth state:', {
    sessionLoading,
    hasSession: !!session?.user,
    userEmail: session?.user?.email,
    userRole: session?.user?.role,
    isAdmin: session?.user?.role === 'admin' || session?.user?.isAdmin,
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
    console.log('AdminGuard: No session, redirecting to login');
    return <Navigate to="/login" replace={true} />;
  }

  // Check if user has Better Auth admin role
  // The backend admin plugin is configured with adminRoles: ['admin']
  // But we should also support custom admin roles if configured
  const adminRoles = ['admin', 'superadmin']; // TODO: Get from Better Auth config
  const isAdmin = adminRoles.includes(session.user.role || '');

  // User is not admin - redirect to main chat
  if (!isAdmin) {
    console.log('AdminGuard: User is not admin, redirecting to chat');
    return <Navigate to="/c/new" replace={true} />;
  }

  // User is admin - render children
  console.log('AdminGuard: User is admin, rendering admin content');
  return <>{children}</>;
}