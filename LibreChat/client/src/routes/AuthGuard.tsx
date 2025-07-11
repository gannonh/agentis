import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

/**
 * AuthGuard component that handles authentication checking only
 * Routes authenticated users to OnboardGuard for onboarding state checking
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  console.log('AuthGuard state:', {
    sessionLoading,
    hasSession: !!session?.user,
    userEmail: session?.user?.email,
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
    console.log('AuthGuard: No session, redirecting to login');
    return <Navigate to="/login" replace={true} />;
  }

  // User is authenticated - pass to children (OnboardGuard or main app)
  console.log('AuthGuard: User authenticated, proceeding to children');
  return <>{children}</>;
}
