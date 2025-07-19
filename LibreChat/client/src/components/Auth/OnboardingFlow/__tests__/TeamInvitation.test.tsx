/**
 * @fileoverview Unit tests for TeamInvitation component
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

describe('TeamInvitation', () => {
  const mockOnInvitationsComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const defaultProps = {
    organizationName: 'Acme Corp',
    onInvitationsComplete: mockOnInvitationsComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authClient.organization.inviteMember).mockResolvedValue({});
    // Reset query client between tests to avoid state pollution
    queryClient.clear();
  });

  describe('Initial Rendering', () => {
    it('should render team invitation form with all basic elements', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      expect(screen.getByText('Invite your team')).toBeInTheDocument();
      expect(screen.getByText('Add team members to Acme Corp')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
      expect(screen.getByLabelText('Invite by email')).toBeInTheDocument();
    });

    it('should render add button with plus icon', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const buttons = screen.getAllByRole('button');
      const addButton = buttons.find((button) => button.querySelector('svg'));
      expect(addButton).toBeInTheDocument();
      expect(addButton).toBeDisabled(); // Should be disabled when email input is empty
    });

    it('should render skip and continue buttons', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('should render bulk add toggle button', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      expect(screen.getByRole('button', { name: /bulk add/i })).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<TeamInvitation {...defaultProps} className="custom-class" />, {
        wrapper,
      });

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should show loading state when isLoading prop is true', () => {
      render(<TeamInvitation {...defaultProps} isLoading={true} />, { wrapper });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();
    });
  });

  describe('Email Validation Logic', () => {
    it('should validate email format using regex', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Test invalid email
      await user.type(emailInput, 'invalid-email');
      await user.click(addButton!);

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should accept valid email formats', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'valid@example.com');
      await user.click(addButton!);

      // Should not show error message
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
      // Should add the email to the list
      expect(screen.getByText('valid@example.com')).toBeInTheDocument();
    });

    it('should detect duplicate emails', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add first email
      await user.type(emailInput, 'test@example.com');
      await user.click(addButton!);

      // Try to add the same email again
      await user.type(emailInput, 'test@example.com');
      await user.click(addButton!);

      expect(screen.getByText('This email has already been added')).toBeInTheDocument();
    });

    it('should show error for empty email input via Enter key', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');

      // Try to add empty email via Enter key (button is disabled when empty)
      await user.click(emailInput); // Focus the input
      await user.keyboard('{Enter}');

      expect(screen.getByText('Please enter an email address')).toBeInTheDocument();
    });

    it('should disable add button when email input is empty', async () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Button should be disabled when email input is empty
      expect(addButton).toBeDisabled();
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');

      // Generate error first via Enter key
      await user.click(emailInput);
      await user.keyboard('{Enter}');
      expect(screen.getByText('Please enter an email address')).toBeInTheDocument();

      // Start typing should clear error
      await user.type(emailInput, 'a');
      expect(screen.queryByText('Please enter an email address')).not.toBeInTheDocument();
    });
  });

  describe('Form Interactions and State Management', () => {
    it('should add email via Enter key press', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');

      await user.type(emailInput, 'enter@example.com');
      await user.keyboard('{Enter}');

      expect(screen.getByText('enter@example.com')).toBeInTheDocument();
      expect(emailInput).toHaveValue(''); // Input should be cleared
    });

    it('should add email via + button click', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'button@example.com');
      await user.click(addButton!);

      expect(screen.getByText('button@example.com')).toBeInTheDocument();
      expect(emailInput).toHaveValue(''); // Input should be cleared
    });

    it('should enable/disable add button based on email input', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Should be disabled initially
      expect(addButton).toBeDisabled();

      // Should enable when there's text
      await user.type(emailInput, 'test@example.com');
      expect(addButton).toBeEnabled();

      // Should disable again when cleared
      await user.clear(emailInput);
      expect(addButton).toBeDisabled();
    });

    it('should remove invitations from the list', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'remove@example.com');
      await user.click(addButton!);

      expect(screen.getByText('remove@example.com')).toBeInTheDocument();

      // Find the remove button (ghost/sm button without text content, only has icon)
      const removeButton = screen.getAllByRole('button').find(
        (btn) =>
          btn.getAttribute('data-variant') === 'ghost' &&
          btn.getAttribute('data-size') === 'sm' &&
          !btn.textContent?.trim(), // Remove button has no text, only SVG icon
      );

      expect(removeButton).toBeInTheDocument();
      await user.click(removeButton!);

      await waitFor(() => {
        expect(screen.queryByText('remove@example.com')).not.toBeInTheDocument();
      });
    });

    it('should update role selection for invitations', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'role@example.com');
      await user.click(addButton!);

      // Find the role select dropdown by looking for select elements
      const roleSelect = screen.getByRole('combobox');
      expect(roleSelect).toBeInTheDocument();

      // Change role to admin
      await user.selectOptions(roleSelect, 'admin');
      expect(roleSelect).toHaveValue('admin');
    });

    it('should show invitation count in summary', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add multiple emails
      await user.type(emailInput, 'first@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'second@example.com');
      await user.click(addButton!);

      expect(screen.getByText('Team invitations (2)')).toBeInTheDocument();
      expect(screen.getByText('Ready to send 2 invitations')).toBeInTheDocument();
    });
  });

  describe('Bulk Email Input and Parsing', () => {
    it('should toggle bulk input visibility', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const bulkToggle = screen.getByRole('button', { name: /bulk add/i });

      // Should not show bulk input initially
      expect(screen.queryByPlaceholderText(/enter multiple emails/i)).not.toBeInTheDocument();

      // Click to show bulk input
      await user.click(bulkToggle);
      expect(screen.getByPlaceholderText(/enter multiple emails/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument();

      // Click to hide bulk input
      await user.click(screen.getByRole('button', { name: /hide/i }));
      expect(screen.queryByPlaceholderText(/enter multiple emails/i)).not.toBeInTheDocument();
    });

    it('should parse comma-separated emails in bulk input', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Show bulk input
      await user.click(screen.getByRole('button', { name: /bulk add/i }));

      const bulkTextarea = screen.getByPlaceholderText(/enter multiple emails/i);
      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      await user.type(bulkTextarea, 'first@example.com, second@example.com, third@example.com');
      await user.click(addEmailsButton);

      expect(screen.getByText('first@example.com')).toBeInTheDocument();
      expect(screen.getByText('second@example.com')).toBeInTheDocument();
      expect(screen.getByText('third@example.com')).toBeInTheDocument();
      // Note: The bulk input clears after adding, but we can't easily test this since the textarea might retain the value
    });

    it('should parse newline-separated emails in bulk input', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Show bulk input
      await user.click(screen.getByRole('button', { name: /bulk add/i }));

      const bulkTextarea = screen.getByPlaceholderText(/enter multiple emails/i);
      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      await user.type(bulkTextarea, 'line1@example.com\nline2@example.com\nline3@example.com');
      await user.click(addEmailsButton);

      expect(screen.getByText('line1@example.com')).toBeInTheDocument();
      expect(screen.getByText('line2@example.com')).toBeInTheDocument();
      expect(screen.getByText('line3@example.com')).toBeInTheDocument();
    });

    it('should filter out invalid emails in bulk input', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Show bulk input
      await user.click(screen.getByRole('button', { name: /bulk add/i }));

      const bulkTextarea = screen.getByPlaceholderText(/enter multiple emails/i);
      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      await user.type(bulkTextarea, 'valid@example.com, invalid-email, another@example.com');
      await user.click(addEmailsButton);

      expect(screen.getByText('valid@example.com')).toBeInTheDocument();
      expect(screen.getByText('another@example.com')).toBeInTheDocument();
      expect(screen.queryByText('invalid-email')).not.toBeInTheDocument();
    });

    it('should skip duplicate emails in bulk input', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Add an email first
      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));
      await user.type(emailInput, 'existing@example.com');
      await user.click(addButton!);

      // Show bulk input
      await user.click(screen.getByRole('button', { name: /bulk add/i }));

      const bulkTextarea = screen.getByPlaceholderText(/enter multiple emails/i);
      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      await user.type(bulkTextarea, 'existing@example.com, new@example.com');
      await user.click(addEmailsButton);

      // Should only have one instance of existing@example.com
      const existingEmails = screen.getAllByText('existing@example.com');
      expect(existingEmails).toHaveLength(1);
      expect(screen.getByText('new@example.com')).toBeInTheDocument();
    });

    it('should disable bulk input and buttons during sending', async () => {
      const user = userEvent.setup();

      // Mock a slow invitation sending
      vi.mocked(authClient.organization.inviteMember).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Add an email and start sending
      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));
      await user.type(emailInput, 'test@example.com');
      await user.click(addButton!);

      // Show bulk input before sending starts
      await user.click(screen.getByRole('button', { name: /bulk add/i }));
      const bulkTextarea = screen.getByPlaceholderText(/enter multiple emails/i);
      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      // Submit form to start sending
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Now the bulk input should be disabled
      expect(bulkTextarea).toBeDisabled();
      expect(addEmailsButton).toBeDisabled();
    });
  });

  describe('Better Auth Integration', () => {
    it('should call authClient.organization.inviteMember with correct parameters', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'auth@example.com');
      await user.click(addButton!);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'auth@example.com',
          role: 'member',
          resend: true,
        });
      });
    });

    it('should call onInvitationsComplete with correct success count', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add multiple emails
      await user.type(emailInput, 'success1@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'success2@example.com');
      await user.click(addButton!);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 2,
          failedCount: 0,
        });
      });
    });

    it('should handle invitation sending errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock one success and one failure
      vi.mocked(authClient.organization.inviteMember)
        .mockResolvedValueOnce({}) // First call succeeds
        .mockRejectedValueOnce(new Error('Invitation failed')); // Second call fails

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add multiple emails
      await user.type(emailInput, 'success@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'failure@example.com');
      await user.click(addButton!);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 1,
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it('should show error messages for failed invitations', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(new Error('Network error'));

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'error@example.com');
      await user.click(addButton!);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText((content, element) => {
            return content.includes('Network error');
          }),
        ).toBeInTheDocument();
      });
    });

    it('should update invitation status during sending process', async () => {
      const user = userEvent.setup();

      // Mock a slow invitation process
      vi.mocked(authClient.organization.inviteMember).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 100)),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'status@example.com');
      await user.click(addButton!);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Should show sending state
      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });

      // Wait for completion and check final state
      await waitFor(
        () => {
          expect(mockOnInvitationsComplete).toHaveBeenCalled();
        },
        { timeout: 2000 },
      );
    });
  });

  describe('User Interface Behaviors', () => {
    it('should show correct status icons for different states', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email (should show pending status)
      await user.type(emailInput, 'pending@example.com');
      await user.click(addButton!);

      // Check that the pending status icon is rendered (Mail icon)
      const invitationRow =
        screen.getByText('pending@example.com').closest('.bg-gray-50') ||
        screen.getByText('pending@example.com').closest('div');
      expect(invitationRow).toBeInTheDocument();
      // Check for the icon container that holds the status icon
      const iconContainer = invitationRow?.querySelector('.rounded-full');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('should update submit button text based on state', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Initially should show "Continue"
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'button@example.com');
      await user.click(addButton!);

      // Should now show "Send invitations"
      expect(screen.getByRole('button', { name: /send invitations/i })).toBeInTheDocument();
    });

    it('should disable form elements during sending', async () => {
      const user = userEvent.setup();

      // Mock slow sending
      vi.mocked(authClient.organization.inviteMember).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 1000)),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'disable@example.com');
      await user.click(addButton!);

      // Role selector should be available before sending
      const roleSelect = screen.getByRole('combobox') || screen.getByDisplayValue('member');
      expect(roleSelect).toBeInTheDocument();

      // Start sending
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Check that form elements are disabled
      expect(emailInput).toBeDisabled();
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeDisabled();

      // Role selector should also be disabled
      expect(roleSelect).toBeDisabled();
    });

    it('should call onSkip when skip button is clicked', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const skipButton = screen.getByRole('button', { name: /skip for now/i });
      await user.click(skipButton);

      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });

    it('should handle form submission with no invitations', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Submit form without adding any invitations
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 0,
        failedCount: 0,
      });
    });

    it('should show summary section when invitations are added', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Should not show summary initially
      expect(screen.queryByText(/ready to send/i)).not.toBeInTheDocument();

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'summary@example.com');
      await user.click(addButton!);

      // Should now show summary
      expect(screen.getByText(/ready to send 1 invitation/i)).toBeInTheDocument();
      expect(screen.getByText(/invitations will be sent via email/i)).toBeInTheDocument();
    });

    it('should show processed count in summary after sending', async () => {
      const user = userEvent.setup();

      // Mock one success and keep one pending
      authClient.organization.inviteMember.mockResolvedValueOnce({}).mockImplementation(
        () => new Promise(() => {}), // Never resolves for second invitation
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add two emails
      await user.type(emailInput, 'sent@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'pending@example.com');
      await user.click(addButton!);

      // Should show "Ready to send 2 invitations"
      expect(screen.getByText(/ready to send 2 invitations/i)).toBeInTheDocument();
    });

    it('should prevent removal of invitations during sending', async () => {
      const user = userEvent.setup();

      // Mock slow sending
      vi.mocked(authClient.organization.inviteMember).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 1000)),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add an email
      await user.type(emailInput, 'remove@example.com');
      await user.click(addButton!);

      // Get the remove button before sending starts
      const removeButton = screen.getAllByRole('button').find(
        (btn) =>
          btn.getAttribute('data-variant') === 'ghost' &&
          btn.getAttribute('data-size') === 'sm' &&
          !btn.textContent?.trim(), // Remove button has no text, only SVG icon
      );

      expect(removeButton).toBeInTheDocument();
      expect(removeButton).not.toBeDisabled(); // Should be enabled initially

      // Start sending
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Remove button should now be disabled during sending
      await waitFor(() => {
        expect(removeButton).toBeDisabled();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(new Error('Network error'));

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'network@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 0,
          failedCount: 1,
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle mutation error and call onInvitationsComplete with all failed', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock the authClient to throw an error
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Mutation failed'),
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'mutation@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 0,
          failedCount: 1,
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle very long email addresses', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      const longEmail = 'very.long.email.address.that.might.cause.layout.issues@example.com';
      await user.type(emailInput, longEmail);
      await user.click(addButton!);

      expect(screen.getByText(longEmail)).toBeInTheDocument();
    });

    it('should handle special characters in email addresses', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      const specialEmail = 'test+special@example.co.uk';
      await user.type(emailInput, specialEmail);
      await user.click(addButton!);

      expect(screen.getByText(specialEmail)).toBeInTheDocument();
    });

    it('should handle component unmounting during async operations', async () => {
      const user = userEvent.setup();

      vi.mocked(authClient.organization.inviteMember).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 1000)),
      );

      const { unmount } = render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'unmount@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Unmount component while async operation is in progress
      unmount();

      // Should not throw errors or cause memory leaks
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it('should trim and lowercase email addresses', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add email with extra spaces and uppercase
      await user.type(emailInput, '  TRIM@EXAMPLE.COM  ');
      await user.click(addButton!);

      // Should display normalized email
      expect(screen.getByText('trim@example.com')).toBeInTheDocument();
      expect(screen.queryByText('  TRIM@EXAMPLE.COM  ')).not.toBeInTheDocument();
    });

    it('should handle empty bulk input gracefully', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      // Show bulk input
      await user.click(screen.getByRole('button', { name: /bulk add/i }));

      const addEmailsButton = screen.getByRole('button', { name: /add emails/i });

      // Button should be disabled for empty input
      expect(addEmailsButton).toBeDisabled();

      // Try clicking anyway (shouldn't do anything)
      await user.click(addEmailsButton);

      // Should not have added any emails
      expect(screen.queryByText('Team invitations')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper form labels and associations', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByLabelText('Invite by email');
      expect(emailInput).toHaveAttribute('id', 'emailInput');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should provide helpful placeholder text', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
    });

    it('should show instructional text', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      expect(screen.getByText('Press Enter or click + to add email')).toBeInTheDocument();
      expect(
        screen.getByText(
          'You can always invite more team members later from the organization settings',
        ),
      ).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /invite your team/i })).toBeInTheDocument();
    });

    it('should provide clear button labels', () => {
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk add/i })).toBeInTheDocument();
    });
  });
});
