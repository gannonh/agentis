import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, test, vi, beforeEach, afterEach } from 'vitest';
import MagicLinkLogin from '../MagicLinkLogin';
import { authClient } from '~/config/betterAuth';
import { useLocalize } from '~/hooks';

const mockNavigate = vi.fn();

// Mock dependencies - define mocks inline to avoid hoisting issues
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    signIn: {
      magicLink: vi.fn(),
    },
    getSession: vi.fn(),
  },
}));

vi.mock('~/hooks', () => ({
  useLocalize: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()],
  };
});

describe('MagicLinkLogin', () => {
  const mockLocalize = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks with proper structure
    vi.mocked(useLocalize).mockReturnValue(mockLocalize);

    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(authClient.signIn.magicLink).mockResolvedValue({ error: null } as any);
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null } as any);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <MagicLinkLogin />
      </BrowserRouter>,
    );
  };

  it('renders email input form', () => {
    renderComponent();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.getByText('Sign In With Email')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('Email address');
    const submitButton = screen.getByTestId('login-button');

    // Test invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('sends magic link on valid email submission', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('Email address');
    const submitButton = screen.getByTestId('login-button');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(authClient.signIn.magicLink).toHaveBeenCalledWith({
        email: 'test@example.com',
        callbackURL: expect.stringContaining('/login'),
      });
    });
  });

  it('shows confirmation message after sending magic link', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('Email address');
    const submitButton = screen.getByTestId('login-button');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText(/We sent a magic link to/)).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('handles magic link send error', async () => {
    vi.mocked(authClient.signIn.magicLink).mockResolvedValue({
      error: { message: 'Network error' },
    } as any);

    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('Email address');
    const submitButton = screen.getByTestId('login-button');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('allows resending magic link', async () => {
    const user = userEvent.setup();
    renderComponent();

    // First send
    const emailInput = screen.getByLabelText('Email address');
    const submitButton = screen.getByTestId('login-button');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Resend link')).toBeInTheDocument();
    });

    // Resend
    const resendButton = screen.getByText('Resend link');
    await user.click(resendButton);

    await waitFor(() => {
      expect(authClient.signIn.magicLink).toHaveBeenCalledTimes(2);
    });
  });

  it('redirects to main app if user is already authenticated', async () => {
    // Mock fetch for fresh user data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: '123',
        email: 'user@example.com',
        onboardingStep: 'complete', // User has completed onboarding
      }),
    });

    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '123', email: 'user@example.com' } },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderComponent();

    // Wait for the async fetch and navigation
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/c/new');
    });
  });
});
