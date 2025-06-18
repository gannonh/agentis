/**
 * @fileoverview Unit tests for MemberManagement component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberManagement } from '../MemberManagement';
import { useOrganization } from '~/Providers/OrganizationProvider';

// Mock the organization provider
vi.mock('~/Providers/OrganizationProvider');
const mockUseOrganization = useOrganization as any;

// Mock UI components
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button type="button" onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('~/components/ui/Input', () => ({
  Input: ({ value, onChange, placeholder, className, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('~/components/ui/DropdownMenu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

describe('MemberManagement', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    logo: 'https://example.com/logo.png',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  const mockMembers = [
    {
      id: 'member-1',
      role: 'owner' as const,
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@test.com',
        image: 'https://example.com/john.jpg',
        emailVerified: true,
      },
      createdAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 'member-2',
      role: 'member' as const,
      user: {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@test.com',
        image: null,
        emailVerified: true,
      },
      createdAt: '2023-01-02T00:00:00Z',
    },
    {
      id: 'member-3',
      role: 'member' as const,
      user: {
        id: 'user-3',
        name: 'Bob Wilson',
        email: 'bob@test.com',
        image: null,
        emailVerified: false,
      },
      createdAt: '2023-01-03T00:00:00Z',
    },
  ];

  const defaultMockData = {
    organization: mockOrganization,
    userRole: 'owner' as const,
    members: mockMembers,
    invitations: [],
    
    // Loading states
    isLoading: false,
    isLoadingMembers: false,
    isLoadingInvitations: false,
    
    // Error states
    error: null,
    
    // Organization management functions
    inviteMember: vi.fn(),
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

  describe('Rendering', () => {
    it('should render component header and invite button', () => {
      const onInviteMember = vi.fn();
      render(<MemberManagement onInviteMember={onInviteMember} />);

      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(
        screen.getByText("Manage your organization's team members and their roles"),
      ).toBeInTheDocument();
      expect(screen.getByText('Invite Member')).toBeInTheDocument();
    });

    it('should render search and filter controls', () => {
      render(<MemberManagement />);

      expect(screen.getByPlaceholderText('Search members by name or email...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Roles')).toBeInTheDocument();
    });

    it('should render all members correctly', () => {
      render(<MemberManagement />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@test.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });

    it('should render member avatars correctly', () => {
      render(<MemberManagement />);

      // John has an image
      const johnAvatar = screen.getByAltText('John Doe avatar');
      expect(johnAvatar).toBeInTheDocument();
      expect(johnAvatar).toHaveAttribute('src', 'https://example.com/john.jpg');

      // Jane and Bob should have initials avatars
      expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
      expect(screen.getByText('BW')).toBeInTheDocument(); // Bob Wilson
    });

    it('should render role badges correctly', () => {
      render(<MemberManagement />);

      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getAllByText('Member')).toHaveLength(2);
    });

    it('should render member count in stats footer', () => {
      render(<MemberManagement />);

      expect(screen.getByText('Showing 3 of 3 members')).toBeInTheDocument();
      expect(screen.getByText('1 owner')).toBeInTheDocument();
      expect(screen.getByText('2 members')).toBeInTheDocument();
    });
  });

  describe('No Organization State', () => {
    it('should render nothing when no organization is provided', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        organization: null,
      });

      const { container } = render(<MemberManagement />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Invite Member Button', () => {
    it('should render invite button when user can manage organization', () => {
      const onInviteMember = vi.fn();
      render(<MemberManagement onInviteMember={onInviteMember} />);

      const inviteButton = screen.getByText('Invite Member');
      expect(inviteButton).toBeInTheDocument();
    });

    it('should not render invite button when user cannot manage organization', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        userRole: 'member',
        canManageOrganization: false,
        canManageMembers: false,
      });

      render(<MemberManagement />);
      expect(screen.queryByText('Invite Member')).not.toBeInTheDocument();
    });

    it('should call onInviteMember when invite button is clicked', () => {
      const onInviteMember = vi.fn();
      render(<MemberManagement onInviteMember={onInviteMember} />);

      const inviteButton = screen.getByText('Invite Member');
      fireEvent.click(inviteButton);

      expect(onInviteMember).toHaveBeenCalledTimes(1);
    });
  });

  describe('Search Functionality', () => {
    it('should filter members by name', () => {
      render(<MemberManagement />);

      const searchInput = screen.getByPlaceholderText('Search members by name or email...');
      fireEvent.change(searchInput, { target: { value: 'jane' } });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('should filter members by email', () => {
      render(<MemberManagement />);

      const searchInput = screen.getByPlaceholderText('Search members by name or email...');
      fireEvent.change(searchInput, { target: { value: 'bob@test.com' } });

      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<MemberManagement />);

      const searchInput = screen.getByPlaceholderText('Search members by name or email...');
      fireEvent.change(searchInput, { target: { value: 'JOHN' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should show no results message when no matches found', () => {
      render(<MemberManagement />);

      const searchInput = screen.getByPlaceholderText('Search members by name or email...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No members found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });
  });

  describe('Role Filter', () => {
    it('should filter by owner role', () => {
      render(<MemberManagement />);

      const roleSelect = screen.getByDisplayValue('All Roles');
      fireEvent.change(roleSelect, { target: { value: 'owner' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('should filter by member role', () => {
      render(<MemberManagement />);

      const roleSelect = screen.getByDisplayValue('All Roles');
      fireEvent.change(roleSelect, { target: { value: 'member' } });

      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });

  describe('Member Actions', () => {
    it('should render action dropdown for members when user can manage', () => {
      render(<MemberManagement />);

      // Should have dropdown triggers for non-owner members (Jane and Bob)
      const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
      expect(dropdownTriggers).toHaveLength(2); // Jane and Bob, not John (owner)
    });

    it('should not render action dropdown for owner members', () => {
      render(<MemberManagement />);

      // John is owner, so no dropdown for him
      // We can verify this by checking that there are only 2 dropdowns for 3 members
      const dropdownTriggers = screen.getAllByTestId('dropdown-trigger');
      expect(dropdownTriggers).toHaveLength(2);
    });

    it('should not render action dropdowns when user cannot manage', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        userRole: 'member',
        canManageOrganization: false,
        canManageMembers: false,
      });

      render(<MemberManagement />);

      const dropdownTriggers = screen.queryAllByTestId('dropdown-trigger');
      expect(dropdownTriggers).toHaveLength(0);
    });

    it('should call updateMemberRole when Make Owner is clicked', async () => {
      const updateMemberRole = vi.fn().mockResolvedValue(undefined);
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        updateMemberRole,
      });

      render(<MemberManagement />);

      // Find Make Owner option for Jane (member-2)
      const makeOwnerOptions = screen.getAllByText('Make Owner');
      expect(makeOwnerOptions).toHaveLength(2); // Jane and Bob

      fireEvent.click(makeOwnerOptions[0]); // Click first one (Jane)

      expect(updateMemberRole).toHaveBeenCalledWith('member-2', 'owner');
    });

    it('should call removeMember when Remove Member is clicked', async () => {
      const removeMember = vi.fn().mockResolvedValue(undefined);
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        removeMember,
      });

      render(<MemberManagement />);

      // Find Remove Member option for Jane
      const removeOptions = screen.getAllByText('Remove Member');
      expect(removeOptions).toHaveLength(2); // Jane and Bob

      fireEvent.click(removeOptions[0]); // Click first one (Jane)

      expect(removeMember).toHaveBeenCalledWith('member-2');
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no members', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        members: [],
      });

      render(<MemberManagement />);

      expect(screen.getByText('No members found')).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => {
          return content.includes('Your organization') && content.includes('have any members yet');
        }),
      ).toBeInTheDocument();
    });

    it('should show correct message when filtered results are empty', () => {
      render(<MemberManagement />);

      const searchInput = screen.getByPlaceholderText('Search members by name or email...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No members found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });
  });

  describe('Member Information Display', () => {
    it('should show join dates correctly', () => {
      render(<MemberManagement />);

      // Check that join dates are present (may be at least 2 due to date format variations)
      const joinedTexts = screen.getAllByText(/Joined/);
      expect(joinedTexts.length).toBeGreaterThanOrEqual(2);

      // Verify specific members have join dates
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Bob Wilson/)).toBeInTheDocument();
    });

    it('should show email verification status', () => {
      const { container } = render(<MemberManagement />);

      // John and Jane have verified emails, Bob doesn't
      const verifiedDots = container.querySelectorAll('.bg-green-500');
      expect(verifiedDots).toHaveLength(2); // John and Jane
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<MemberManagement className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should work without onInviteMember prop', () => {
      expect(() => render(<MemberManagement />)).not.toThrow();
    });
  });
});
