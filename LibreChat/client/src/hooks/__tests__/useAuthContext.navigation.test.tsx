import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useAuthContext } from '../useAuthContext';
import { authClient } from '../../config/betterAuth';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('../../config/betterAuth', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: '1', email: 'test@example.com' } } }),
    signOut: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock the useGetUserQuery hook
vi.mock('~/data-provider/Auth/queries', () => ({
  useGetUserQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
}));

// Router wrapper for testing
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <MemoryRouter>{children}</MemoryRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );
};

describe('useAuthContext Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocked function returns
    (useNavigate as Mock).mockReturnValue(mockNavigate);

    // Reset window mock
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  describe('logout', () => {
    it('should use React Router navigation instead of window.location.href on successful logout', async () => {
      // Arrange
      const mockSignOut = vi.mocked(authClient.signOut);
      mockSignOut.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper() });

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      expect(window.location.href).toBe(''); // Should not modify window.location
    });

    it('should use React Router navigation instead of window.location.href on logout error', async () => {
      // Arrange
      const mockSignOut = vi.mocked(authClient.signOut);
      mockSignOut.mockRejectedValue(new Error('Logout failed'));
      const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper() });

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      expect(window.location.href).toBe(''); // Should not modify window.location
    });

    it('should handle logout gracefully', async () => {
      // Arrange
      const mockSignOut = vi.mocked(authClient.signOut);
      mockSignOut.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuthContext(), { wrapper: createWrapper() });

      // Act
      await act(async () => {
        await result.current.logout();
      });

      // Assert
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});
