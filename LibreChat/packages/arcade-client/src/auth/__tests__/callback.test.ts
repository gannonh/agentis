/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for the Arcade authentication callback handler
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { createCallbackHandler } from '../callback';
import type { ArcadeAuthResponse } from '../../types';

describe('Arcade Auth Callback Handler', () => {
  // Mock client
  const mockClient = {
    getAuthStatus: jest.fn(),
  };

  // Mock auth flow
  const mockAuthFlow = {
    checkAuthStatus: jest.fn(),
    getActiveAuthRequest: jest.fn(),
    cancelAuth: jest.fn(),
  };

  // Mock callback handlers
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a callback handler with correct methods', () => {
    const handler = createCallbackHandler({
      client: mockClient as any,
      authFlow: mockAuthFlow as any,
      onSuccess: mockOnSuccess,
      onError: mockOnError,
      onCancel: mockOnCancel,
    });

    expect(handler).toHaveProperty('handleCallback');
    expect(handler).toHaveProperty('handleResultPage');
    expect(handler).toHaveProperty('pollAuthStatus');
  });

  describe('pollAuthStatus', () => {
    it('should check auth status and call success callback when completed', async () => {
      // Setup mocks
      const mockAuthResponse: ArcadeAuthResponse = {
        id: 'auth-123',
        status: 'completed',
        provider_id: 'github',
        user_id: 'user-123',
      };

      mockClient.getAuthStatus.mockResolvedValue(mockAuthResponse);

      // Create handler with shorter timeout for tests
      const handler = createCallbackHandler({
        client: mockClient as any,
        authFlow: mockAuthFlow as any,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
        onCancel: mockOnCancel,
        pollInterval: 10, // Short interval for tests
        maxPollCount: 2, // Limit polling for tests
      });

      await handler.pollAuthStatus('auth-123', 'github');

      // Verify client called
      expect(mockClient.getAuthStatus).toHaveBeenCalledWith('auth-123');

      // Verify auth flow updated
      expect(mockAuthFlow.checkAuthStatus).toHaveBeenCalledWith(mockAuthResponse);

      // Verify success callback called
      expect(mockOnSuccess).toHaveBeenCalledWith({
        authId: 'auth-123',
        toolkitId: 'github',
        provider: 'github',
        response: mockAuthResponse,
      });
    });

    it('should call error callback when auth fails', async () => {
      // Setup mocks
      const mockAuthResponse: ArcadeAuthResponse = {
        id: 'auth-123',
        status: 'failed',
      };

      mockClient.getAuthStatus.mockResolvedValue(mockAuthResponse);

      // Create handler
      const handler = createCallbackHandler({
        client: mockClient as any,
        authFlow: mockAuthFlow as any,
        onSuccess: mockOnSuccess,
        onError: mockOnError,
        onCancel: mockOnCancel,
        pollInterval: 10, // Short interval for tests
      });

      await handler.pollAuthStatus('auth-123', 'github');

      // Verify error callback called
      expect(mockOnError).toHaveBeenCalledWith({
        authId: 'auth-123',
        toolkitId: 'github',
        error: expect.stringContaining('Authentication failed'),
        response: mockAuthResponse,
      });
    });
  });
});
