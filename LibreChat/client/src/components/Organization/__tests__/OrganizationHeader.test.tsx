/**
 * @fileoverview Unit tests for OrganizationHeader component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationHeader } from '../OrganizationHeader';
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

describe('OrganizationHeader', () => {
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
        image: null,
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
      createdAt: '2023-01-01T00:00:00Z',
    },
  ];

  const defaultMockData = {
    organization: mockOrganization,
    userRole: 'owner' as const,
    members: mockMembers,
    canManageOrganization: true,
    setActiveOrganization: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrganization.mockReturnValue(defaultMockData);
  });

  describe('Rendering', () => {
    it('should render organization name and details', () => {
      render(<OrganizationHeader />);

      expect(screen.getAllByText('Test Organization')).toHaveLength(2); // Header and dropdown
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('2 members')).toBeInTheDocument();
    });

    it('should render organization logo when provided', () => {
      render(<OrganizationHeader />);

      const logo = screen.getByAltText('Test Organization logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('should render default logo when no logo provided', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        organization: { ...mockOrganization, logo: undefined },
      });

      render(<OrganizationHeader />);

      // Should render Building2 icon instead of logo
      expect(screen.queryByAltText('Test Organization logo')).not.toBeInTheDocument();
      // The Building2 icon should be present in the gradient div
      const organizationTitle = screen.getAllByText('Test Organization')[0]; // Get the first one (in the header)
      const gradientDiv =
        organizationTitle.parentElement?.parentElement?.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });

    it('should render member count correctly for single member', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        members: [mockMembers[0]],
      });

      render(<OrganizationHeader />);

      expect(screen.getByText('1 member')).toBeInTheDocument();
    });

    it('should render member count correctly for multiple members', () => {
      render(<OrganizationHeader />);

      expect(screen.getByText('2 members')).toBeInTheDocument();
    });
  });

  describe('Role Display', () => {
    it('should display "Owner" role with Crown icon for owner', () => {
      render(<OrganizationHeader />);

      expect(screen.getByText('Owner')).toBeInTheDocument();
    });

    it('should display "Member" role with Users icon for member', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        userRole: 'member',
        canManageOrganization: false,
      });

      render(<OrganizationHeader />);

      expect(screen.getByText('Member')).toBeInTheDocument();
    });
  });

  describe('Settings Button', () => {
    it('should render settings button when user can manage organization', () => {
      const onSettingsClick = vi.fn();
      render(<OrganizationHeader onSettingsClick={onSettingsClick} />);

      const settingsButton = screen.getByText('Settings');
      expect(settingsButton).toBeInTheDocument();
    });

    it('should not render settings button when user cannot manage organization', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        userRole: 'member',
        canManageOrganization: false,
      });

      render(<OrganizationHeader />);

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should call onSettingsClick when settings button is clicked', () => {
      const onSettingsClick = vi.fn();
      render(<OrganizationHeader onSettingsClick={onSettingsClick} />);

      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      expect(onSettingsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dropdown Menu', () => {
    it('should render dropdown menu with organization details', () => {
      render(<OrganizationHeader />);

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument();
    });

    it('should display organization name and slug in dropdown', () => {
      render(<OrganizationHeader />);

      expect(screen.getAllByText('Test Organization')).toHaveLength(2); // Header and dropdown
      expect(screen.getByText('test-org')).toBeInTheDocument();
    });

    it('should display organization ID in dropdown', () => {
      render(<OrganizationHeader />);

      expect(screen.getByText('Organization ID')).toBeInTheDocument();
      expect(screen.getByText('org-123')).toBeInTheDocument();
    });

    it('should render dropdown menu items', () => {
      render(<OrganizationHeader />);

      expect(screen.getByText('Organization Settings')).toBeInTheDocument();
      expect(screen.getByText('View Members')).toBeInTheDocument();
    });

    it('should call onSettingsClick when Organization Settings is clicked', () => {
      const onSettingsClick = vi.fn();
      render(<OrganizationHeader onSettingsClick={onSettingsClick} />);

      const organizationSettingsItem = screen.getByText('Organization Settings');
      fireEvent.click(organizationSettingsItem);

      expect(onSettingsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Organization State', () => {
    it('should render nothing when no organization is provided', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        organization: null,
      });

      const { container } = render(<OrganizationHeader />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(<OrganizationHeader className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should work without onSettingsClick prop', () => {
      expect(() => render(<OrganizationHeader />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(<OrganizationHeader />);

      // Check that the organization name is in a proper heading
      const orgNames = screen.getAllByText('Test Organization');
      const headerOrgName = orgNames.find((el) => el.tagName === 'H2');
      expect(headerOrgName).toBeInTheDocument();

      // Check that the logo has proper alt text
      const logo = screen.getByAltText('Test Organization logo');
      expect(logo).toBeInTheDocument();
    });

    it('should have proper button attributes', () => {
      const onSettingsClick = vi.fn();
      render(<OrganizationHeader onSettingsClick={onSettingsClick} />);

      const settingsButton = screen.getByText('Settings').closest('button');
      expect(settingsButton).toHaveAttribute('type', 'button');
    });
  });
});
