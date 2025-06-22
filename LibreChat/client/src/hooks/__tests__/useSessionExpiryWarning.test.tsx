/**
 * @fileoverview Tests for useSessionExpiryWarning hook
 * @module hooks/__tests__/useSessionExpiryWarning.test
 *
 * This test suite validates the session expiry warning functionality:
 * - Warning triggers 5 minutes before session expiry
 * - Session refresh behavior
 * - Graceful handling of expired sessions
 */

import { renderHook, act } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { vi, type Mock } from 'vitest';
import { useSessionExpiryWarning } from '../useSessionExpiryWarning';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

// Import after mocking
import { useNavigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

// Type the mocked functions
const mockNavigateFn = useNavigate() as ReturnType<typeof vi.fn>;
const mockUseSession = authClient.useSession as ReturnType<typeof vi.fn>;

describe('useSessionExpiryWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    // Set default mock return value AFTER clearing mocks
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RecoilRoot>{children}</RecoilRoot>
  );

  describe('Session Expiry Warning', () => {
    it('should show warning 5 minutes before session expires', () => {
      // Mock session that expires in 6 minutes
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 6 * 60 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      // Initially no warning
      expect(result.current.showWarning).toBe(false);
      expect(result.current.timeRemaining).toBeGreaterThan(5 * 60);

      // Fast forward to 4 minutes before expiry
      act(() => {
        vi.advanceTimersByTime(2 * 60 * 1000);
      });

      // Should show warning now
      expect(result.current.showWarning).toBe(true);
      expect(result.current.timeRemaining).toBeLessThanOrEqual(5 * 60);
      expect(result.current.timeRemaining).toBeGreaterThan(0);
    });

    it('should update time remaining every second', () => {
      // Mock session that expires in 4 minutes
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      const initialTime = result.current.timeRemaining;
      expect(result.current.showWarning).toBe(true);

      // Advance 5 seconds
      act(() => {
        vi.advanceTimersByTime(5 * 1000);
      });

      expect(result.current.timeRemaining).toBe(initialTime - 5);
    });

    it('should format time remaining correctly', () => {
      // Mock session that expires in 3 minutes 45 seconds
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 3 * 60 * 1000 + 45 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      expect(result.current.formattedTime).toBe('3:45');
    });
  });

  describe('Session Refresh', () => {
    it('should refresh session when user acknowledges warning', async () => {
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      // Wait for hook to stabilize
      await vi.waitFor(() => {
        expect(result.current).toBeDefined();
      });

      expect(result.current.showWarning).toBe(true);

      // Mock successful refresh
      const newExpiryTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      mockUseSession.mockReturnValueOnce({
        ...mockSession,
        data: {
          session: {
            ...mockSession.data.session,
            expiresAt: newExpiryTime,
          },
        },
      });

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(result.current.showWarning).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should handle refresh failure gracefully', async () => {
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      // Mock refresh failure
      mockUseSession.mockReturnValueOnce({
        ...mockSession,
        error: new Error('Refresh failed'),
      });

      await act(async () => {
        await result.current.refreshSession();
      });

      expect(result.current.refreshError).toBeTruthy();
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('Expired Session Handling', () => {
    it('should handle already expired session', () => {
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // Expired 1 minute ago
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      expect(result.current.isExpired).toBe(true);
      expect(result.current.showWarning).toBe(false);
      expect(result.current.timeRemaining).toBe(0);
    });

    it('should trigger logout when session expires', () => {
      // Start with valid session
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 10 * 1000).toISOString(), // Expires in 10 seconds
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      expect(result.current.isExpired).toBe(false);

      // Fast forward past expiry
      act(() => {
        vi.advanceTimersByTime(11 * 1000);
      });

      expect(result.current.isExpired).toBe(true);
      expect(mockNavigateFn).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  describe('Dismissal and Snooze', () => {
    it('should allow dismissing the warning', () => {
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      expect(result.current.showWarning).toBe(true);

      act(() => {
        result.current.dismissWarning();
      });

      expect(result.current.showWarning).toBe(false);
      expect(result.current.isDismissed).toBe(true);
    });

    it('should show warning again after snooze period', () => {
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      act(() => {
        result.current.dismissWarning();
      });

      expect(result.current.showWarning).toBe(false);

      // Advance time by snooze period (default 1 minute)
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.showWarning).toBe(true);
      expect(result.current.isDismissed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle no session gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      expect(result.current.showWarning).toBe(false);
      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isExpired).toBe(false);
    });

    it('should handle loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: true,
        error: null,
      });

      const { result } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      expect(result.current.showWarning).toBe(false);
      expect(result.current.isLoading).toBe(true);
    });

    it('should clean up timers on unmount', () => {
      const mockSession = {
        data: {
          session: {
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
            user: { id: 'user123', email: 'test@example.com' },
          },
        },
        isPending: false,
        error: null,
      };

      mockUseSession.mockReturnValue(mockSession);

      const { unmount } = renderHook(() => useSessionExpiryWarning(), { wrapper });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});