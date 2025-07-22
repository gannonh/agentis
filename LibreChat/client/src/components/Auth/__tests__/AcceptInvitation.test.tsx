import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AcceptInvitation from '../AcceptInvitation';

// Mock dependencies
const mockNavigate = vi.fn();
const mockUseLocalize = vi.fn(() => (key: string) => key);
const mockAcceptInvitation = vi.fn();
const mockRejectInvitation = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(),
  };
});

vi.mock('~/hooks', () => ({
  useAuthContext: vi.fn(),
  useLocalize: () => mockUseLocalize(),
}));

vi.mock('~/config/betterAuth', () => ({
  authClient: {
    organization: {
      acceptInvitation: mockAcceptInvitation,
      rejectInvitation: mockRejectInvitation,
    },
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockInvitationDetails = {
  id: '507f1f77bcf86cd799439011',
  organizationName: 'Test Organization',
  inviterName: 'John Doe',
  role: 'member',
  status: 'pending',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
};

const mockUser = {
  id: '507f1f77bcf86cd799439012',
  email: 'test@example.com',
  name: 'Test User',
};

describe('AcceptInvitation', () => {
  let useParams: Mock;
  let useAuthContext: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockNavigate.mockClear();
    mockAcceptInvitation.mockClear();
    mockRejectInvitation.mockClear();

    // Get mocked functions
    const routerModule = await import('react-router-dom');
    const hooksModule = await import('~/hooks');
    useParams = vi.mocked(routerModule.useParams);
    useAuthContext = vi.mocked(hooksModule.useAuthContext);

    // Default mocks
    useParams.mockReturnValue({ invitationId: '507f1f77bcf86cd799439011' });
    useAuthContext.mockReturnValue({ user: null, token: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper function to render component with router
  const renderWithRouter = (
    initialEntries = ['/auth/accept-invitation/507f1f77bcf86cd799439011'],
  ) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <AcceptInvitation />
      </MemoryRouter>,
    );
  };

  describe('Loading State', () => {
    it('shows loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      expect(screen.getByText('Loading invitation...')).toBeInTheDocument();
    });

    it('fetches invitation details on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockInvitationDetails }),
      });

      renderWithRouter();

      expect(mockFetch).toHaveBeenCalledWith('/api/invitations/public/507f1f77bcf86cd799439011', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Invalid Invitation ID Handling', () => {
    it('shows error when no invitation ID provided', () => {
      useParams.mockReturnValue({ invitationId: undefined });

      renderWithRouter();

      expect(screen.getByText('Invitation Error')).toBeInTheDocument();
      expect(screen.getByText('Invalid invitation link')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
    });

    it('navigates to login when Back to Login is clicked', async () => {
      useParams.mockReturnValue({ invitationId: undefined });

      renderWithRouter();

      const backButton = screen.getByRole('button', { name: 'Back to Login' });
      await userEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('API Error Handling', () => {
    it('shows error for 404 response (invitation not found)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Invitation Error')).toBeInTheDocument();
        expect(screen.getByText('Invitation not found or has expired')).toBeInTheDocument();
      });
    });

    it('shows error for 409 response (already accepted)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Invitation Error')).toBeInTheDocument();
        expect(screen.getByText('Invitation has already been accepted')).toBeInTheDocument();
      });
    });

    it('shows error for 410 response (expired)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Invitation Error')).toBeInTheDocument();
        expect(screen.getByText('Invitation has expired')).toBeInTheDocument();
      });
    });

    it('shows generic error for other HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Invitation Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to load invitation')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Invitation Error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Unauthenticated User Flow', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockInvitationDetails }),
      });
    });

    it('shows invitation details for unauthenticated user', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("You've been invited!")).toBeInTheDocument();
        expect(screen.getByText(mockInvitationDetails.organizationName)).toBeInTheDocument();
        expect(screen.getByText(mockInvitationDetails.inviterName)).toBeInTheDocument();
        expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      });
    });

    it('does not show expiration date for unauthenticated users', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      });

      // Expiration date should not be visible for unauthenticated users
      expect(screen.queryByText(/This invitation expires on/)).not.toBeInTheDocument();
    });

    it('navigates to login with return URL when sign-in is clicked', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      });

      const signInButton = screen.getByTestId('sign-in-button');
      await userEvent.click(signInButton);

      expect(mockNavigate).toHaveBeenCalledWith('/login?returnUrl=%2F');
    });
  });

  describe('Authenticated User Auto-acceptance', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockInvitationDetails }),
      });
      useAuthContext.mockReturnValue({ user: mockUser, token: 'mock-token' });
    });

    it('calls acceptInvitation for authenticated user', async () => {
      mockAcceptInvitation.mockResolvedValueOnce(undefined);

      renderWithRouter();

      await waitFor(() => {
        expect(mockAcceptInvitation).toHaveBeenCalledWith({
          invitationId: '507f1f77bcf86cd799439011',
        });
      });
    });

    it('shows success state after auto-acceptance', async () => {
      mockAcceptInvitation.mockResolvedValueOnce(undefined);

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Successfully joined the organization!')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing invitation data in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null }),
      });

      renderWithRouter();

      await waitFor(() => {
        // Component should not crash
        expect(screen.queryByText("You've been invited!")).not.toBeInTheDocument();
      });
    });

    it('does not auto-accept if user is not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockInvitationDetails }),
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      });

      expect(mockAcceptInvitation).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockInvitationDetails }),
      });
    });

    it('has proper button accessibility attributes', async () => {
      renderWithRouter();

      await waitFor(() => {
        const signInButton = screen.getByTestId('sign-in-button');
        expect(signInButton).toBeEnabled();
      });
    });

    it('shows proper loading states with accessible text', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter();

      expect(screen.getByText('Loading invitation...')).toBeInTheDocument();
    });
  });
});
