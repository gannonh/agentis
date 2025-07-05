import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import SocialButton from '../SocialButton';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location.href
delete (window as any).location;
window.location = { href: '' } as any;

describe('SocialButton', () => {
  const defaultProps = {
    id: 'google-login',
    enabled: true,
    serverDomain: 'http://localhost:3080',
    oauthPath: 'google',
    Icon: () => <svg data-testid="google-icon">Google Icon</svg>,
    label: 'Continue with Google',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering Behavior', () => {
    it('renders button when enabled is true', () => {
      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button', { name: /continue with google/i });
      expect(button).toBeInTheDocument();
    });

    it('returns null when enabled is false', () => {
      const { container } = render(<SocialButton {...defaultProps} enabled={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('displays correct icon and label', () => {
      render(<SocialButton {...defaultProps} />);

      expect(screen.getByTestId('google-icon')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Continue with Google');
      expect(button).toHaveAttribute('data-testid', 'google-login');
    });

    it('applies correct CSS classes', () => {
      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'flex',
        'w-full',
        'items-center',
        'justify-center',
        'space-x-3',
        'rounded-lg',
        'border',
        'border-gray-300',
        'bg-white',
        'px-4',
        'py-3',
        'text-gray-700',
        'transition-colors',
        'duration-200',
        'hover:bg-gray-50',
        'dark:border-gray-600',
        'dark:bg-gray-700',
        'dark:text-gray-300',
        'dark:hover:bg-gray-600',
      );
    });
  });

  describe('Social Login Flow', () => {
    it('makes POST request to correct endpoint on click', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({
          redirect: true,
          url: 'https://oauth.provider.com/auth',
        }),
      });

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3080/api/auth/sign-in/social',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('"provider":"google"'),
          credentials: 'include',
        }),
      );
    });

    it('sends correct provider in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({}),
      });

      const githubProps = {
        ...defaultProps,
        oauthPath: 'github',
        label: 'Continue with GitHub',
      };

      render(<SocialButton {...githubProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"provider":"github"'),
        }),
      );
    });

    it('includes proper headers and credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({}),
      });

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }),
      );
    });

    it('handles successful response with redirect URL', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          redirect: true,
          url: 'https://oauth.google.com/auth?client_id=123',
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(window.location.href).toBe('https://oauth.google.com/auth?client_id=123');
      });
    });

    it('does not redirect when redirect is false', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          redirect: false,
          url: 'https://oauth.google.com/auth?client_id=123',
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(window.location.href).toBe('');
    });

    it('does not redirect when url is missing', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          redirect: true,
          // url is missing
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(window.location.href).toBe('');
    });
  });

  describe('Error Handling', () => {
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    beforeEach(() => {
      console.error = vi.fn();
    });
    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('logs error when fetch fails', async () => {
      const fetchError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(fetchError);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Social login error:', fetchError);
      });
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      // Should not crash the component
      expect(button).toBeInTheDocument();
      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
      });
    });

    it('handles invalid JSON responses', async () => {
      const mockResponse = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Social login error:', expect.any(Error));
      });
    });

    it('does not crash on malformed response', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue(null),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      // Component should still be rendered and functional
      expect(button).toBeInTheDocument();
    });
  });

  describe('Navigation Behavior', () => {
    it('redirects to returned URL when redirect: true and url provided', async () => {
      const redirectUrl = 'https://oauth.provider.com/authorize?state=abc123';
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          redirect: true,
          url: redirectUrl,
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(window.location.href).toBe(redirectUrl);
      });
    });

    it('calls window.location.href for external redirects', async () => {
      const externalUrl = 'https://external-oauth-provider.com/auth';
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          redirect: true,
          url: externalUrl,
        }),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      await waitFor(() => {
        expect(window.location.href).toBe(externalUrl);
      });
    });

    it('prevents default form submission', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({}),
      });

      render(<SocialButton {...defaultProps} />);

      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

      fireEvent(button, clickEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Provider Variations', () => {
    const providers = [
      { oauthPath: 'google', label: 'Continue with Google' },
      { oauthPath: 'github', label: 'Continue with GitHub' },
      { oauthPath: 'discord', label: 'Continue with Discord' },
      { oauthPath: 'facebook', label: 'Continue with Facebook' },
    ];

    providers.forEach(({ oauthPath, label }) => {
      it(`works correctly with ${oauthPath} provider`, async () => {
        mockFetch.mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({
            redirect: true,
            url: `https://oauth.${oauthPath}.com/auth`,
          }),
        });

        const props = {
          ...defaultProps,
          oauthPath,
          label,
          Icon: () => <svg data-testid={`${oauthPath}-icon`}>{oauthPath} Icon</svg>,
        };

        render(<SocialButton {...props} />);

        const button = screen.getByRole('button', { name: label });
        await userEvent.click(button);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining(`"provider":"${oauthPath}"`),
          }),
        );
      });
    });
  });

  describe('Server Domain Configuration', () => {
    it('uses custom server domain when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({}),
      });

      const customProps = {
        ...defaultProps,
        serverDomain: 'https://api.example.com',
      };

      render(<SocialButton {...customProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/api/auth/sign-in/social',
        expect.any(Object),
      );
    });

    it('handles server domain with trailing slash', async () => {
      mockFetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({}),
      });

      const customProps = {
        ...defaultProps,
        serverDomain: 'https://api.example.com/',
      };

      render(<SocialButton {...customProps} />);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com//api/auth/sign-in/social',
        expect.any(Object),
      );
    });
  });
});
