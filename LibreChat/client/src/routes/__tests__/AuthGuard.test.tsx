import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { RecoilRoot } from 'recoil';
import AuthGuard from '../AuthGuard';

// Mock Better Auth client
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-testid="navigate" data-to={to} data-replace={String(replace)} />
    ),
  };
});

// Import the mocked modules to get typed access to the mocks
const { authClient } = await import('~/config/betterAuth');
const mockUseSession = authClient.useSession as Mock;

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAuthGuard = () => {
    return render(
      <RecoilRoot>
        <MemoryRouter>
          <AuthGuard>
            <div>Test Child</div>
          </AuthGuard>
        </MemoryRouter>
      </RecoilRoot>,
    );
  };

  describe('Loading State Display', () => {
    it('shows loading spinner when session query is loading', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Check for loading spinner by class name since it doesn't have a semantic role
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('displays correct loading message', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderAuthGuard();

      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    it('redirects to login when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
    });

    it('redirects to login when session user is undefined', () => {
      mockUseSession.mockReturnValue({
        data: { user: undefined },
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
    });

    it('redirects to login when session user is null', () => {
      mockUseSession.mockReturnValue({
        data: { user: null },
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
    });
  });

  describe('Authenticated User', () => {
    it('renders children when user is authenticated', () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });
  });

  describe('Session Data Handling', () => {
    it('handles session without user property', () => {
      mockUseSession.mockReturnValue({
        data: {},
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });

    it('handles malformed session data', () => {
      mockUseSession.mockReturnValue({
        data: 'invalid-session-data',
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined session data', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      renderAuthGuard();

      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    });
  });
});