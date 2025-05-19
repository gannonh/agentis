/**
 * Tests for the Arcade authentication flow
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { createAuthFlow, AuthFlowStatus } from '../AuthFlow';

describe('Arcade Auth Flow', () => {
  // Mock window.open
  const mockWindowOpen = jest.fn() as jest.MockedFunction<typeof window.open>;
  global.open = mockWindowOpen;

  // Mock storage
  const mockStorage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: jest.fn((key: string) => mockStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
    }),
  };
  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

  // Mock auth callbacks
  const mockOnAuth = jest.fn();
  const mockOnError = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    // Clear all mocks and storage before each test
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it('should create an auth flow with proper methods', () => {
    const authFlow = createAuthFlow({
      onAuthStart: mockOnAuth,
      onAuthError: mockOnError,
      onAuthComplete: mockOnComplete,
      pollingInterval: 1000,
    });

    expect(authFlow).toHaveProperty('startAuth');
    expect(authFlow).toHaveProperty('checkAuthStatus');
    expect(authFlow).toHaveProperty('cancelAuth');
    expect(authFlow).toHaveProperty('getAuthStatus');
    expect(authFlow).toHaveProperty('getActiveAuthRequest');
  });

  describe('startAuth', () => {
    it('should initiate authentication and store auth request info', () => {
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      const mockAuthResponse = {
        id: 'auth-123',
        status: 'pending' as const,
        url: 'https://example.com/auth',
      };

      authFlow.startAuth('github', mockAuthResponse);

      // Verify auth info is stored
      expect(authFlow.getActiveAuthRequest()).toEqual({
        id: 'auth-123',
        toolkitId: 'github',
        status: AuthFlowStatus.PENDING,
        startedAt: expect.any(Date),
      });

      // Verify callbacks are called
      expect(mockOnAuth).toHaveBeenCalledWith('github', mockAuthResponse);

      // Verify window.open is called with the correct URL
      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/auth', '_blank');

      // Verify local storage is updated
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'arcade_auth_request',
        expect.any(String)
      );
    });

    it('should not open window if no auth URL is provided', () => {
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      const mockAuthResponse = {
        id: 'auth-123',
        status: 'pending' as const,
      };

      authFlow.startAuth('github', mockAuthResponse);

      // Verify window.open is not called
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
  });

  describe('checkAuthStatus', () => {
    it('should update status for completed authentication', () => {
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      // Start auth
      const mockAuthResponse = {
        id: 'auth-123',
        status: 'pending' as const,
        url: 'https://example.com/auth',
      };
      authFlow.startAuth('github', mockAuthResponse);

      // Mock completed status
      const mockCompletedResponse = {
        id: 'auth-123',
        status: 'completed' as const,
        provider_id: 'github',
        user_id: 'user-123',
      };

      // Check status
      authFlow.checkAuthStatus(mockCompletedResponse);

      // Verify status is updated
      expect(authFlow.getAuthStatus('github')).toBe(AuthFlowStatus.COMPLETED);

      // Verify callback is called
      expect(mockOnComplete).toHaveBeenCalledWith('github', mockCompletedResponse);

      // Verify auth request is cleared
      expect(authFlow.getActiveAuthRequest()).toBeNull();
    });

    it('should update status for failed authentication', () => {
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      // Start auth
      const mockAuthResponse = {
        id: 'auth-123',
        status: 'pending' as const,
        url: 'https://example.com/auth',
      };
      authFlow.startAuth('github', mockAuthResponse);

      // Mock failed status
      const mockFailedResponse = {
        id: 'auth-123',
        status: 'failed' as const,
      };

      // Check status
      authFlow.checkAuthStatus(mockFailedResponse);

      // Verify status is updated
      expect(authFlow.getAuthStatus('github')).toBe(AuthFlowStatus.FAILED);

      // Verify callback is called
      expect(mockOnError).toHaveBeenCalledWith('github', mockFailedResponse);

      // Verify auth request is cleared
      expect(authFlow.getActiveAuthRequest()).toBeNull();
    });

    it('should ignore status updates for different auth IDs', () => {
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      // Start auth
      const mockAuthResponse = {
        id: 'auth-123',
        status: 'pending' as const,
        url: 'https://example.com/auth',
      };
      authFlow.startAuth('github', mockAuthResponse);

      // Mock completed status with different ID
      const mockCompletedResponse = {
        id: 'auth-456',
        status: 'completed' as const,
      };

      // Check status
      authFlow.checkAuthStatus(mockCompletedResponse);

      // Verify status is not updated
      expect(authFlow.getActiveAuthRequest()?.id).toBe('auth-123');
      expect(authFlow.getActiveAuthRequest()?.status).toBe(AuthFlowStatus.PENDING);

      // Verify callbacks are not called
      expect(mockOnComplete).not.toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });
  });

  describe('cancelAuth', () => {
    it('should cancel active authentication request', () => {
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      // Start auth
      const mockAuthResponse = {
        id: 'auth-123',
        status: 'pending' as const,
        url: 'https://example.com/auth',
      };
      authFlow.startAuth('github', mockAuthResponse);

      // Cancel auth
      authFlow.cancelAuth();

      // Verify auth request is cleared
      expect(authFlow.getActiveAuthRequest()).toBeNull();

      // Verify local storage is cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('arcade_auth_request');
    });
  });

  describe('persistence', () => {
    it('should restore auth request from local storage', () => {
      // Store auth request in local storage
      const authRequest = {
        id: 'auth-123',
        toolkitId: 'github',
        status: AuthFlowStatus.PENDING,
        startedAt: new Date().toISOString(),
      };
      mockLocalStorage.setItem('arcade_auth_request', JSON.stringify(authRequest));

      // Create new auth flow
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      // Verify auth request is restored
      expect(authFlow.getActiveAuthRequest()).toEqual({
        ...authRequest,
        startedAt: expect.any(Date),
      });
    });

    it('should handle invalid stored auth request', () => {
      // Store invalid auth request in local storage
      mockLocalStorage.setItem('arcade_auth_request', 'invalid-json');

      // Create new auth flow
      const authFlow = createAuthFlow({
        onAuthStart: mockOnAuth,
        onAuthError: mockOnError,
        onAuthComplete: mockOnComplete,
      });

      // Verify no auth request is restored
      expect(authFlow.getActiveAuthRequest()).toBeNull();

      // Verify local storage is cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('arcade_auth_request');
    });
  });
});
