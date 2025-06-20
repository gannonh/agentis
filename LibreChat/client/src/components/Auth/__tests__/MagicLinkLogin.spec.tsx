import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MagicLinkLogin from '../MagicLinkLogin';
import { authClient } from '~/config/betterAuth';
import { useLocalize } from '~/hooks';

// Mock dependencies
jest.mock('~/config/betterAuth');
jest.mock('~/hooks');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams()],
}));

const mockedAuthClient = authClient as jest.Mocked<typeof authClient>;
const mockedUseLocalize = useLocalize as jest.MockedFunction<typeof useLocalize>;

describe('MagicLinkLogin', () => {
  const mockLocalize = jest.fn((key: string) => key);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseLocalize.mockReturnValue(mockLocalize);
    mockedAuthClient.useSession.mockReturnValue({ data: null } as any);
    mockedAuthClient.signIn = {
      magicLink: jest.fn().mockResolvedValue({ error: null }),
    } as any;
    mockedAuthClient.getSession = jest.fn().mockResolvedValue({ data: null });
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
    expect(screen.getByLabelText('com_auth_email')).toBeInTheDocument();
    expect(screen.getByTestId('login-button')).toBeInTheDocument();
    expect(screen.getByText('com_auth_continue_with_email')).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('com_auth_email');
    const submitButton = screen.getByTestId('login-button');

    // Test invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('com_auth_email_pattern')).toBeInTheDocument();
    });
  });

  it('sends magic link on valid email submission', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('com_auth_email');
    const submitButton = screen.getByTestId('login-button');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockedAuthClient.signIn.magicLink).toHaveBeenCalledWith({
        email: 'test@example.com',
        callbackURL: expect.stringContaining('/login'),
      });
    });
  });

  it('shows confirmation message after sending magic link', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('com_auth_email');
    const submitButton = screen.getByTestId('login-button');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('com_auth_check_your_email')).toBeInTheDocument();
      expect(screen.getByText('com_auth_magic_link_sent')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('handles magic link send error', async () => {
    mockedAuthClient.signIn.magicLink = jest.fn().mockResolvedValue({
      error: { message: 'Network error' },
    });

    const user = userEvent.setup();
    renderComponent();

    const emailInput = screen.getByLabelText('com_auth_email');
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
    const emailInput = screen.getByLabelText('com_auth_email');
    const submitButton = screen.getByTestId('login-button');

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('com_auth_resend_link')).toBeInTheDocument();
    });

    // Resend
    const resendButton = screen.getByText('com_auth_resend_link');
    await user.click(resendButton);

    await waitFor(() => {
      expect(mockedAuthClient.signIn.magicLink).toHaveBeenCalledTimes(2);
    });
  });

  it('redirects to main app if user is already authenticated', () => {
    mockedAuthClient.useSession.mockReturnValue({
      data: { user: { id: '123', email: 'user@example.com' } },
    } as any);

    renderComponent();

    expect(mockNavigate).toHaveBeenCalledWith('/c/new');
  });
});
