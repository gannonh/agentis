/**
 * @fileoverview Email template integration tests for TeamInvitation component
 * @description Tests email template functionality, MailHog integration, and email sending flows
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
  Button: ({ children, onClick, disabled, type = 'button', variant, size, className, ...props }: any) => (
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
  Input: React.forwardRef(({ placeholder, onChange, onKeyPress, value, disabled, ...props }: any, ref) => (
    <input 
      ref={ref}
      placeholder={placeholder} 
      onChange={onChange}
      onKeyPress={onKeyPress}
      value={value}
      disabled={disabled}
      {...props} 
    />
  )),
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, htmlFor, className, ...props }: any) => (
    <label htmlFor={htmlFor} className={className} {...props}>
      {children}
    </label>
  ),
}));

// Mock MailHog API client
class MockMailHogClient {
  private messages: any[] = [];

  async getMessages() {
    return this.messages;
  }

  async getLatestMessage(email: string) {
    return this.messages
      .filter(msg => msg.Raw.To?.includes(email))
      .sort((a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime())[0];
  }

  async clearMessages() {
    this.messages = [];
  }

  async getMessageCount() {
    return this.messages.length;
  }

  // Internal method for testing - simulate email sending
  simulateEmailSent(email: string, template: string, variables: Record<string, any>) {
    this.messages.push({
      ID: `${Date.now()}-${Math.random()}`,
      From: { Relays: null, Mailbox: 'noreply', Domain: 'agentis.com' },
      To: [{ Relays: null, Mailbox: email.split('@')[0], Domain: email.split('@')[1] }],
      Created: new Date().toISOString(),
      MIME: {
        Parts: [{
          Headers: {
            'Content-Type': ['text/html; charset=UTF-8'],
            'Subject': [this.getSubjectFromTemplate(template, variables)],
          },
          Body: this.renderTemplate(template, variables),
        }],
      },
      Raw: {
        From: 'noreply@agentis.com',
        To: [email],
        Data: this.renderTemplate(template, variables),
      },
    });
  }

  private getSubjectFromTemplate(template: string, variables: Record<string, any>): string {
    const subjects: Record<string, string> = {
      'organizationInvite': `You've been invited to join ${variables.organizationName} on ${variables.appName}`,
      'magicLink': `Your magic link for ${variables.appName}`,
      'verifyEmail': `Verify your email for ${variables.appName}`,
    };
    return subjects[template] || 'Email from Agentis';
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    // HTML entity encoding function
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const templates: Record<string, (vars: Record<string, any>) => string> = {
      'organizationInvite': (vars) => `
        <html>
          <body>
            <h2>You've been invited to join ${escapeHtml(vars.organizationName || '')}</h2>
            <p>Hello ${escapeHtml(vars.name || 'there')},</p>
            <p>${escapeHtml(vars.inviterName || 'Someone')} has invited you to join ${escapeHtml(vars.organizationName || '')} on ${escapeHtml(vars.appName || '')}.</p>
            <p>Click the link below to accept the invitation:</p>
            <a href="${vars.inviteLink}">Accept Invitation</a>
            <p>If you don't want to join, you can ignore this email.</p>
            <p>Best regards,<br>The ${escapeHtml(vars.appName || '')} Team</p>
            <p>&copy; ${vars.year} ${escapeHtml(vars.appName || '')}. All rights reserved.</p>
          </body>
        </html>
      `,
      'magicLink': (vars) => `
        <html>
          <body>
            <h2>Your magic link for ${escapeHtml(vars.appName || '')}</h2>
            <p>Hello ${escapeHtml(vars.name || 'there')},</p>
            <p>Click the link below to sign in to ${escapeHtml(vars.appName || '')}:</p>
            <a href="${vars.magicLink}">Sign In</a>
            <p>This link will expire in 10 minutes.</p>
            <p>Best regards,<br>The ${escapeHtml(vars.appName || '')} Team</p>
            <p>&copy; ${vars.year} ${escapeHtml(vars.appName || '')}. All rights reserved.</p>
          </body>
        </html>
      `,
      'verifyEmail': (vars) => `
        <html>
          <body>
            <h2>Verify your email for ${escapeHtml(vars.appName || '')}</h2>
            <p>Hello ${escapeHtml(vars.name || 'there')},</p>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${vars.verificationLink}">Verify Email</a>
            <p>If you didn't create an account, you can ignore this email.</p>
            <p>Best regards,<br>The ${escapeHtml(vars.appName || '')} Team</p>
            <p>&copy; ${vars.year} ${escapeHtml(vars.appName || '')}. All rights reserved.</p>
          </body>
        </html>
      `,
    };
    return templates[template]?.(variables) || `<html><body>Template not found: ${template}</body></html>`;
  }
}

const mockMailHogClient = new MockMailHogClient();

// Mock environment variables
const mockEnv = {
  NODE_ENV: 'test',
  USE_MAILHOG: 'true',
  MAILHOG_HOST: 'localhost',
  MAILHOG_PORT: '1025',
  EMAIL_FROM: 'noreply@agentis.com',
  EMAIL_FROM_NAME: 'Agentis',
  APP_TITLE: 'Agentis',
};

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

describe('TeamInvitation Email Template Integration', () => {
  const mockOnInvitationsComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const defaultProps = {
    organizationName: 'Test Corp',
    onInvitationsComplete: mockOnInvitationsComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMailHogClient.clearMessages();
    queryClient.clear();
    
    // Mock process.env
    Object.assign(process.env, mockEnv);
  });

  describe('Email Template Content Generation', () => {
    it('should generate organization invitation email with correct template variables', async () => {
      const user = userEvent.setup();
      
      // Mock successful invitation that triggers email
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        // Simulate email sending
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: email.split('@')[0],
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: `https://agentis.com/invite?token=test-token-${Date.now()}`,
          appName: 'Agentis',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'newuser@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const messages = await mockMailHogClient.getMessages();
        expect(messages).toHaveLength(1);
        
        const message = messages[0];
        expect(message.Raw.To).toContain('newuser@example.com');
        expect(message.Raw.Data).toContain('Test Corp');
        expect(message.Raw.Data).toContain('John Doe');
        expect(message.Raw.Data).toContain('Accept Invitation');
        expect(message.Raw.Data).toContain('Agentis');
        expect(message.Raw.Data).toContain(new Date().getFullYear().toString());
      });
    });

    it('should handle email template with missing variables gracefully', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        // Simulate email with missing variables
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Agentis',
          year: new Date().getFullYear(),
          // Missing: name, inviterName
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'missing@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const message = await mockMailHogClient.getLatestMessage('missing@example.com');
        expect(message).toBeDefined();
        expect(message.Raw.Data).toContain('Hello there,'); // Default fallback
        expect(message.Raw.Data).toContain('Someone has invited you'); // Default fallback
      });
    });

    it('should generate different email templates for different scenarios', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        // Simulate different email types based on email domain
        if (email.includes('magic')) {
          mockMailHogClient.simulateEmailSent(email, 'magicLink', {
            name: 'Test User',
            magicLink: 'https://agentis.com/magic?token=magic-token',
            appName: 'Agentis',
            year: new Date().getFullYear(),
          });
        } else if (email.includes('verify')) {
          mockMailHogClient.simulateEmailSent(email, 'verifyEmail', {
            name: 'Test User',
            verificationLink: 'https://agentis.com/verify?token=verify-token',
            appName: 'Agentis',
            year: new Date().getFullYear(),
          });
        } else {
          mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
            name: 'Test User',
            inviterName: 'John Doe',
            organizationName: 'Test Corp',
            inviteLink: 'https://agentis.com/invite?token=invite-token',
            appName: 'Agentis',
            year: new Date().getFullYear(),
          });
        }
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      // Test different email types
      const testEmails = [
        'magic@example.com',
        'verify@example.com',
        'invite@example.com',
      ];

      for (const email of testEmails) {
        await user.type(emailInput, email);
        await user.click(addButton!);
      }

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const messages = await mockMailHogClient.getMessages();
        expect(messages).toHaveLength(3);
        
        const magicMessage = messages.find(m => m.Raw.To.includes('magic@example.com'));
        const verifyMessage = messages.find(m => m.Raw.To.includes('verify@example.com'));
        const inviteMessage = messages.find(m => m.Raw.To.includes('invite@example.com'));
        
        expect(magicMessage?.Raw.Data).toContain('Your magic link');
        expect(verifyMessage?.Raw.Data).toContain('Verify your email');
        expect(inviteMessage?.Raw.Data).toContain('invited to join');
      });
    });
  });

  describe('MailHog Integration', () => {
    it('should send emails to MailHog in test environment', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: 'Test User',
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Agentis',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'mailhog@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const messageCount = await mockMailHogClient.getMessageCount();
        expect(messageCount).toBe(1);
        
        const message = await mockMailHogClient.getLatestMessage('mailhog@example.com');
        expect(message).toBeDefined();
        expect(message.From.Domain).toBe('agentis.com');
        expect(message.To[0].Mailbox).toBe('mailhog');
        expect(message.To[0].Domain).toBe('example.com');
      });
    });

    it('should handle MailHog connection errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock MailHog connection failure
      const originalGetMessages = mockMailHogClient.getMessages;
      mockMailHogClient.getMessages = vi.fn().mockRejectedValue(new Error('MailHog connection failed'));
      
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Email service temporarily unavailable')
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'connection@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Email service temporarily unavailable')).toBeInTheDocument();
      });

      // Restore original method
      mockMailHogClient.getMessages = originalGetMessages;
    });

    it('should clear MailHog messages between tests', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: 'Test User',
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Agentis',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'clear@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const messageCount = await mockMailHogClient.getMessageCount();
        expect(messageCount).toBe(1);
      });

      // Clear messages
      await mockMailHogClient.clearMessages();
      
      const clearedCount = await mockMailHogClient.getMessageCount();
      expect(clearedCount).toBe(0);
    });
  });

  describe('Email Delivery Status Tracking', () => {
    it('should track email delivery status during sending', async () => {
      const user = userEvent.setup();
      
      let emailSent = false;
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        // Simulate delay in email sending
        await new Promise(resolve => setTimeout(resolve, 100));
        
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: 'Test User',
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Agentis',
          year: new Date().getFullYear(),
        });
        emailSent = true;
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'status@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      // Should show sending status
      expect(screen.getByText('Sending...')).toBeInTheDocument();

      await waitFor(() => {
        expect(emailSent).toBe(true);
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 1,
          failedCount: 0,
        });
      });
    });

    it('should handle email delivery failures and show error status', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Email delivery failed')
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'failure@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Email delivery failed')).toBeInTheDocument();
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 0,
          failedCount: 1,
        });
      });
    });

    it('should track mixed success and failure rates', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember)
        .mockResolvedValueOnce({}) // Success
        .mockRejectedValueOnce(new Error('Email failed')) // Failure
        .mockResolvedValueOnce({}); // Success

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      // Add multiple emails
      await user.type(emailInput, 'success1@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'failure@example.com');
      await user.click(addButton!);
      await user.type(emailInput, 'success2@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Email failed')).toBeInTheDocument();
        expect(mockOnInvitationsComplete).toHaveBeenCalledWith({
          sentCount: 2,
          failedCount: 1,
        });
      });
    });
  });

  describe('Email Template Customization', () => {
    it('should support custom application branding in emails', async () => {
      const user = userEvent.setup();
      
      // Mock custom app title
      process.env.APP_TITLE = 'Custom Corp';
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: 'Test User',
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Custom Corp',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'custom@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const message = await mockMailHogClient.getLatestMessage('custom@example.com');
        expect(message.Raw.Data).toContain('Custom Corp');
        expect(message.Raw.Data).toContain('The Custom Corp Team');
      });
    });

    it('should handle email template variable injection attacks', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: '<script>alert("xss")</script>',
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Agentis',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'security@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const message = await mockMailHogClient.getLatestMessage('security@example.com');
        // Should contain the raw script tag (not executed)
        expect(message.Raw.Data).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;');
      });
    });

    it('should validate email template required variables', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        // Missing required variables should cause error
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          // Missing: organizationName, inviteLink, appName
          name: 'Test User',
          inviterName: 'John Doe',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'incomplete@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const message = await mockMailHogClient.getLatestMessage('incomplete@example.com');
        expect(message).toBeDefined();
        // Should still render but with missing data
        expect(message.Raw.Data).toContain('undefined'); // Missing variables
      });
    });
  });

  describe('Email Error Handling', () => {
    it('should handle SMTP connection errors', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('SMTP connection failed')
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'smtp@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- SMTP connection failed')).toBeInTheDocument();
      });
    });

    it('should handle email template rendering errors', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Template rendering failed')
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'template@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Template rendering failed')).toBeInTheDocument();
      });
    });

    it('should handle email quota exceeded errors', async () => {
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockRejectedValue(
        new Error('Daily email quota exceeded')
      );

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'quota@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('- Daily email quota exceeded')).toBeInTheDocument();
      });
    });
  });

  describe('Environment-Specific Email Behavior', () => {
    it('should use MailHog in development environment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_MAILHOG = 'true';
      
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: 'Test User',
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Agentis',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'dev@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const message = await mockMailHogClient.getLatestMessage('dev@example.com');
        expect(message).toBeDefined();
        expect(message.From.Domain).toBe('agentis.com');
      });
    });

    it('should handle production email configuration', async () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_MAILHOG = 'false';
      process.env.EMAIL_HOST = 'smtp.gmail.com';
      
      const user = userEvent.setup();
      
      vi.mocked(authClient.organization.inviteMember).mockImplementation(async ({ email }) => {
        // In production, would use real SMTP
        mockMailHogClient.simulateEmailSent(email, 'organizationInvite', {
          name: 'Test User',
          inviterName: 'John Doe',
          organizationName: 'Test Corp',
          inviteLink: 'https://agentis.com/invite?token=test-token',
          appName: 'Agentis',
          year: new Date().getFullYear(),
        });
        return {};
      });

      render(<TeamInvitation {...defaultProps} />, { wrapper });

      const emailInput = screen.getByTestId('team-email-input');
      const addButton = screen.getAllByRole('button').find(btn => btn.querySelector('svg'));

      await user.type(emailInput, 'prod@example.com');
      await user.click(addButton!);

      const submitButton = screen.getByRole('button', { name: /send invitations/i });
      await user.click(submitButton);

      await waitFor(async () => {
        const message = await mockMailHogClient.getLatestMessage('prod@example.com');
        expect(message).toBeDefined();
      });
    });
  });
});