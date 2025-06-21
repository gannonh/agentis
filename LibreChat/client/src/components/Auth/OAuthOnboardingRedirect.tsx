import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

/**
 * Component that checks if an authenticated user needs onboarding
 * and redirects them to the registration flow if they don't have an organization
 */
export const OAuthOnboardingRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { data: activeOrganization } = authClient.useActiveOrganization();

  useEffect(() => {
    console.log('🔍 OAuthOnboardingRedirect check:', {
      hasSession: !!session?.user,
      userEmail: session?.user?.email,
      hasActiveOrg: !!activeOrganization,
      activeOrgId: activeOrganization?.id,
      activeOrgName: activeOrganization?.name,
    });

    // If user is authenticated but has no active organization, they need onboarding
    if (session?.user && !activeOrganization) {
      console.log('🔄 Authenticated user without organization, redirecting to onboarding');
      navigate('/register', { replace: true });
    }
  }, [session, activeOrganization, navigate]);

  // If user is authenticated and has an organization, show the children
  // If not authenticated, let the normal auth flow handle it
  return <>{children}</>;
};

export default OAuthOnboardingRedirect;