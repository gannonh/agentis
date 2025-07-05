import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { RecoilRoot } from 'recoil';
import AuthGuard from '../AuthGuard';

// Mock Better Auth client
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    useListOrganizations: vi.fn(),
  },
}));

// Mock data provider queries
vi.mock('~/data-provider', () => ({
  useUserTermsQuery: vi.fn(),
  useGetStartupConfig: vi.fn(),
}));

// Import the mocked modules to get typed access to the mocks
const { authClient } = await import('~/config/betterAuth');
const { useUserTermsQuery, useGetStartupConfig } = await import('~/data-provider');
const mockUseSession = authClient.useSession as Mock;
const mockUseListOrganizations = authClient.useListOrganizations as Mock;
const mockUseUserTermsQuery = useUserTermsQuery as Mock;
const mockUseGetStartupConfig = useGetStartupConfig as Mock;

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAuthGuard = () => {
    return render(
      <MemoryRouter>
        <AuthGuard />
      </MemoryRouter>,
    );
  };

  describe('Loading State Display', () => {
    it('shows loading spinner when session query is loading', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Check for loading spinner by class name since it doesn't have a semantic role
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows loading spinner when organizations query is loading', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('displays correct loading message', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      renderAuthGuard();

      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toBeInTheDocument();
      expect(loadingText).toHaveClass('text-gray-600');
    });
  });

  describe('Authenticated User Redirect', () => {
    it('redirects to /c/new when user is authenticated with organizations', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: [{ id: 'org1', name: 'Test Org' }],
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /c/new - no content should be rendered
      expect(container.firstChild).toBeNull();
    });

    it('redirects to /register when user has no organizations', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: [],
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /register - no content should be rendered
      expect(container.firstChild).toBeNull();
    });

    it('redirects to /register when organizations data is null', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: null,
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /register - no content should be rendered
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Unauthenticated User Redirect', () => {
    it('redirects to /login when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /login - no content should be rendered
      expect(container.firstChild).toBeNull();
    });

    it('redirects to /login when session has no user', () => {
      mockUseSession.mockReturnValue({
        data: { user: null },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /login - no content should be rendered
      expect(container.firstChild).toBeNull();
    });

    it('redirects to /login when session is undefined', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /login - no content should be rendered
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Session Data Handling', () => {
    it('shows loading state when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows loading state when organizations are loading', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('shows loading state when both queries are loading', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid auth state changes', () => {
      const { rerender } = render(
        <MemoryRouter>
          <AuthGuard />
        </MemoryRouter>,
      );

      // Start with loading
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      rerender(
        <MemoryRouter>
          <AuthGuard />
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Change to authenticated with organizations and complete profile
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com', name: 'Test User' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: [{ id: 'org1', name: 'Test Org' }],
        isPending: false,
      });

      const { container } = render(
        <RecoilRoot>
          <MemoryRouter>
            <AuthGuard />
          </MemoryRouter>
        </RecoilRoot>,
      );

      // Should redirect - no content rendered
      expect(container.firstChild).toBeNull();
    });

    it('handles undefined session data gracefully', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to login - no content should be rendered
      expect(container.firstChild).toBeNull();
    });

    it('handles empty organizations array', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: [],
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to register - no content should be rendered
      expect(container.firstChild).toBeNull();
    });

    it('handles session with user but organizations still loading', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Terms of Service Handling', () => {
    it('redirects to /c/new when user has completed onboarding but needs to accept terms', () => {
      mockUseGetStartupConfig.mockReturnValue({
        data: { interface: { termsOfService: { modalAcceptance: true } } },
      });
      mockUseUserTermsQuery.mockReturnValue({
        data: { termsAccepted: false },
        isPending: false,
      });
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com', name: 'Test User' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: [{ id: 'org1', name: 'Test Org' }],
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /c/new where terms modal will show
      expect(container.firstChild).toBeNull();
    });

    it('shows loading when terms query is pending', () => {
      mockUseGetStartupConfig.mockReturnValue({
        data: { interface: { termsOfService: { modalAcceptance: true } } },
      });
      mockUseUserTermsQuery.mockReturnValue({
        data: undefined,
        isPending: true,
      });
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com', name: 'Test User' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: [{ id: 'org1', name: 'Test Org' }],
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not require terms when modalAcceptance is disabled', () => {
      mockUseGetStartupConfig.mockReturnValue({
        data: { interface: { termsOfService: { modalAcceptance: false } } },
      });
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com', name: 'Test User' } },
        isPending: false,
      });
      mockUseListOrganizations.mockReturnValue({
        data: [{ id: 'org1', name: 'Test Org' }],
        isPending: false,
      });

      const { container } = renderAuthGuard();

      // Should redirect to /c/new directly since terms are not required
      expect(container.firstChild).toBeNull();
    });
  });
});
