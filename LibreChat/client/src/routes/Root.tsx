import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import type { ContextType } from '~/common';
import { useAssistantsMap, useAgentsMap, useFileMap, useSearchEnabled } from '~/hooks';
import { authClient } from '~/config/betterAuth';
import { navigationService } from '~/services/NavigationService';
import store from '~/store';
import {
  AgentsMapContext,
  AssistantsMapContext,
  FileMapContext,
  SetConvoProvider,
  OrganizationProvider,
} from '~/Providers';
import TermsAndConditionsModal from '~/components/ui/TermsAndConditionsModal';
import { useUserTermsQuery, useGetStartupConfig } from '~/data-provider';
import { Nav, MobileNav } from '~/components/Nav';
import { Banner } from '~/components/Banners';
import { useAutoSetActiveOrganization } from '~/hooks/useAutoSetActiveOrganization';

export default function Root() {
  const [showTerms, setShowTerms] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const [navVisible, setNavVisible] = useState(() => {
    const savedNavVisible = localStorage.getItem('navVisible');
    return savedNavVisible !== null ? JSON.parse(savedNavVisible) : true;
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;
  const setQueriesEnabled = useSetRecoilState<boolean>(store.queriesEnabled);

  // Initialize navigation service with React Router's navigate
  useEffect(() => {
    navigationService.setNavigate(navigate);
  }, [navigate]);

  const logout = async () => {
    try {
      await authClient.signOut();
      navigationService.navigateToLogin();
    } catch (error) {
      console.error('Error during logout:', error);
      navigationService.navigateToLogin();
    }
  };

  // Automatically set active organization after login
  useAutoSetActiveOrganization();

  // Enable queries when user is authenticated (fixes Better Auth migration issue)
  useEffect(() => {
    if (isAuthenticated) {
      setQueriesEnabled(true);
    }
  }, [isAuthenticated, setQueriesEnabled]);

  const assistantsMap = useAssistantsMap({ isAuthenticated });
  const agentsMap = useAgentsMap({ isAuthenticated });
  const fileMap = useFileMap({ isAuthenticated });

  const { data: config } = useGetStartupConfig();
  const { data: termsData } = useUserTermsQuery({
    enabled: isAuthenticated && config?.interface?.termsOfService?.modalAcceptance === true,
  });

  useSearchEnabled(isAuthenticated);

  useEffect(() => {
    if (termsData) {
      // Don't show terms modal during onboarding - wait until user reaches main app
      const isInOnboarding = location.pathname === '/onboarding';
      setShowTerms(!termsData.termsAccepted && !isInOnboarding);
    }
  }, [termsData, location.pathname]);

  const handleAcceptTerms = () => {
    setShowTerms(false);
  };

  const handleDeclineTerms = () => {
    setShowTerms(false);
    logout();
  };

  if (!isAuthenticated) {
    // Don't block the redirect - AuthGuard will handle navigation
    return null;
  }

  return (
    <OrganizationProvider>
      <SetConvoProvider>
        <FileMapContext.Provider value={fileMap}>
          <AssistantsMapContext.Provider value={assistantsMap}>
            <AgentsMapContext.Provider value={agentsMap}>
              <Banner onHeightChange={setBannerHeight} />
              <div className="flex" style={{ height: `calc(100dvh - ${bannerHeight}px)` }}>
                <div className="relative z-0 flex h-full w-full overflow-hidden">
                  <Nav navVisible={navVisible} setNavVisible={setNavVisible} />
                  <div className="relative flex h-full max-w-full flex-1 flex-col overflow-hidden">
                    <MobileNav setNavVisible={setNavVisible} />
                    <Outlet context={{ navVisible, setNavVisible } satisfies ContextType} />
                  </div>
                </div>
              </div>
            </AgentsMapContext.Provider>
            {config?.interface?.termsOfService?.modalAcceptance === true && (
              <TermsAndConditionsModal
                open={showTerms}
                onOpenChange={setShowTerms}
                onAccept={handleAcceptTerms}
                onDecline={handleDeclineTerms}
                title={config.interface.termsOfService.modalTitle}
                modalContent={config.interface.termsOfService.modalContent}
              />
            )}
          </AssistantsMapContext.Provider>
        </FileMapContext.Provider>
      </SetConvoProvider>
    </OrganizationProvider>
  );
}
