import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import AuthGuard from '../AuthGuard';

// Mock dependencies
vi.mock('~/hooks/AuthContext');
vi.mock('~/data-provider');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '~/hooks/AuthContext';
import { useGetSessionQuery } from '~/data-provider';

// Type the mocked functions
const mockNavigate = useNavigate as Mock;
const mockUseAuthContext = useAuthContext as Mock;
const mockUseGetSessionQuery = useGetSessionQuery as Mock;

describe('AuthGuard', () => {
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReturnValue(navigate);
  });

  const renderAuthGuard = () => {
    return render(
      <MemoryRouter>
        <AuthGuard />
      </MemoryRouter>
    );
  };

  describe('Loading State Display', () => {
    it('shows loading spinner when session query is loading', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Check for loading spinner by class name since it doesn't have a semantic role
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('displays correct loading message', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderAuthGuard();

      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toBeInTheDocument();
      expect(loadingText).toHaveClass('text-gray-600');
    });
  });

  describe('Authenticated User Redirect', () => {
    it('redirects to /c/new when isAuthenticated is true', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: true });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/c/new', { replace: true });
      });
    });

    it('uses replace: true navigation for authenticated users', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: true });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/c/new', { replace: true });
      });
    });

    it('calls navigate with correct parameters for authenticated users', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: true });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledWith('/c/new', { replace: true });
      });
    });
  });

  describe('Unauthenticated User Redirect', () => {
    it('redirects to /login when session query completes with no session', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: { session: null, user: null },
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('handles case where session data exists but user is null', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: { session: { id: 'test-session' }, user: null },
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('handles case where user exists but session is null', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: { session: null, user: { id: 'test-user' } },
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('handles completely undefined session data', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('uses replace: true navigation for unauthenticated users', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: { session: null, user: null },
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });
  });

  describe('Session Data Handling', () => {
    it('waits for context update when session exists but isAuthenticated is false', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: {
          session: { id: 'test-session' },
          user: { id: 'test-user', name: 'Test User' },
        },
        isLoading: false,
      });

      renderAuthGuard();

      // Should not navigate immediately, showing loading state
      expect(navigate).not.toHaveBeenCalled();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not navigate prematurely during auth context updates', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: {
          session: { id: 'test-session' },
          user: { id: 'test-user', name: 'Test User' },
        },
        isLoading: false,
      });

      renderAuthGuard();

      expect(navigate).not.toHaveBeenCalled();
    });

    it('handles session query errors gracefully', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Session query failed'),
      });

      renderAuthGuard();

      // Should still redirect to login on error
      expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
    });

    it('shows loading state while session query is loading', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      renderAuthGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('Session Query Configuration', () => {
    it('disables session query when already authenticated', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: true });
      
      renderAuthGuard();

      expect(mockUseGetSessionQuery).toHaveBeenCalledWith({
        enabled: false,
        retry: false,
        staleTime: 5 * 60 * 1000,
      });
    });

    it('enables session query when not authenticated', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      
      renderAuthGuard();

      expect(mockUseGetSessionQuery).toHaveBeenCalledWith({
        enabled: true,
        retry: false,
        staleTime: 5 * 60 * 1000,
      });
    });

    it('sets correct staleTime for session query', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      
      renderAuthGuard();

      expect(mockUseGetSessionQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 5 * 60 * 1000, // 5 minutes
        })
      );
    });

    it('disables retry for session query', () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      
      renderAuthGuard();

      expect(mockUseGetSessionQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          retry: false,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid auth state changes', async () => {
      const { rerender } = render(
        <MemoryRouter>
          <AuthGuard />
        </MemoryRouter>
      );

      // Start with unauthenticated
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      rerender(
        <MemoryRouter>
          <AuthGuard />
        </MemoryRouter>
      );

      // Change to authenticated
      mockUseAuthContext.mockReturnValue({ isAuthenticated: true });
      mockUseGetSessionQuery.mockReturnValue({
        data: { session: { id: 'test' }, user: { id: 'test' } },
        isLoading: false,
      });

      rerender(
        <MemoryRouter>
          <AuthGuard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/c/new', { replace: true });
      });
    });

    it('handles undefined sessionData gracefully', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('handles empty sessionData object', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: {},
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('handles session without user data', async () => {
      mockUseAuthContext.mockReturnValue({ isAuthenticated: false });
      mockUseGetSessionQuery.mockReturnValue({
        data: { session: { id: 'test-session' } },
        isLoading: false,
      });

      renderAuthGuard();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });
  });
});