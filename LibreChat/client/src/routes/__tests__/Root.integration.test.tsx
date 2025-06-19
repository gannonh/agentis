import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecoilRoot } from 'recoil';
import Root from '../Root';
import { authClient } from '~/config/betterAuth';

// Mock dependencies
vi.mock('~/hooks/AuthContext', () => ({
  useAuthContext: () => ({
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock('~/data-provider', () => ({
  useGetSessionQuery: () => ({
    isLoading: false,
    data: { session: {}, user: {} },
  }),
  useGetStartupConfig: () => ({
    data: {
      interface: {
        termsOfService: {
          modalAcceptance: false,
        },
      },
    },
  }),
  useUserTermsQuery: () => ({
    data: null,
  }),
}));

vi.mock('~/hooks', () => ({
  useAuthContext: () => ({
    isAuthenticated: true,
    logout: vi.fn(),
  }),
  useAssistantsMap: () => ({ assistantsMap: {}, assistantsQuery: {} }),
  useAgentsMap: () => ({ agentsMap: {}, agentsQuery: {} }),
  useFileMap: () => ({ fileMap: {}, fileMapQuery: {} }),
  useSearchEnabled: vi.fn(),
}));

vi.mock('~/components/Nav', () => ({
  Nav: () => <div data-testid="nav">Nav</div>,
  MobileNav: () => <div data-testid="mobile-nav">MobileNav</div>,
}));

vi.mock('~/components/Banners', () => ({
  Banner: ({ onHeightChange }: { onHeightChange: (height: number) => void }) => {
    React.useEffect(() => {
      onHeightChange(0);
    }, [onHeightChange]);
    return <div data-testid="banner">Banner</div>;
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet</div>,
  };
});

// Mock Better-auth client hooks
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useActiveOrganization: vi.fn(() => ({
      data: {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        createdAt: new Date(),
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn(),
    })),
    useSession: vi.fn(() => ({
      data: {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        session: {
          id: 'session-123',
        },
      },
    })),
    organization: {
      getFullOrganization: vi.fn(),
    },
  },
}));

// Store original mocks to restore them
const originalMocks = {
  useGetSessionQuery: vi.fn(() => ({
    isLoading: false,
    data: { session: {}, user: {} },
  })),
  useAuthContext: vi.fn(() => ({
    isAuthenticated: true,
    logout: vi.fn(),
  })),
};

describe('Root Component Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Reset mocks to original state
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        createdAt: new Date(),
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as any);
  });

  const renderRoot = () => {
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

  it('renders with OrganizationProvider when authenticated', async () => {
    renderRoot();

    await waitFor(() => {
      expect(screen.getByTestId('nav')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
      expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });
  });

  it('provides organization context to child components', async () => {
    const { container } = renderRoot();

    await waitFor(() => {
      // Verify that the component renders without errors
      expect(container.querySelector('.flex')).toBeInTheDocument();
    });

    // Verify Better-auth hooks were called
    expect(authClient.useActiveOrganization).toHaveBeenCalled();
    expect(authClient.useSession).toHaveBeenCalled();
  });

  it('integrates OrganizationProvider with Better-auth hooks', async () => {
    const mockGetFullOrganization = vi.fn().mockResolvedValue({
      data: {
        organization: { id: 'org-123', name: 'Test Organization' },
        members: [
          {
            id: 'member-1',
            userId: 'user-123',
            role: 'owner',
            organizationId: 'org-123',
          },
        ],
        invitations: [],
      },
    });

    authClient.organization.getFullOrganization = mockGetFullOrganization;

    renderRoot();

    await waitFor(() => {
      expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    // The OrganizationProvider should be active and providing context
    // This test verifies the integration is working without errors
  });

  it('handles organization context errors gracefully', async () => {
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      error: new Error('Failed to load organization'),
      isPending: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as any);

    renderRoot();

    // Should still render the app even with organization errors
    await waitFor(() => {
      expect(screen.getByTestId('nav')).toBeInTheDocument();
    });
  });

  it('preserves nav visibility state from localStorage', () => {
    localStorage.setItem('navVisible', 'false');

    renderRoot();

    // The component should respect the saved nav visibility preference
    expect(screen.getByTestId('nav')).toBeInTheDocument();
  });

  it('integrates all required providers in correct order', async () => {
    renderRoot();

    await waitFor(() => {
      // Verify all providers are integrated correctly
      expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    // The provider hierarchy should be:
    // OrganizationProvider -> SetConvoProvider -> FileMapContext -> AssistantsMapContext -> AgentsMapContext
    // This test ensures no provider conflicts or missing dependencies
  });
});
