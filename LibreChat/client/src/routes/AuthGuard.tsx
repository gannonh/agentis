import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';
import { useUserTermsQuery, useGetStartupConfig } from '~/data-provider';

/**
 * AuthGuard component that handles root path routing using Better Auth
 * Uses declarative routing to avoid flashes
 */
export default function AuthGuard() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();
  const { data: config } = useGetStartupConfig();
  const { data: termsData, isLoading: termsLoading } = useUserTermsQuery({
    enabled: !!session?.user && config?.interface?.termsOfService?.modalAcceptance === true,
  });

  // Check if terms are required
  const termsRequired = config?.interface?.termsOfService?.modalAcceptance === true;
  const termsAccepted = !termsRequired || termsData?.termsAccepted;

  console.log('AuthGuard Better Auth state:', {
    sessionLoading,
    orgsLoading,
    termsLoading,
    hasSession: !!session?.user,
    userEmail: session?.user?.email,
    organizationsCount: organizations?.length || 0,
    termsRequired,
    termsAccepted,
  });

  // Show loading while checking auth state
  if (sessionLoading || orgsLoading || (termsRequired && termsLoading)) {
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

  // Check if user has completed onboarding (has organization AND has set their name AND accepted terms)
  const hasOrganization = organizations && organizations.length > 0;
  const hasCompletedProfile = !!session.user.name;
  const hasCompletedOnboarding = hasOrganization && hasCompletedProfile && termsAccepted;

  // If no organizations or onboarding not completed - redirect to onboarding
  if (!hasOrganization || !hasCompletedProfile) {
    console.log('AuthGuard: User needs to complete onboarding, redirecting to onboarding', {
      hasOrganizations: hasOrganization,
      hasName: hasCompletedProfile,
      termsAccepted: termsAccepted,
      onboardingComplete: hasCompletedOnboarding,
    });
    return <Navigate to="/onboarding" replace={true} />;
  }

  // User has completed onboarding but not accepted terms - redirect to chat (terms modal will show)
  if (!termsAccepted) {
    console.log(
      'AuthGuard: User completed onboarding but needs to accept terms, redirecting to chat',
    );
    return <Navigate to="/c/new" replace={true} />;
  }

  // User is fully authenticated and ready - redirect to chat
  console.log('AuthGuard: User fully authenticated and ready, redirecting to chat');
  return <Navigate to="/c/new" replace={true} />;
}
