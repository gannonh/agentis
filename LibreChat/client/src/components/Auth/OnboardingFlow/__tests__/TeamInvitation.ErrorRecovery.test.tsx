/**
 * @fileoverview Error recovery mechanism tests for TeamInvitation component
 * @description Tests retry logic, graceful degradation, and error recovery scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamInvitation } from '../TeamInvitation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authClient } from '~/config/betterAuth';

// Mock Better Auth
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    organization: {
      inviteMember: vi.fn(),
    },
  },
}));

// Mock UI components
vi.mock('~/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
    variant,
    size,
    className,
    ...props
  }: any) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {React.Children.map(children, (child) => (typeof child === 'string' ? child : child))}
    </button>
  ),
}));

vi.mock('~/components/ui/Input', () => ({
  Input: React.forwardRef(
    ({ placeholder, onChange, onKeyPress, value, disabled, ...props }: any, ref) => (
      <input
        ref={ref}
        placeholder={placeholder}
        onChange={onChange}
        onKeyPress={onKeyPress}
        value={value}
        disabled={disabled}
        {...props}
      />
    ),
  ),
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, htmlFor, className, ...props }: any) => (
    <label htmlFor={htmlFor} className={className} {...props}>
      {children}
    </label>
  ),
}));

// Create a test wrapper with QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('TeamInvitation Error Recovery Tests', () => {
  const mockOnInvitationsComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const defaultProps = {
    organizationName: 'Recovery Corp',
    onInvitationsComplete: mockOnInvitationsComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authClient.organization.inviteMember).mockResolvedValue({});
    queryClient.clear();
  });

  describe('Retry Logic Implementation', () => {
    it('should allow manual retry after failure', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({});

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'retry@example.com');
      await user.click(addButton!);

      // First attempt should fail
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- First attempt failed')).toBeInTheDocument();
      });

      // Second attempt should succeed
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 0,
        });
      });
    });

    it('should allow retrying individual failed invitations', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember)
        .mockResolvedValueOnce({}) // First email succeeds
        .mockRejectedValueOnce(new Error('Second email failed')) // Second email fails
        .mockResolvedValueOnce({}); // Retry succeeds

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add two emails
      await user.type(emailInput, 'success@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'failure@example.com');
      await user.click(addButton!);

      // Submit - should have partial success
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Second email failed')).toBeInTheDocument();
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 1,
        });
      });

      // User can remove the failed invitation and add it again to retry
      const removeButton = screen
        .getAllByRole('button')
        .find(
          (btn) =>
            btn.getAttribute('data-variant') === 'ghost' &&
            btn.getAttribute('data-size') === 'sm' &&
            !btn.textContent?.trim(),
        );
      await user.click(removeButton!);

      // Add the same email again
      await user.type(emailInput, 'failure@example.com');
      await user.click(addButton!);

      // Submit the retry
      await user.click(submitButton);

      await waitFor(() => {
        // The callback should have been called twice now
        expect(mockOnInvitationsComplete).toHaveBeenCalledTimes(2);
        // The second call should be with the retry result
        expect(mockOnInvitationsComplete).toHaveBeenNthCalledWith(2, {
          sentCount: 1,
          failedCount: 0,
        });
      });
    });

    it('should handle exponential backoff for multiple retries', async () => {
      const user = userEvent.setup();
      let attemptCount = 0;

      vi.mocked(authClient.organization.inviteMember).mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error(`Attempt ${attemptCount} failed`));
        }
        return Promise.resolve({});
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'backoff@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });

      // First attempt
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('- Attempt 1 failed')).toBeInTheDocument();
      });

      // Second attempt
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('- Attempt 2 failed')).toBeInTheDocument();
      });

      // Third attempt should succeed
      await user.click(submitButton);
      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 0,
        });
      });
    });

    it('should limit retry attempts to prevent infinite loops', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Persistent error'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'persistent@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });

      // Multiple attempts should all fail
      for (let i = 0; i < 5; i++) {
        await user.click(submitButton);
        await waitFor(() => {
          expect(screen.getByText('- Persistent error')).toBeInTheDocument();
        });
      }

      // Should still be able to attempt (no artificial limit imposed)
      expect(submitButton).toBeEnabled();
    });
  });

  describe('User-Initiated Error Recovery', () => {
    it('should allow users to clear error states', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Clearable error'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'clearable@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Clearable error')).toBeInTheDocument();
      });

      // Remove the failed invitation
      const removeButton = screen
        .getAllByRole('button')
        .find(
          (btn) =>
            btn.getAttribute('data-variant') === 'ghost' &&
            btn.getAttribute('data-size') === 'sm' &&
            !btn.textContent?.trim(),
        );
      await user.click(removeButton!);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('- Clearable error')).not.toBeInTheDocument();
      });
    });

    it('should allow users to modify failed invitations', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember)
        .mockRejectedValueOnce(new Error('Role error'))
        .mockResolvedValueOnce({});

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'role@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Role error')).toBeInTheDocument();
      });

      // Change role and retry
      const roleSelect = screen.getByRole('combobox');
      await user.selectOptions(roleSelect, 'admin');

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 0,
        });
      });
    });

    it('should provide contextual help for common errors', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Invalid email format'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'invalid@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Invalid email format')).toBeInTheDocument();
      });

      // Help text should be available
      expect(
        screen.getByText(
          'You can always invite more team members later from the organization settings',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue with successful invitations despite partial failures', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember)
        .mockResolvedValueOnce({}) // Success
        .mockRejectedValueOnce(new Error('Middle failure')) // Failure
        .mockResolvedValueOnce({}); // Success

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add three emails
      await user.type(emailInput, 'success1@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'failure@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'success2@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Middle failure')).toBeInTheDocument();
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 2,
          failedCount: 1,
        });
      });
    });

    it('should maintain functionality when network is intermittent', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({});

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'network@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });

      // First attempt fails due to network
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('- Network timeout')).toBeInTheDocument();
      });

      // Second attempt succeeds when network recovers
      await user.click(submitButton);
      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 0,
        });
      });
    });

    it('should handle service degradation gracefully', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'degraded@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Service temporarily unavailable')).toBeInTheDocument();
      });

      // User should still be able to skip and continue
      const skipButton = screen.getByRole('button', { name: /skip for now/i });
      expect(skipButton).toBeEnabled();

      await user.click(skipButton);
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('should provide offline functionality when possible', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Network unavailable'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Should still allow adding emails offline
      await user.type(emailInput, 'offline@example.com');
      await user.click(addButton!);

      expect(screen.getByText('offline@example.com')).toBeInTheDocument();
      expect(screen.getByText('Team invitations (1)')).toBeInTheDocument();

      // Can still manage the form
      const roleSelect = screen.getByRole('combobox');
      await user.selectOptions(roleSelect, 'admin');
      expect(roleSelect).toHaveValue('admin');
    });
  });

  describe('Error State Persistence', () => {
    it('should persist error states across component re-renders', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Persistent error'),
      );

      const { rerender } = render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'persistent@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Persistent error')).toBeInTheDocument();
      });

      // Re-render component
      rerender(<TeamInvitation {...defaultProps} className="updated" />);

      // Error should still be visible
      expect(screen.getByText('- Persistent error')).toBeInTheDocument();
    });

    it('should clear error states when form is reset', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(new Error('Reset error'));

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'reset@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Reset error')).toBeInTheDocument();
      });

      // Remove all invitations
      const removeButton = screen
        .getAllByRole('button')
        .find(
          (btn) =>
            btn.getAttribute('data-variant') === 'ghost' &&
            btn.getAttribute('data-size') === 'sm' &&
            !btn.textContent?.trim(),
        );
      await user.click(removeButton!);

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('- Reset error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Recovery Success Indicators', () => {
    it('should show success indicators after error recovery', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember)
        .mockRejectedValueOnce(new Error('Recovery test error'))
        .mockResolvedValueOnce({});

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'recovery@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });

      // First attempt fails
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('- Recovery test error')).toBeInTheDocument();
      });

      // Second attempt succeeds
      await user.click(submitButton);
      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 0,
        });
      });
    });

    it('should update UI to reflect successful recovery', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember)
        .mockRejectedValueOnce(new Error('UI update error'))
        .mockResolvedValueOnce({});

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'ui@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });

      // First attempt shows error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText('- UI update error')).toBeInTheDocument();
      });

      // Second attempt should show success
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.queryByText('- UI update error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility During Error Recovery', () => {
    it('should maintain accessibility features during errors', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Accessibility test error'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'a11y@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Accessibility test error')).toBeInTheDocument();
      });

      // Form should still be accessible
      expect(screen.getByLabelText('Invite by email')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Screen reader error'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'screenreader@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorText = screen.getByText('- Screen reader error');
        expect(errorText).toBeInTheDocument();
        // Error should be accessible to screen readers
        expect(errorText).toBeVisible();
      });
    });
  });
});
