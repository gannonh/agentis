import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

/**
 * AuthGuard component that handles root path routing using Better Auth
 * Uses declarative routing to avoid flashes
 */
export default function AuthGuard() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();

  console.log('AuthGuard Better Auth state:', {
    sessionLoading,
    orgsLoading,
    hasSession: !!session?.user,
    userEmail: session?.user?.email,
    organizationsCount: organizations?.length || 0,
  });

  // Show loading while checking auth state
  if (sessionLoading || orgsLoading) {
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
    console.log('AuthGuard: No session, redirecting to login');
    return <Navigate to="/login" replace={true} />;
  }

  // Has session but no organizations - redirect to onboarding
  if (!organizations || organizations.length === 0) {
    console.log('AuthGuard: User has no organizations, redirecting to onboarding');
    return <Navigate to="/register" replace={true} />;
  }

  // User is authenticated with organizations - redirect to chat
  console.log('AuthGuard: User authenticated with organizations, redirecting to chat');
  return <Navigate to="/c/new" replace={true} />;
}
