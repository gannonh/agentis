/**
 * @fileoverview Integration error tests for TeamInvitation component
 * @description Tests integration with Better Auth, email services, and external dependencies
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

describe('TeamInvitation Integration Error Tests', () => {
  const mockOnInvitationsComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const defaultProps = {
    organizationName: 'Integration Corp',
    onInvitationsComplete: mockOnInvitationsComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authClient.organization.inviteMember).mockResolvedValue({});
    queryClient.clear();
  });

  describe('Better Auth Client Errors', () => {
    it('should handle Better Auth authentication failures', async () => {
      const user = userEvent.setup();
      const authError = new Error('Authentication required');
      (authError as any).code = 'AUTH_REQUIRED';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(authError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'auth@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Authentication required')).toBeInTheDocument();
      });
    });

    it('should handle Better Auth session expiration', async () => {
      const user = userEvent.setup();
      const sessionError = new Error('Session expired');
      (sessionError as any).code = 'SESSION_EXPIRED';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(sessionError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'session@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Session expired')).toBeInTheDocument();
      });
    });

    it('should handle Better Auth organization not found errors', async () => {
      const user = userEvent.setup();
      const orgError = new Error('Organization not found');
      (orgError as any).code = 'ORGANIZATION_NOT_FOUND';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(orgError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'org@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Organization not found')).toBeInTheDocument();
      });
    });

    it('should handle Better Auth permission errors', async () => {
      const user = userEvent.setup();
      const permissionError = new Error('Insufficient permissions');
      (permissionError as any).code = 'INSUFFICIENT_PERMISSIONS';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(permissionError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'permission@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Insufficient permissions')).toBeInTheDocument();
      });
    });

    it('should handle Better Auth malformed request errors', async () => {
      const user = userEvent.setup();
      const malformedError = new Error('Malformed request');
      (malformedError as any).code = 'MALFORMED_REQUEST';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(malformedError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'malformed@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Malformed request')).toBeInTheDocument();
      });
    });
  });

  describe('Database Connection Failures', () => {
    it('should handle database connection timeouts', async () => {
      const user = userEvent.setup();
      const dbError = new Error('Database connection timeout');
      (dbError as any).code = 'DB_CONNECTION_TIMEOUT';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(dbError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'db@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Database connection timeout')).toBeInTheDocument();
      });
    });

    it('should handle database constraint violations', async () => {
      const user = userEvent.setup();
      const constraintError = new Error('Unique constraint violation');
      (constraintError as any).code = 'CONSTRAINT_VIOLATION';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(constraintError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'constraint@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Unique constraint violation')).toBeInTheDocument();
      });
    });

    it('should handle database transaction failures', async () => {
      const user = userEvent.setup();
      const transactionError = new Error('Transaction failed');
      (transactionError as any).code = 'TRANSACTION_FAILED';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(transactionError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'transaction@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Transaction failed')).toBeInTheDocument();
      });
    });

    it('should handle database lock timeouts', async () => {
      const user = userEvent.setup();
      const lockError = new Error('Database lock timeout');
      (lockError as any).code = 'LOCK_TIMEOUT';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(lockError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'lock@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Database lock timeout')).toBeInTheDocument();
      });
    });
  });

  describe('Email Service Outages', () => {
    it('should handle SMTP server failures', async () => {
      const user = userEvent.setup();
      const smtpError = new Error('SMTP server unavailable');
      (smtpError as any).code = 'SMTP_ERROR';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(smtpError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'smtp@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- SMTP server unavailable')).toBeInTheDocument();
      });
    });

    it('should handle email provider rate limiting', async () => {
      const user = userEvent.setup();
      const rateLimitError = new Error('Email provider rate limit exceeded');
      (rateLimitError as any).code = 'EMAIL_RATE_LIMIT';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(rateLimitError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'emailrate@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Email provider rate limit exceeded')).toBeInTheDocument();
      });
    });

    it('should handle email authentication failures', async () => {
      const user = userEvent.setup();
      const emailAuthError = new Error('Email service authentication failed');
      (emailAuthError as any).code = 'EMAIL_AUTH_FAILED';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(emailAuthError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'emailauth@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Email service authentication failed')).toBeInTheDocument();
      });
    });

    it('should handle email template rendering failures', async () => {
      const user = userEvent.setup();
      const templateError = new Error('Email template rendering failed');
      (templateError as any).code = 'TEMPLATE_ERROR';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(templateError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'template@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Email template rendering failed')).toBeInTheDocument();
      });
    });
  });

  describe('Network Timeouts', () => {
    it('should handle API gateway timeouts', async () => {
      const user = userEvent.setup();
      const gatewayError = new Error('Gateway timeout');
      (gatewayError as any).code = 'GATEWAY_TIMEOUT';
      (gatewayError as any).status = 504;

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(gatewayError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'gateway@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Gateway timeout')).toBeInTheDocument();
      });
    });

    it('should handle CDN failures', async () => {
      const user = userEvent.setup();
      const cdnError = new Error('CDN service unavailable');
      (cdnError as any).code = 'CDN_ERROR';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(cdnError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'cdn@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- CDN service unavailable')).toBeInTheDocument();
      });
    });

    it('should handle DNS resolution failures', async () => {
      const user = userEvent.setup();
      const dnsError = new Error('DNS resolution failed');
      (dnsError as any).code = 'DNS_ERROR';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(dnsError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'dns@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- DNS resolution failed')).toBeInTheDocument();
      });
    });

    it('should handle SSL certificate errors', async () => {
      const user = userEvent.setup();
      const sslError = new Error('SSL certificate error');
      (sslError as any).code = 'SSL_ERROR';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(sslError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'ssl@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- SSL certificate error')).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration Failures', () => {
    it('should handle third-party service outages', async () => {
      const user = userEvent.setup();
      const serviceError = new Error('Third-party service unavailable');
      (serviceError as any).code = 'SERVICE_UNAVAILABLE';
      (serviceError as any).status = 503;

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(serviceError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'service@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Third-party service unavailable')).toBeInTheDocument();
      });
    });

    it('should handle API version mismatches', async () => {
      const user = userEvent.setup();
      const versionError = new Error('API version mismatch');
      (versionError as any).code = 'VERSION_MISMATCH';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(versionError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'version@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- API version mismatch')).toBeInTheDocument();
      });
    });

    it('should handle webhook delivery failures', async () => {
      const user = userEvent.setup();
      const webhookError = new Error('Webhook delivery failed');
      (webhookError as any).code = 'WEBHOOK_FAILED';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(webhookError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'webhook@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Webhook delivery failed')).toBeInTheDocument();
      });
    });
  });

  describe('Data Consistency Errors', () => {
    it('should handle race condition errors', async () => {
      const user = userEvent.setup();
      const raceError = new Error('Race condition detected');
      (raceError as any).code = 'RACE_CONDITION';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(raceError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'race@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Race condition detected')).toBeInTheDocument();
      });
    });

    it('should handle data synchronization failures', async () => {
      const user = userEvent.setup();
      const syncError = new Error('Data synchronization failed');
      (syncError as any).code = 'SYNC_FAILED';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(syncError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'sync@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Data synchronization failed')).toBeInTheDocument();
      });
    });

    it('should handle concurrent modification conflicts', async () => {
      const user = userEvent.setup();
      const conflictError = new Error('Concurrent modification detected');
      (conflictError as any).code = 'CONCURRENT_MODIFICATION';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(conflictError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'conflict@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Concurrent modification detected')).toBeInTheDocument();
      });
    });
  });

  describe('Error Propagation and Handling', () => {
    it('should propagate errors through the component hierarchy', async () => {
      const user = userEvent.setup();
      const propagatedError = new Error('Propagated error');
      (propagatedError as any).code = 'PROPAGATED_ERROR';

      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(propagatedError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'propagated@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Propagated error')).toBeInTheDocument();
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 0,
          failedCount: 1,
        });
      });
    });

    it('should handle cascading failures gracefully', async () => {
      const user = userEvent.setup();

      // Mock cascading failures
      vi.mocked(authClient.organization.inviteMember)
        .mockRejectedValueOnce(new Error('Primary service failure'))
        .mockRejectedValueOnce(new Error('Backup service failure'))
        .mockRejectedValueOnce(new Error('Final fallback failure'));

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add multiple emails
      await user.type(emailInput, 'cascade1@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'cascade2@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'cascade3@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Primary service failure')).toBeInTheDocument();
        expect(screen.getByText('- Backup service failure')).toBeInTheDocument();
        expect(screen.getByText('- Final fallback failure')).toBeInTheDocument();
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 0,
          failedCount: 3,
        });
      });
    });

    it('should maintain component stability during error storms', async () => {
      const user = userEvent.setup();

      // Mock rapid succession of errors
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(new Error('Error storm'));

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add multiple emails quickly
      for (let i = 0; i < 10; i++) {
        await user.type(emailInput, `storm${i}@example.com`);
        await user.click(addButton!);
      }

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByText('- Error storm')).toHaveLength(10);
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 0,
          failedCount: 10,
        });
      });

      // Component should still be responsive
      expect(screen.getByText('Invite your team')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeEnabled();
    });
  });
});
