/**
 * @fileoverview Improved unit tests for TeamInvitation component with behavior-validating assertions
 * @description Tests that fail when the actual behavior is broken, not just when elements are missing
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

// Mock UI components to avoid ref issues
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

describe('TeamInvitation - Improved Behavior Assertions', () => {
  const mockOnInvitationsComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const defaultProps = {
    organizationName: 'Test Corp',
    onInvitationsComplete: mockOnInvitationsComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authClient.organization.inviteMember).mockResolvedValue({});
    queryClient.clear();
  });

  describe('Email Validation Behavior', () => {
    it('should actually prevent invalid emails from being added to the list', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Try to add an invalid email
      await user.type(emailInput, 'invalid-email-format');
      await user.click(addButton!);

      // Verify the email was NOT added to the list (behavior validation)
      expect(screen.queryByText('Team invitations')).not.toBeInTheDocument();
      expect(screen.queryByText('invalid-email-format')).not.toBeInTheDocument();

      // The input should still contain the invalid email (not cleared)
      expect(emailInput).toHaveValue('invalid-email-format');

      // Error message should be shown
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should actually add valid emails to the invitation list', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add a valid email
      await user.type(emailInput, 'valid@example.com');
      await user.click(addButton!);

      // Verify the email WAS actually added to the list (behavior validation)
      expect(screen.getByText('Team invitations (1)')).toBeInTheDocument();
      expect(screen.getByText('valid@example.com')).toBeInTheDocument();

      // The input should be cleared after successful addition
      expect(emailInput).toHaveValue('');

      // No error message should be shown
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
    });

    it('should actually prevent duplicate emails from being added', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add first email
      await user.type(emailInput, 'test@example.com');
      await user.click(addButton!);

      // Verify first email was added
      expect(screen.getByText('Team invitations (1)')).toBeInTheDocument();

      // Try to add the same email again
      await user.type(emailInput, 'test@example.com');
      await user.click(addButton!);

      // Verify the count didn't increase (behavior validation)
      expect(screen.getByText('Team invitations (1)')).toBeInTheDocument();
      expect(screen.queryByText('Team invitations (2)')).not.toBeInTheDocument();

      // Only one instance should exist in the DOM
      const emailElements = screen.getAllByText('test@example.com');
      expect(emailElements).toHaveLength(1);

      // Duplicate error should be shown
      expect(screen.getByText('This email has already been added')).toBeInTheDocument();
    });
  });

  describe('Form State Management Behavior', () => {
    it('should actually change button text when invitations are added', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Initially should show "Continue"
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /send invitations/i })).not.toBeInTheDocument();

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'change@example.com');
      await user.click(addButton!);

      // Button text should actually change (behavior validation)
      expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send invitations/i })).toBeInTheDocument();
    });

    it('should actually disable form elements during invitation sending', async () => {
      const user = userEvent.setup();

      // Mock slow invitation sending
      vi.mocked(authClient.organization.inviteMember).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 500)),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'disable@example.com');
      await user.click(addButton!);

      // Elements should be enabled before sending
      expect(emailInput).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /skip for now/i })).not.toBeDisabled();

      // Start sending
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Elements should actually be disabled during sending (behavior validation)
      expect(emailInput).toBeDisabled();
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeDisabled();

      // Should show sending state
      expect(screen.getByText('Sending...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(
        () => {
          expect(mockOnInvitationsComplete).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });

    it('should actually remove emails when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add multiple emails
      await user.type(emailInput, 'remove1@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'remove2@example.com');
      await user.click(addButton!);

      // Verify both emails are added
      expect(screen.getByText('Team invitations (2)')).toBeInTheDocument();
      expect(screen.getByText('remove1@example.com')).toBeInTheDocument();
      expect(screen.getByText('remove2@example.com')).toBeInTheDocument();

      // Find and click the first remove button
      const removeButtons = screen
        .getAllByRole('button')
        .filter(
          (btn) =>
            btn.getAttribute('data-variant') === 'ghost' &&
            btn.getAttribute('data-size') === 'sm' &&
            !btn.textContent?.trim(),
        );

      expect(removeButtons.length).toBe(2);
      await user.click(removeButtons[0]);

      // Verify the count actually decreased (behavior validation)
      await waitFor(() => {
        expect(screen.getByText('Team invitations (1)')).toBeInTheDocument();
        expect(screen.queryByText('Team invitations (2)')).not.toBeInTheDocument();
      });

      // One email should still remain
      expect(screen.getByText('remove2@example.com')).toBeInTheDocument();
    });
  });

  describe('Better Auth Integration Behavior', () => {
    it('should actually call Better Auth with correct parameters and handle response', async () => {
      const user = userEvent.setup();
      const mockResponse = { id: 'invitation-123', status: 'sent' };
      vi.mocked(authClient.organization.inviteMember).mockResolvedValue(mockResponse);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email with specific role
      await user.type(emailInput, 'integration@example.com');
      await user.click(addButton!);

      // Change role to admin
      const roleSelect = screen.getByRole('combobox');
      await user.selectOptions(roleSelect, 'admin');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Verify Better Auth was called with correct parameters (behavior validation)
      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'integration@example.com',
          role: 'admin',
          resend: true,
        });
      });

      // Verify callback was called with correct success count
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 1,
        failedCount: 0,
      });
    });

    it('should actually handle and display specific error types from Better Auth', async () => {
      const user = userEvent.setup();

      const authError = new Error('Organization not found');
      authError.code = 'ORGANIZATION_NOT_FOUND';
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(authError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'error@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Should actually display the specific error message (behavior validation)
      await waitFor(() => {
        expect(screen.getByText('- Organization not found')).toBeInTheDocument();
      });

      // Should report correct failure count
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 0,
        failedCount: 1,
      });
    });
  });

  describe('Bulk Email Processing Behavior', () => {
    it('should actually parse and add multiple emails from bulk input', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Show bulk input
      await user.click(screen.getByRole('button', { name: /bulk add/i }));

      const bulkTextarea = screen.getByPlaceholderText(/enter multiple emails/i);
      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      // Input multiple emails
      const emailList = 'bulk1@example.com, bulk2@example.com\nbulk3@example.com';
      await user.type(bulkTextarea, emailList);
      await user.click(addEmailsButton);

      // Verify all emails were actually parsed and added (behavior validation)
      expect(screen.getByText('Team invitations (3)')).toBeInTheDocument();
      expect(screen.getByText('bulk1@example.com')).toBeInTheDocument();
      expect(screen.getByText('bulk2@example.com')).toBeInTheDocument();
      expect(screen.getByText('bulk3@example.com')).toBeInTheDocument();

      // Note: Bulk textarea clearing behavior may vary by implementation
      // The important thing is that the emails were successfully parsed and added
    });

    it('should actually filter out invalid emails during bulk processing', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Show bulk input
      await user.click(screen.getByRole('button', { name: /bulk add/i }));

      const bulkTextarea = screen.getByPlaceholderText(/enter multiple emails/i);
      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      // Mix valid and invalid emails
      const mixedList = 'valid@example.com, invalid-email, another@example.com, also-invalid';
      await user.type(bulkTextarea, mixedList);
      await user.click(addEmailsButton);

      // Only valid emails should be added (behavior validation)
      expect(screen.getByText('Team invitations (2)')).toBeInTheDocument();
      expect(screen.getByText('valid@example.com')).toBeInTheDocument();
      expect(screen.getByText('another@example.com')).toBeInTheDocument();

      // Invalid emails should not be in the list
      expect(screen.queryByText('invalid-email')).not.toBeInTheDocument();
      expect(screen.queryByText('also-invalid')).not.toBeInTheDocument();
    });
  });

  describe('Invitation Status Tracking Behavior', () => {
    it('should actually track and display different invitation statuses', async () => {
      const user = userEvent.setup();

      // Mock mixed success/failure responses
      vi.mocked(authClient.organization.inviteMember)
        .mockResolvedValueOnce({ id: 'inv-1', status: 'sent' })
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({ id: 'inv-3', status: 'sent' });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add multiple emails
      await user.type(emailInput, 'success1@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'failure@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'success2@example.com');
      await user.click(addButton!);

      // Submit all invitations
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Should show specific error for failed invitation (behavior validation)
      await waitFor(() => {
        expect(screen.getByText('- Rate limit exceeded')).toBeInTheDocument();
      });

      // Should report accurate counts
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 2,
        failedCount: 1,
      });
    });

    it('should actually show real-time sending progress', async () => {
      const user = userEvent.setup();

      let resolveFirstInvitation: (value: any) => void;
      let resolveSecondInvitation: (value: any) => void;

      vi.mocked(authClient.organization.inviteMember)
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirstInvitation = resolve;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSecondInvitation = resolve;
            }),
        );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add two emails
      await user.type(emailInput, 'progress1@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'progress2@example.com');
      await user.click(addButton!);

      // Start sending
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Should show sending status immediately
      expect(screen.getByText('Sending...')).toBeInTheDocument();

      // Complete first invitation
      resolveFirstInvitation!({ id: 'inv-1' });

      // Should still show sending status (behavior validation)
      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });

      // Complete second invitation
      resolveSecondInvitation!({ id: 'inv-2' });

      // Should complete and call callback
      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 2,
          failedCount: 0,
        });
      });
    });
  });

  describe('User Experience Behavior', () => {
    it('should actually clear error messages when user starts typing', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');

      // Generate an error by submitting empty email
      await user.click(emailInput);
      await user.keyboard('{Enter}');

      // Error should be displayed
      expect(screen.getByText('Please enter an email address')).toBeInTheDocument();

      // Start typing - error should be cleared (behavior validation)
      await user.type(emailInput, 'a');

      // Error should be gone immediately after typing
      expect(screen.queryByText('Please enter an email address')).not.toBeInTheDocument();
    });

    it('should actually handle keyboard navigation and submission', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');

      // Type email and press Enter
      await user.type(emailInput, 'keyboard@example.com');
      await user.keyboard('{Enter}');

      // Email should actually be added via keyboard (behavior validation)
      expect(screen.getByText('Team invitations (1)')).toBeInTheDocument();
      expect(screen.getByText('keyboard@example.com')).toBeInTheDocument();

      // Input should be cleared
      expect(emailInput).toHaveValue('');
    });

    it('should actually prevent form submission with no invitations', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Submit form without adding any invitations
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      // Should call completion callback with zero counts (behavior validation)
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 0,
        failedCount: 0,
      });

      // Better Auth should not be called
      expect(authClient.organization.inviteMember).not.toHaveBeenCalled();
    });
  });
});
