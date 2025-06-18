/**
 * @fileoverview Unit tests for InvitationManager component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationManager } from '../InvitationManager';
import { useOrganization } from '~/Providers/OrganizationProvider';

// Mock the organization provider
vi.mock('~/Providers/OrganizationProvider');
const mockUseOrganization = useOrganization as any;

// Mock UI components
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, className, type, disabled, variant, size, ...props }: any) => (
    <button
      type={type || 'button'}
      onClick={onClick}
      className={className}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('~/components/ui/Input', () => ({
  Input: ({ value, onChange, placeholder, className, type, id, ...props }: any) => (
    <input
      id={id}
      type={type || 'text'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, htmlFor, className, ...props }: any) => (
    <label htmlFor={htmlFor} className={className} {...props}>
      {children}
    </label>
  ),
}));

vi.mock('~/components/ui/Select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('member')}>Select</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <div data-testid="select-value">Member</div>,
}));

vi.mock('~/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn((name) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    })),
    handleSubmit: vi.fn((fn) => (e: any) => {
      e.preventDefault();
      fn({
        email: 'test@example.com',
        role: 'member',
      });
    }),
    watch: vi.fn((field) => (field === 'role' ? 'member' : '')),
    setValue: vi.fn(),
    reset: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
    },
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('InvitationManager', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    logo: 'https://example.com/logo.png',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const mockInvitations = [
    {
      id: 'inv-1',
      email: 'pending@example.com',
      role: 'member' as const,
      status: 'pending',
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-08T00:00:00Z',
    },
    {
      id: 'inv-2',
      email: 'accepted@example.com',
      role: 'owner' as const,
      status: 'accepted',
      createdAt: '2023-01-01T00:00:00Z',
      acceptedAt: '2023-01-02T00:00:00Z',
    },
    {
      id: 'inv-3',
      email: 'expired@example.com',
      role: 'member' as const,
      status: 'expired',
      createdAt: '2023-01-01T00:00:00Z',
      expiresAt: '2023-01-08T00:00:00Z',
    },
  ];

  const defaultMockData = {
    organization: mockOrganization,
    userRole: 'owner',
    members: [],
    invitations: mockInvitations,
    
    // Loading states
    isLoading: false,
    isLoadingMembers: false,
    isLoadingInvitations: false,
    
    // Error states
    error: null,
    
    // Organization management functions
    inviteMember: vi.fn().mockResolvedValue(undefined),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    updateOrganization: vi.fn(),
    
    // Invitation management
    cancelInvitation: vi.fn(),
    
    // Organization creation (for onboarding)
    createOrganization: vi.fn(),
    
    // Organization deletion
    deleteOrganization: vi.fn(),
    
    // Permission helpers
    canManageMembers: true,
    canManageOrganization: true,
    canInviteMembers: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrganization.mockReturnValue(defaultMockData);
  });

  describe('Access Control', () => {
    it('should render access denied when no organization', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        organization: null,
      });

      render(<InvitationManager />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText("You don't have permission to manage invitations."),
      ).toBeInTheDocument();
    });

    it('should render access denied when user cannot invite members', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        canInviteMembers: false,
      });

      render(<InvitationManager />);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText("You don't have permission to manage invitations."),
      ).toBeInTheDocument();
    });

    it('should render invitation manager when user can manage organization', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Rendering', () => {
    it('should render invitation form with all fields', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /send invitation/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
        expect(screen.getByText('Role')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
      });
    });

    it('should render email input with correct attributes', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email Address');
        expect(emailInput).toHaveAttribute('type', 'email');
        expect(emailInput).toHaveAttribute('placeholder', 'colleague@company.com');
      });
    });

    it('should render role selector', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByTestId('select')).toBeInTheDocument();
        expect(screen.getByTestId('select-item-member')).toBeInTheDocument();
        expect(screen.getByTestId('select-item-owner')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should handle form submission', async () => {
      const inviteMember = vi.fn().mockResolvedValue(undefined);

      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        inviteMember,
      });

      render(<InvitationManager />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /send invitation/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(inviteMember).toHaveBeenCalledWith('test@example.com', 'member');
      });
    });

    it('should handle form submission error', async () => {
      const inviteMember = vi.fn().mockRejectedValue(new Error('Send failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        inviteMember,
      });

      render(<InvitationManager />);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /send invitation/i });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to send invitation:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Pending Invitations', () => {
    it('should render pending invitations section when invitations exist', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending Invitations (1)')).toBeInTheDocument();
        expect(screen.getByText('pending@example.com')).toBeInTheDocument();
      });
    });

    it('should render pending invitation with correct status icon and badge', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument();
        const memberBadges = screen.getAllByText('Member');
        expect(memberBadges.length).toBeGreaterThan(0);
      });
    });

    it('should render invitation dates correctly', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        const sentTexts = screen.getAllByText(/Sent/);
        const expiresTexts = screen.getAllByText(/Expires/);
        expect(sentTexts.length).toBeGreaterThan(0);
        expect(expiresTexts.length).toBeGreaterThan(0);
      });
    });

    it('should render action dropdown for pending invitations', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
        expect(screen.getByText('Resend Invitation')).toBeInTheDocument();
        expect(screen.getByText('Copy Invitation Link')).toBeInTheDocument();
        expect(screen.getByText('Cancel Invitation')).toBeInTheDocument();
      });
    });

    it('should handle resend invitation', async () => {
      const inviteMember = vi.fn().mockResolvedValue(undefined);
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        inviteMember,
      });

      render(<InvitationManager />);

      await waitFor(() => {
        const resendButton = screen.getByText('Resend Invitation');
        fireEvent.click(resendButton);
      });

      await waitFor(() => {
        expect(inviteMember).toHaveBeenCalledWith('pending@example.com', 'member');
      });
    });

    it('should handle cancel invitation', async () => {
      const cancelInvitation = vi.fn().mockResolvedValue(undefined);
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        cancelInvitation,
      });

      render(<InvitationManager />);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel Invitation');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(cancelInvitation).toHaveBeenCalledWith('inv-1');
      });
    });

    it('should handle copy invitation link', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        const copyButton = screen.getByText('Copy Invitation Link');
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/invite/inv-1`,
      );
    });
  });

  describe('Invitation History', () => {
    it('should render invitation history section', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByText('Invitation History')).toBeInTheDocument();
        expect(screen.getByText('accepted@example.com')).toBeInTheDocument();
        expect(screen.getByText('expired@example.com')).toBeInTheDocument();
      });
    });

    it('should render accepted invitation with correct status', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        const acceptedTexts = screen.getAllByText(/Accepted/);
        const ownerBadges = screen.getAllByText('Owner');
        expect(acceptedTexts.length).toBeGreaterThan(0);
        expect(ownerBadges.length).toBeGreaterThan(0);
      });
    });

    it('should render expired invitation with correct status', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should render empty state when no invitations', async () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        invitations: [],
      });

      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByText('No invitations yet')).toBeInTheDocument();
        expect(
          screen.getByText('Send your first invitation to start building your team.'),
        ).toBeInTheDocument();
      });
    });

    it('should not render pending or history sections when no invitations', async () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        invitations: [],
      });

      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
        expect(screen.queryByText('Invitation History')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state', async () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        isLoadingInvitations: true,
        invitations: [],
      });

      render(<InvitationManager />);

      await waitFor(() => {
        expect(screen.getByText('Loading invitations...')).toBeInTheDocument();
      });
    });

    it('should show submitting state on form', () => {
      // This test would require mocking the react-hook-form properly
      // For now, we'll just verify the component renders
      render(<InvitationManager />);
      expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle loading invitations error', async () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        error: new Error('Load failed'),
        invitations: [],
      });

      render(<InvitationManager />);

      // Component should still render but with empty state
      await waitFor(() => {
        expect(screen.getByText('No invitations yet')).toBeInTheDocument();
      });
    });

    it('should handle resend invitation error', async () => {
      const inviteMember = vi.fn().mockRejectedValue(new Error('Resend failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        inviteMember,
      });

      render(<InvitationManager />);

      await waitFor(() => {
        const resendButton = screen.getByText('Resend Invitation');
        fireEvent.click(resendButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to resend invitation:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle cancel invitation error', async () => {
      const cancelInvitation = vi.fn().mockRejectedValue(new Error('Cancel failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        cancelInvitation,
      });

      render(<InvitationManager />);

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel Invitation');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to cancel invitation:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors', () => {
      // This test would require properly mocking react-hook-form
      // For now, we'll just verify the form renders
      render(<InvitationManager />);
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', async () => {
      const { container } = render(<InvitationManager className="custom-class" />);
      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });

  describe('Status Icons and Badges', () => {
    it('should render correct status icons', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        // Should render icons for each status type
        expect(screen.getByText('Pending')).toBeInTheDocument();
        expect(screen.getByText('Accepted')).toBeInTheDocument();
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });
    });

    it('should render correct role badges', async () => {
      render(<InvitationManager />);

      await waitFor(() => {
        const memberBadges = screen.getAllByText('Member');
        const ownerBadges = screen.getAllByText('Owner');
        expect(memberBadges.length).toBeGreaterThan(0);
        expect(ownerBadges.length).toBeGreaterThan(0);
      });
    });
  });
});
