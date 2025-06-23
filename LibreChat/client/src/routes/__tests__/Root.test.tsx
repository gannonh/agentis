import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Root from '../Root';
import { navigationService } from '~/services/NavigationService';

// Mock navigate function
const mockNavigate = vi.fn();

// Mock dependencies
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: { user: { id: 'test-user' } } })),
    useActiveOrganization: vi.fn(() => ({ data: null })),
    useListOrganizations: vi.fn(() => ({ data: [] })),
    signOut: vi.fn(),
  },
}));

vi.mock('~/services/NavigationService', () => ({
  navigationService: {
    setNavigate: vi.fn(),
    navigateToLogin: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div>Outlet</div>,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('~/components/Nav', () => ({
  Nav: () => <div>Nav</div>,
  MobileNav: () => <div>MobileNav</div>,
}));

vi.mock('~/components/Banners', () => ({
  Banner: () => <div>Banner</div>,
}));

vi.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: {} }),
  useUserTermsQuery: () => ({ data: null }),
}));

vi.mock('~/hooks', () => ({
  useAssistantsMap: () => ({ map: {}, get: vi.fn() }),
  useAgentsMap: () => ({ map: {}, get: vi.fn() }),
  useFileMap: () => ({ map: {}, get: vi.fn() }),
  useSearchEnabled: vi.fn(),
  useAutoSetActiveOrganization: vi.fn(),
}));

describe('Root', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RecoilRoot>
          <MemoryRouter>
            <Root />
          </MemoryRouter>
        </RecoilRoot>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize NavigationService with React Router navigate on mount', () => {
    renderComponent();

    expect(navigationService.setNavigate).toHaveBeenCalledWith(mockNavigate);
  });
});
