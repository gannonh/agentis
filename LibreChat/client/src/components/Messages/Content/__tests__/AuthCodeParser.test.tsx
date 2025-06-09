import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthCodeParser } from '../AuthCodeParser';

// Mock the ComposioAuthButton component
jest.mock('~/components/Composio/ComposioAuthButton', () => ({
  ComposioAuthButton: ({ service, onAuthSuccess, onAuthError }: any) => (
    <div data-testid={`composio-auth-${service}`}>
      <button
        onClick={() => onAuthSuccess?.(service, 'mock-account-id')}
        data-testid={`auth-button-${service}`}
      >
        Connect {service}
      </button>
      <button onClick={() => onAuthError?.('Mock error')} data-testid={`error-button-${service}`}>
        Trigger Error
      </button>
    </div>
  ),
}));

describe('AuthCodeParser', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('AUTHCODE Pattern Parsing', () => {
    it('should parse AUTHCODE pattern and render authentication UI', () => {
      const content = 'AUTHCODE:googlesheets:Please authenticate with Google Sheets to continue.';

      render(<AuthCodeParser content={content} />);

      expect(
        screen.getByText('Please authenticate with Google Sheets to continue.'),
      ).toBeInTheDocument();
      expect(screen.getByText('🔐 Authentication Required')).toBeInTheDocument();
      expect(
        screen.getByText(/Connect your Google account to use Google Sheets tools/),
      ).toBeInTheDocument();
      expect(screen.getByTestId('composio-auth-googlesheets')).toBeInTheDocument();
    });

    it('should handle different services in AUTHCODE pattern', () => {
      const services = [
        { service: 'googledrive', expectedName: 'Google Drive' },
        { service: 'googledocs', expectedName: 'Google Docs' },
        { service: 'gmail', expectedName: 'Gmail' },
        { service: 'googlecalendar', expectedName: 'Google Calendar' },
      ];

      services.forEach(({ service, expectedName }) => {
        const content = `AUTHCODE:${service}:Please authenticate with ${expectedName}.`;
        const { unmount } = render(<AuthCodeParser content={content} />);

        expect(screen.getByText(`Please authenticate with ${expectedName}.`)).toBeInTheDocument();
        expect(
          screen.getByText(new RegExp(`Connect your Google account to use ${expectedName} tools`)),
        ).toBeInTheDocument();
        expect(screen.getByTestId(`composio-auth-${service}`)).toBeInTheDocument();

        unmount();
      });
    });

    it('should show success state after authentication', () => {
      const content = 'AUTHCODE:googlesheets:Please authenticate with Google Sheets to continue.';

      const { rerender } = render(<AuthCodeParser content={content} />);

      // Initially should show auth UI
      expect(screen.getByText('🔐 Authentication Required')).toBeInTheDocument();

      // Simulate authentication success
      const authButton = screen.getByTestId('auth-button-googlesheets');
      act(() => {
        authButton.click();
      });

      // Should show success state
      expect(screen.getByText('✅ Google Sheets Connected')).toBeInTheDocument();
      expect(screen.getByText(/You can now retry using Google Sheets tools/)).toBeInTheDocument();
    });
  });

  describe('Auth Message Detection', () => {
    it('should detect Google Sheets authentication messages', () => {
      const content = 'You need to authenticate with Google Sheets to access your spreadsheets.';

      render(<AuthCodeParser content={content} isAuthMessage={true} />);

      expect(screen.getByText(content)).toBeInTheDocument();
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByTestId('composio-auth-googlesheets')).toBeInTheDocument();
    });

    it('should detect different Google services in messages', () => {
      const testCases = [
        {
          content: 'Please connect to Google Drive to access your files.',
          expectedService: 'googledrive',
        },
        {
          content: 'Authentication required for Google Docs integration.',
          expectedService: 'googledocs',
        },
        { content: 'Please authenticate with Gmail to send emails.', expectedService: 'gmail' },
        {
          content: 'Connect to Google Calendar to manage events.',
          expectedService: 'googlecalendar',
        },
      ];

      testCases.forEach(({ content, expectedService }) => {
        const { unmount } = render(<AuthCodeParser content={content} isAuthMessage={true} />);

        expect(screen.getByText(content)).toBeInTheDocument();
        expect(screen.getByTestId(`composio-auth-${expectedService}`)).toBeInTheDocument();

        unmount();
      });
    });

    it('should default to Google Sheets for generic auth messages', () => {
      const content = 'Authentication is required to proceed.';

      render(<AuthCodeParser content={content} isAuthMessage={true} />);

      expect(screen.getByTestId('composio-auth-googlesheets')).toBeInTheDocument();
    });

    it('should not show auth UI for already authenticated services', () => {
      const content = 'AUTHCODE:googlesheets:Please authenticate with Google Sheets.';

      const { rerender } = render(<AuthCodeParser content={content} />);

      // Authenticate the service
      const authButton = screen.getByTestId('auth-button-googlesheets');
      act(() => {
        authButton.click();
      });

      // Rerender with same content - should show success state
      rerender(<AuthCodeParser content={content} />);

      expect(screen.queryByText('🔐 Authentication Required')).not.toBeInTheDocument();
      expect(screen.getByText('✅ Google Sheets Connected')).toBeInTheDocument();
    });
  });

  describe('Regular Content', () => {
    it('should render regular content without auth UI when not marked as auth message', () => {
      const content = 'This is just regular text content.';

      render(<AuthCodeParser content={content} />);

      expect(screen.getByText(content)).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByTestId(/composio-auth/)).not.toBeInTheDocument();
    });

    it('should render content that looks like AUTHCODE but is malformed', () => {
      const content = 'AUTHCODE:invalid-format';

      render(<AuthCodeParser content={content} />);

      expect(screen.getByText(content)).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Callbacks', () => {
    it('should call onAuthSuccess callback when authentication succeeds', () => {
      const onAuthSuccess = jest.fn();
      const content = 'AUTHCODE:googlesheets:Please authenticate.';

      render(<AuthCodeParser content={content} onAuthSuccess={onAuthSuccess} />);

      const authButton = screen.getByTestId('auth-button-googlesheets');
      act(() => {
        authButton.click();
      });

      expect(onAuthSuccess).toHaveBeenCalledWith('googlesheets', 'mock-account-id');
    });

    it('should handle authentication errors', () => {
      const content = 'AUTHCODE:googlesheets:Please authenticate.';

      render(<AuthCodeParser content={content} />);

      const errorButton = screen.getByTestId('error-button-googlesheets');

      act(() => {
        errorButton.click();
      });

      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Authentication failed:', 'Mock error');
    });

    it('should log successful authentication', () => {
      const content = 'AUTHCODE:googlesheets:Please authenticate.';

      render(<AuthCodeParser content={content} />);

      const authButton = screen.getByTestId('auth-button-googlesheets');

      act(() => {
        authButton.click();
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '✅ Authentication successful for googlesheets:',
        'mock-account-id',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('🎉 Google Sheets connected successfully!');
    });
  });

  describe('Service Display Names', () => {
    it('should display correct service names', () => {
      const services = [
        { key: 'googlesheets', name: 'Google Sheets' },
        { key: 'googledrive', name: 'Google Drive' },
        { key: 'googledocs', name: 'Google Docs' },
        { key: 'gmail', name: 'Gmail' },
        { key: 'googlecalendar', name: 'Google Calendar' },
      ];

      services.forEach(({ key, name }) => {
        const content = `AUTHCODE:${key}:Please authenticate.`;
        const { unmount } = render(<AuthCodeParser content={content} />);

        expect(
          screen.getByText(new RegExp(`Connect your Google account to use ${name} tools`)),
        ).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Theme Integration', () => {
    it('should render with appropriate CSS classes for dark/light theme', () => {
      const content = 'AUTHCODE:googlesheets:Please authenticate.';

      render(<AuthCodeParser content={content} />);

      // Check for theme-aware classes - find the container div that has the border/background classes
      // The structure is: space-y-3 div > auth container div (with border/bg classes) > auth content div
      const authContainer = screen.getByText('🔐 Authentication Required').closest('div')
        .parentElement.parentElement;
      expect(authContainer).toHaveClass('border', 'border-gray-200', 'dark:border-gray-600');
      expect(authContainer).toHaveClass('bg-gray-50', 'dark:bg-gray-800');
    });
  });
});
