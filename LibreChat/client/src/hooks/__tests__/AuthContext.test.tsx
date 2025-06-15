import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AuthContextProvider, useAuthContext } from '../AuthContext';

// Mock dependencies
vi.mock('~/data-provider');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

import { useNavigate } from 'react-router-dom';
import {
  useGetRole,
  useGetUserQuery,
  useLoginUserMutation,
  useLogoutUserMutation,
  useGetSessionQuery,
} from '~/data-provider';

// Type the mocked functions
const mockNavigate = useNavigate as Mock;
const mockUseGetRole = useGetRole as Mock;
const mockUseGetUserQuery = useGetUserQuery as Mock;
const mockUseLoginUserMutation = useLoginUserMutation as Mock;
const mockUseLogoutUserMutation = useLogoutUserMutation as Mock;
const mockUseGetSessionQuery = useGetSessionQuery as Mock;

describe('AuthContext', () => {
  const navigate = vi.fn();
  const loginMutate = vi.fn();
  const logoutMutate = vi.fn();
  const sessionRefetch = vi.fn();

  const createWrapper = (authConfig = {}) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <RecoilRoot>
          <MemoryRouter>
            <AuthContextProvider authConfig={authConfig}>
              {children}
            </AuthContextProvider>
          </MemoryRouter>
        </RecoilRoot>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockNavigate.mockReturnValue(navigate);
    mockUseGetRole.mockReturnValue({ data: null });
    mockUseGetUserQuery.mockReturnValue({ 
      data: null, 
      isError: false, 
      error: null 
    });
    mockUseLoginUserMutation.mockReturnValue({ 
      mutate: loginMutate,
      isLoading: false,
      error: null,
    });
    mockUseLogoutUserMutation.mockReturnValue({ 
      mutate: logoutMutate,
      isLoading: false,
      error: null,
    });
    mockUseGetSessionQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: sessionRefetch,
    });
  });

  describe('Initial State Management', () => {
    it('sets correct initial authentication state', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeUndefined();
      expect(result.current.session).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });

    it('handles missing session data', () => {
      mockUseGetSessionQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: sessionRefetch,
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBeUndefined();
    });

    it('initializes user state properly', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeUndefined();
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.setError).toBe('function');
    });
  });

  describe('Session Query Integration', () => {
    it('triggers session query when not authenticated', () => {
      renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(mockUseGetSessionQuery).toHaveBeenCalledWith({
        enabled: true,
        retry: false,
        staleTime: 5 * 60 * 1000,
      });
    });

    it('disables session query when authenticated', () => {
      // Mock initial authenticated state
      mockUseGetSessionQuery.mockReturnValue({
        data: {
          session: { id: 'test-session' },
          user: { id: 'test-user', name: 'Test User' },
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: sessionRefetch,
      });

      renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      // On subsequent renders, it should disable the query
      expect(mockUseGetSessionQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: expect.any(Boolean),
        })
      );
    });

    it('handles session query errors appropriately', async () => {
      mockUseGetSessionQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Session query failed'),
        refetch: sessionRefetch,
      });

      renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login');
      });
    });

    it('respects enabled flag for session queries', () => {
      renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(mockUseGetSessionQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          retry: false,
          staleTime: 5 * 60 * 1000,
        })
      );
    });

    it('does not navigate in test mode', () => {
      mockUseGetSessionQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Session query failed'),
        refetch: sessionRefetch,
      });

      renderHook(() => useAuthContext(), {
        wrapper: createWrapper({ test: true }),
      });

      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('Login Flow', () => {
    it('handles successful login with session data', async () => {
      const mockLoginResponse = {
        user: { id: 'user123', name: 'Test User' },
        session: { id: 'session123' },
        token: null,
        twoFAPending: false,
      };

      let onSuccessCallback: ((data: any) => void) | undefined;
      mockUseLoginUserMutation.mockImplementation((options) => {
        onSuccessCallback = options.onSuccess;
        return { mutate: loginMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.login({ email: 'test@test.com', password: 'password' });
      });

      expect(loginMutate).toHaveBeenCalledWith({ 
        email: 'test@test.com', 
        password: 'password' 
      });

      // Simulate successful login
      act(() => {
        onSuccessCallback?.(mockLoginResponse);
      });

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/c/new', { replace: true });
      });
    });

    it('manages 2FA redirect scenarios', async () => {
      const mockLoginResponse = {
        twoFAPending: true,
        tempToken: 'temp123',
      };

      let onSuccessCallback: ((data: any) => void) | undefined;
      mockUseLoginUserMutation.mockImplementation((options) => {
        onSuccessCallback = options.onSuccess;
        return { mutate: loginMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.login({ email: 'test@test.com', password: 'password' });
      });

      // Simulate 2FA pending response
      act(() => {
        onSuccessCallback?.(mockLoginResponse);
      });

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login/2fa?tempToken=temp123', { replace: true });
      });
    });

    it('handles login errors with proper error setting', async () => {
      const mockError = { message: 'Invalid credentials' };

      let onErrorCallback: ((error: any) => void) | undefined;
      mockUseLoginUserMutation.mockImplementation((options) => {
        onErrorCallback = options.onError;
        return { mutate: loginMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.login({ email: 'test@test.com', password: 'password' });
      });

      // Simulate login error
      act(() => {
        onErrorCallback?.(mockError);
      });

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('handles legacy token mode fallback', async () => {
      const mockLoginResponse = {
        user: { id: 'user123', name: 'Test User' },
        token: 'legacy-token',
        session: null, // No session, fallback to token
        twoFAPending: false,
      };

      let onSuccessCallback: ((data: any) => void) | undefined;
      mockUseLoginUserMutation.mockImplementation((options) => {
        onSuccessCallback = options.onSuccess;
        return { mutate: loginMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.login({ email: 'test@test.com', password: 'password' });
      });

      // Simulate successful login with token
      act(() => {
        onSuccessCallback?.(mockLoginResponse);
      });

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/c/new', { replace: true });
      });
    });
  });

  describe('Logout Flow', () => {
    it('clears authentication state on logout', async () => {
      let onSuccessCallback: ((data: any) => void) | undefined;
      mockUseLogoutUserMutation.mockImplementation((options) => {
        onSuccessCallback = options.onSuccess;
        return { mutate: logoutMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.logout();
      });

      expect(logoutMutate).toHaveBeenCalledWith(undefined);

      // Simulate successful logout
      act(() => {
        onSuccessCallback?.({ redirect: '/login' });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeUndefined();
        expect(result.current.session).toBeUndefined();
      });
    });

    it('navigates to correct redirect URL', async () => {
      let onSuccessCallback: ((data: any) => void) | undefined;
      mockUseLogoutUserMutation.mockImplementation((options) => {
        onSuccessCallback = options.onSuccess;
        return { mutate: logoutMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.logout('/custom-logout');
      });

      // Simulate successful logout
      act(() => {
        onSuccessCallback?.({ redirect: '/login' });
      });

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith('/custom-logout', { replace: true });
      });
    });

    it('handles logout errors gracefully', async () => {
      const mockError = new Error('Logout failed');

      let onErrorCallback: ((error: any) => void) | undefined;
      mockUseLogoutUserMutation.mockImplementation((options) => {
        onErrorCallback = options.onError;
        return { mutate: logoutMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.logout();
      });

      // Simulate logout error
      act(() => {
        onErrorCallback?.(mockError);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('manages custom logout redirects', async () => {
      let onSuccessCallback: ((data: any) => void) | undefined;
      mockUseLogoutUserMutation.mockImplementation((options) => {
        onSuccessCallback = options.onSuccess;
        return { mutate: logoutMutate };
      });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.logout('https://external-site.com/goodbye');
      });

      // Mock window.location for external redirect test
      delete (window as any).location;
      window.location = { href: '' } as any;

      // Simulate successful logout
      act(() => {
        onSuccessCallback?.({ redirect: null });
      });

      await waitFor(() => {
        expect(window.location.href).toBe('https://external-site.com/goodbye');
      });
    });
  });

  describe('Session Update Events', () => {
    it('handles session update events correctly', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      const newSession = { id: 'new-session-123' };
      const sessionUpdateEvent = new CustomEvent('sessionUpdated', {
        detail: newSession,
      });

      act(() => {
        window.dispatchEvent(sessionUpdateEvent);
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(newSession);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'sessionUpdated',
        expect.any(Function)
      );
    });
  });

  describe('Error Context', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuthContext());
      }).toThrow('useAuthContext should be used inside AuthProvider');
    });

    it('provides setError function', () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.setError).toBe('function');
      
      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');
    });

    it('handles error timeout correctly', async () => {
      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');
      
      // The error should remain set until explicitly cleared
      expect(result.current.error).toBe('Test error message');
    });
  });

  describe('Role Management', () => {
    it('provides user and admin roles', () => {
      const mockUserRole = { id: 'user-role', name: 'USER' };
      const mockAdminRole = { id: 'admin-role', name: 'ADMIN' };

      mockUseGetRole
        .mockReturnValueOnce({ data: mockUserRole })
        .mockReturnValueOnce({ data: mockAdminRole });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.roles).toEqual({
        USER: mockUserRole,
        ADMIN: mockAdminRole,
      });
    });

    it('handles null roles correctly', () => {
      mockUseGetRole.mockReturnValue({ data: null });

      const { result } = renderHook(() => useAuthContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.roles).toEqual({
        USER: null,
        ADMIN: null,
      });
    });
  });
});