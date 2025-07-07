import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

type RedirectState = 'LOADING' | 'CHECKING' | 'ALLOW_ACCESS' | 'NEED_ONBOARDING' | 'NO_SESSION';

/**
 * Component that checks if an authenticated user needs onboarding
 * and redirects them to the registration flow if they don't have an organization
 */
export const OAuthOnboardingRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [redirectState, setRedirectState] = useState<RedirectState>('LOADING');
  const [hasRedirected, setHasRedirected] = useState(false);

  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { data: activeOrganization, isPending: activeOrgLoading } =
    authClient.useActiveOrganization();
  const { data: organizations, isPending: orgsLoading } = authClient.useListOrganizations();

  useEffect(() => {
    const isLoading = sessionLoading || activeOrgLoading || orgsLoading;

    const debugData = {
      sessionLoading,
      activeOrgLoading,
      orgsLoading,
      isLoading,
      hasSession: !!session?.user,
      userEmail: session?.user?.email,
      hasActiveOrg: !!activeOrganization,
      activeOrgId: activeOrganization?.id,
      organizationsCount: organizations?.length || 0,
      currentState: redirectState,
      hasRedirected,
      timestamp: new Date().toISOString(),
    };

    console.log('🔍 OAuthOnboardingRedirect DEBUG:', debugData);

    // State machine logic
    if (isLoading) {
      setRedirectState('LOADING');
      return;
    }

    // All data loaded, make decisions
    if (!session?.user) {
      setRedirectState('NO_SESSION');
      return;
    }

    // User is authenticated, check organization status
    // BUT: Don't redirect users who have completed onboarding
    const hasCompletedOnboarding = session?.user?.onboardingStep === 'complete';
    
    if (!organizations || organizations.length === 0) {
      if (hasCompletedOnboarding) {
        // User completed onboarding but may not have organizations visible yet
        // This can happen due to timing issues with Better Auth organization sync
        console.log('⚠️ User completed onboarding but no orgs found - allowing access anyway');
        setRedirectState('ALLOW_ACCESS');
        return;
      }
      
      setRedirectState('NEED_ONBOARDING');
      if (!hasRedirected) {
        console.log('🔄 REDIRECTING: User has no organizations, needs onboarding');
        setHasRedirected(true);
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // User has organizations
    if (organizations.length > 0) {
      if (!activeOrganization) {
        setRedirectState('CHECKING');
        console.log('🔄 WAITING: User has organizations but no active org set yet...');
        return;
      } else {
        setRedirectState('ALLOW_ACCESS');
        console.log('✅ ALLOWING ACCESS: User has session and active organization');
        return;
      }
    }
  }, [
    session,
    activeOrganization,
    organizations,
    sessionLoading,
    activeOrgLoading,
    orgsLoading,
    navigate,
    redirectState,
    hasRedirected,
  ]);

  // Only render children if we're in a state that allows access
  if (redirectState === 'ALLOW_ACCESS') {
    return <>{children}</>;
  }

  // For all other states (loading, checking, redirecting), render nothing
  // This prevents any flash of content before redirect
  return null;
};

export default OAuthOnboardingRedirect;
