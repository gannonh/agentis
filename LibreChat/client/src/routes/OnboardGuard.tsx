import React from 'react';
import { Navigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

const DEFAULT_ONBOARDING_STEP = 'organization';

/**
 * OnboardGuard component that handles onboarding completion checking
 * Routes users to appropriate onboarding step if not complete
 */
export default function OnboardGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  console.log('OnboardGuard state:', {
    sessionLoading,
    hasSession: !!session?.user,
    userEmail: session?.user?.email,
    onboardingStep: session?.user?.onboardingStep,
  });

  // Show loading while checking session state
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

  // Should not happen - AuthGuard should catch this
  if (!session?.user) {
    console.log('OnboardGuard: No session found, redirecting to login');
    return <Navigate to="/login" replace={true} />;
  }

  const onboardingStep = session.user.onboardingStep || DEFAULT_ONBOARDING_STEP;

  // Check if user has completed onboarding
  if (onboardingStep !== 'complete') {
    // TODO: conditionally remove (!development) all client side debugging logs before production
    console.log('OnboardGuard: User needs to complete onboarding, redirecting to onboarding', {
      currentStep: onboardingStep,
    });
    return <Navigate to={`/onboarding?step=${onboardingStep}`} replace={true} />;
  }

  // User has completed onboarding - proceed to main app
  console.log('OnboardGuard: User has completed onboarding, proceeding to main app');
  return <>{children}</>;
}
