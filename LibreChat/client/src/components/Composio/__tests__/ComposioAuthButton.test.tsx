import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ComposioAuthButton } from '../ComposioAuthButton';
import { useAuthContext } from '~/hooks';

// Mock the useAuthContext hook
import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';

vi.mock('~/hooks', () => ({
  useAuthContext: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.open
const mockOpen = vi.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockOpen,
});

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
});

describe('ComposioAuthButton', () => {
  const mockUseAuthContext = useAuthContext as MockedFunction<typeof useAuthContext>;
  const mockFetch = fetch as MockedFunction<typeof fetch>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAuthContext.mockReturnValue({
      token: 'mock-token',
      isAuthenticated: true,
    } as any);

    mockOpen.mockReturnValue({
      closed: false,
      close: vi.fn(),
    } as any);

    // Default fetch mock for connection status checks
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hasActiveConnection: false }),
    } as Response);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render button element', () => {
      render(<ComposioAuthButton service="googlesheets" inline={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should show service display name for Google Sheets', () => {
      render(<ComposioAuthButton service="googlesheets" inline={false} />);
      
      expect(screen.getByText('Google Sheets')).toBeInTheDocument();
    });

    it('should show service display name for Google Drive', () => {
      render(<ComposioAuthButton service="googledrive" inline={false} />);
      
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
    });

    it('should show service display name for Google Docs', () => {
      render(<ComposioAuthButton service="googledocs" inline={false} />);
      
      expect(screen.getByText('Google Docs')).toBeInTheDocument();
    });

    it('should show service display name for Gmail', () => {
      render(<ComposioAuthButton service="gmail" inline={false} />);
      
      expect(screen.getByText('Gmail')).toBeInTheDocument();
    });

    it('should show service display name for Google Calendar', () => {
      render(<ComposioAuthButton service="googlecalendar" inline={false} />);
      
      expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    });
  });

  describe('Initial Loading State', () => {
    it('should show checking state initially', () => {
      render(<ComposioAuthButton service="googlesheets" inline={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });
  });

  describe('Connection Status API Call', () => {
    it('should make connection status request on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hasActiveConnection: false }),
      } as Response);

      render(<ComposioAuthButton service="googlesheets" inline={true} />);

      // Allow time for the fetch to be called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/composio/connection-status/googlesheets', {
          credentials: 'include',
        });
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<ComposioAuthButton service="googlesheets" inline={true} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to check connection status:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Authentication Interaction', () => {
    it('should handle click when not authenticated', () => {
      mockUseAuthContext.mockReturnValue({
        token: null,
        isAuthenticated: false,
      } as any);

      const onAuthError = vi.fn();
      render(<ComposioAuthButton service="googlesheets" inline={true} onAuthError={onAuthError} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onAuthError).toHaveBeenCalledWith('Not authenticated');
    });

    it('should initiate OAuth when authenticated and clicked', async () => {
      // Mock the initial connection status check
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ hasActiveConnection: false }),
        } as Response)
        // Mock the OAuth initiation call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ redirectUrl: 'https://oauth.example.com' }),
        } as Response);

      render(<ComposioAuthButton service="googlesheets" inline={true} />);

      // Wait for initial status check to complete
      await waitFor(() => {
        expect(screen.getByText(/Connect Google Sheets/)).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Check that OAuth endpoint was called
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/composio/auth/googlesheets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      });

      // Check that window.open was called
      expect(mockOpen).toHaveBeenCalledWith(
        'https://oauth.example.com',
        'composio-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );
    });

    it('should handle OAuth initiation failure', async () => {
      // Mock the initial connection status check
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ hasActiveConnection: false }),
        } as Response)
        // Mock failed OAuth initiation
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
        } as Response);

      const onAuthError = vi.fn();
      render(<ComposioAuthButton service="googlesheets" inline={true} onAuthError={onAuthError} />);

      // Wait for initial status check
      await waitFor(() => {
        expect(screen.getByText(/Connect Google Sheets/)).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onAuthError).toHaveBeenCalledWith('Failed to initiate OAuth: Unauthorized');
      });
    });
  });

  describe('Connected State', () => {
    it('should show connected state when connection exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hasActiveConnection: true }),
      } as Response);

      render(<ComposioAuthButton service="googlesheets" inline={true} />);

      await waitFor(() => {
        expect(screen.getByText('✓ Connected')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Message Event Handling', () => {
    it('should set up message event listener during OAuth flow', async () => {
      // Mock successful OAuth initiation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ hasActiveConnection: false }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ redirectUrl: 'https://oauth.example.com' }),
        } as Response);

      render(<ComposioAuthButton service="googlesheets" inline={true} />);

      // Wait for initial status check
      await waitFor(() => {
        expect(screen.getByText(/Connect Google Sheets/)).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Verify OAuth flow started and message listener was added
      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      });
    });

    it('should handle OAuth error messages', async () => {
      // Setup OAuth flow
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ hasActiveConnection: false }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ redirectUrl: 'https://oauth.example.com' }),
        } as Response);

      const onAuthError = vi.fn();
      render(<ComposioAuthButton service="googlesheets" inline={true} onAuthError={onAuthError} />);

      // Wait and click
      await waitFor(() => {
        expect(screen.getByText(/Connect Google Sheets/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button'));

      // Get the message handler that was registered
      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      });

      const messageHandler = mockAddEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1];

      // Simulate error message
      if (messageHandler) {
        messageHandler({
          origin: window.location.origin,
          data: {
            type: 'COMPOSIO_AUTH_ERROR',
            error: 'User denied permission',
          },
        });

        await waitFor(() => {
          expect(onAuthError).toHaveBeenCalledWith('User denied permission');
        });
      }
    });
  });
});