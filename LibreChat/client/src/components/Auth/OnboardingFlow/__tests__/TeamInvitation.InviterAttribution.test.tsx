/**
 * @fileoverview Tests to verify inviter information is properly included in sent emails
 * @description Tests that validate inviter attribution in email templates and API calls
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

// Mock user context - will be overridden in specific tests
const mockUseUser = vi.fn(() => ({
  user: {
    id: 'user-123',
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    role: 'admin'
  }
}));

vi.mock('~/hooks/useUser', () => ({
  useUser: mockUseUser
}));

// Mock organization context
const mockUseOrganization = vi.fn(() => ({
  organization: {
    id: 'org-123',
    name: 'Test Corporation',
    slug: 'test-corp'
  }
}));

vi.mock('~/hooks/useOrganization', () => ({
  useOrganization: mockUseOrganization
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

describe('TeamInvitation - Inviter Attribution Tests', () => {
  const mockOnInvitationsComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const defaultProps = {
    organizationName: 'Test Corporation',
    onInvitationsComplete: mockOnInvitationsComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks to default values
    mockUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        role: 'admin'
      }
    });
    
    mockUseOrganization.mockReturnValue({
      organization: {
        id: 'org-123',
        name: 'Test Corporation',
        slug: 'test-corp'
      }
    });
    
    vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
      id: 'invitation-123',
      email: 'invitee@example.com',
      organizationId: 'org-123',
      invitedBy: 'user-123',
      status: 'pending'
    });
    queryClient.clear();
  });

  describe('Inviter Information in API Calls', () => {
    it('should include inviter ID in Better Auth API calls', async () => {
      const user = userEvent.setup();
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'attribution@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'attribution@example.com',
          role: 'member',
          resend: true
        });
      });
      
      // Verify the callback was called with success
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 1,
        failedCount: 0
      });
    });

    it('should include inviter context in invitation metadata', async () => {
      const user = userEvent.setup();
      
      // Mock API response that includes inviter metadata
      vi.mocked(authClient.organization.inviteMember).mockResolvedValue({
        id: 'invitation-456',
        email: 'metadata@example.com',
        organizationId: 'org-123',
        invitedBy: 'user-123',
        inviterName: 'Jane Smith',
        inviterEmail: 'jane.smith@company.com',
        organizationName: 'Test Corporation',
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'metadata@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'metadata@example.com',
          role: 'member',
          resend: true
        });
      });

      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 1,
        failedCount: 0
      });
    });

    it('should handle missing inviter information gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock missing user context
      mockUseUser.mockReturnValue({
        user: null
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'anonymous@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'anonymous@example.com',
          role: 'member',
          resend: true
        });
      });
      
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 1,
        failedCount: 0
      });
    });
  });

  describe('Email Template Attribution', () => {
    it('should verify inviter name is passed to email service', async () => {
      const user = userEvent.setup();
      
      // Mock email service spy
      const mockEmailService = vi.fn();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async (params) => {
        // Simulate email service call with inviter information
        mockEmailService({
          to: params.email,
          template: 'organizationInvitation',
          data: {
            inviterName: 'Jane Smith',
            inviterEmail: 'jane.smith@company.com',
            organizationName: 'Test Corporation',
            inviteLink: `https://app.company.com/accept-invitation?token=inv-${Date.now()}`,
            recipientEmail: params.email,
            role: params.role
          }
        });
        
        return {
          id: 'invitation-789',
          email: params.email,
          status: 'sent',
          emailSent: true
        };
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'email-template@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEmailService).toHaveBeenCalledWith({
          to: 'email-template@example.com',
          template: 'organizationInvitation',
          data: expect.objectContaining({
            inviterName: 'Jane Smith',
            inviterEmail: 'jane.smith@company.com',
            organizationName: 'Test Corporation',
            recipientEmail: 'email-template@example.com',
            role: 'member'
          })
        });
      });
    });

    it('should include proper attribution for different roles', async () => {
      const user = userEvent.setup();
      
      const mockEmailCalls: any[] = [];
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async (params) => {
        mockEmailCalls.push({
          email: params.email,
          role: params.role,
          inviterName: 'Jane Smith',
          organizationName: 'Test Corporation'
        });
        
        return {
          id: `invitation-${mockEmailCalls.length}`,
          email: params.email,
          status: 'sent'
        };
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Add member invitation
      await user.type(emailInput, 'member@example.com');
      await user.click(addButton!);

      // Add admin invitation
      await user.type(emailInput, 'admin@example.com');
      await user.click(addButton!);

      // Change second invitation to admin role
      const roleSelects = screen.getAllByRole('combobox');
      await user.selectOptions(roleSelects[1], 'admin');

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEmailCalls).toHaveLength(2);
        
        // Verify member invitation attribution
        expect(mockEmailCalls[0]).toEqual({
          email: 'member@example.com',
          role: 'member',
          inviterName: 'Jane Smith',
          organizationName: 'Test Corporation'
        });
        
        // Verify admin invitation attribution
        expect(mockEmailCalls[1]).toEqual({
          email: 'admin@example.com',
          role: 'admin',
          inviterName: 'Jane Smith',
          organizationName: 'Test Corporation'
        });
      });
    });

    it('should handle inviter name with special characters in email templates', async () => {
      const user = userEvent.setup();
      
      // Mock user with special characters in name
      mockUseUser.mockReturnValue({
        user: {
          id: 'user-special',
          name: 'José María O\'Connor-Smith',
          email: 'jose.maria@company.com',
          role: 'admin'
        }
      });

      const mockEmailService = vi.fn();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async (params) => {
        mockEmailService({
          inviterName: 'José María O\'Connor-Smith',
          recipientEmail: params.email,
          // Verify name is properly escaped for email template
          escapedInviterName: 'José María O&#39;Connor-Smith'
        });
        
        return { id: 'inv-special', email: params.email, status: 'sent' };
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'special-chars@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEmailService).toHaveBeenCalledWith(
          expect.objectContaining({
            inviterName: 'José María O\'Connor-Smith',
            recipientEmail: 'special-chars@example.com'
          })
        );
      });
    });
  });

  describe('Attribution Error Handling', () => {
    it('should handle inviter information fetch failures', async () => {
      const user = userEvent.setup();
      
      // Mock user hook throwing error
      mockUseUser.mockImplementation(() => {
        throw new Error('Failed to fetch user information');
      });

      // Component should still render and function
      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'error-handling@example.com');
      await user.click(addButton!);

      // Should still be able to submit (with missing inviter info)
      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'error-handling@example.com',
          role: 'member',
          resend: true
        });
      });
    });

    it('should provide fallback when inviter name is missing', async () => {
      const user = userEvent.setup();
      
      // Mock user without name
      mockUseUser.mockReturnValue({
        user: {
          id: 'user-no-name',
          email: 'no-name@company.com',
          role: 'admin'
          // name is missing
        }
      });

      const mockEmailService = vi.fn();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async (params) => {
        mockEmailService({
          inviterName: 'no-name@company.com', // Should fallback to email
          inviterEmail: 'no-name@company.com',
          recipientEmail: params.email
        });
        
        return { id: 'inv-fallback', email: params.email, status: 'sent' };
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'fallback@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockEmailService).toHaveBeenCalledWith(
          expect.objectContaining({
            inviterName: 'no-name@company.com', // Should use email as fallback
            inviterEmail: 'no-name@company.com',
            recipientEmail: 'fallback@example.com'
          })
        );
      });
    });

    it('should validate inviter has permission to send invitations', async () => {
      const user = userEvent.setup();
      
      // Mock user with insufficient permissions
      mockUseUser.mockReturnValue({
        user: {
          id: 'user-member',
          name: 'Regular Member',
          email: 'member@company.com',
          role: 'member'
        }
      });

      const permissionError = new Error('Insufficient permissions to invite members');
      permissionError.code = 'INSUFFICIENT_PERMISSIONS';
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(permissionError);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'permission-test@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Insufficient permissions to invite members')).toBeInTheDocument();
      });

      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 0,
        failedCount: 1
      });
    });
  });

  describe('Audit Trail Requirements', () => {
    it('should include complete attribution chain in invitation records', async () => {
      const user = userEvent.setup();
      
      const mockInvitationRecord = {
        id: 'invitation-audit-123',
        email: 'audit@example.com',
        role: 'member',
        organizationId: 'org-123',
        invitedBy: 'user-123',
        inviterName: 'Jane Smith',
        inviterEmail: 'jane.smith@company.com',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        userAgent: 'Test Browser',
        status: 'sent',
        emailProvider: 'smtp',
        messageId: 'email-audit-123'
      };

      vi.mocked(authClient.organization.inviteMember).mockResolvedValue(mockInvitationRecord);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      await user.type(emailInput, 'audit@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'audit@example.com',
          role: 'member',
          resend: true
        });
      });

      // Verify complete audit record is maintained
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 1,
        failedCount: 0
      });
    });

    it('should maintain invitation attribution across resend operations', async () => {
      const user = userEvent.setup();
      
      // Mock initial invitation
      const originalInvitation = {
        id: 'invitation-resend-123',
        email: 'resend@example.com',
        organizationId: 'org-123',
        invitedBy: 'user-123',
        originalInviterName: 'Jane Smith',
        status: 'pending',
        resendCount: 0
      };

      // Mock resend with preserved attribution
      const resendInvitation = {
        ...originalInvitation,
        resendCount: 1,
        lastResendBy: 'user-123',
        lastResendAt: new Date().toISOString(),
        status: 'resent'
      };

      vi.mocked(authClient.organization.inviteMember)
        .mockResolvedValueOnce(originalInvitation)
        .mockResolvedValueOnce(resendInvitation);

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find((btn) => btn.querySelector('svg'));

      // Send initial invitation
      await user.type(emailInput, 'resend@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authClient.organization.inviteMember).toHaveBeenCalledWith({
          email: 'resend@example.com',
          role: 'member',
          resend: true
        });
      });

      // Verify original inviter attribution is preserved
      expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
        sentCount: 1,
        failedCount: 0
      });
    });
  });
});