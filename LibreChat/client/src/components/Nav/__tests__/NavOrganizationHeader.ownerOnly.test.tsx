import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import NavOrganizationHeader from '../NavOrganizationHeader';

// Mock useOrganization hook
const mockUseOrganization = vi.fn();
vi.mock('~/Providers/OrganizationProvider', () => ({
  useOrganization: () => mockUseOrganization(),
}));

const renderNavOrganizationHeader = () => {
  return render(<NavOrganizationHeader />);
};

describe('NavOrganizationHeader - Owner Only Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be clickable when user is organization owner', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'owner',
      members: [{ id: '1' }, { id: '2' }],
      isLoading: false,
      canManageOrganization: true,
    });

    renderNavOrganizationHeader();

    const orgButton = screen.getByRole('button');
    expect(orgButton).toBeInTheDocument();
    expect(orgButton).toHaveClass('cursor-pointer');
    expect(orgButton).not.toHaveClass('cursor-default', 'opacity-75');
  });

  it('should not be clickable when user is organization member', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'member',
      members: [{ id: '1' }, { id: '2' }],
      isLoading: false,
      canManageOrganization: false,
    });

    renderNavOrganizationHeader();

    const orgHeader = screen.getByTestId('nav-organization-header');
    expect(orgHeader).toHaveClass('cursor-default', 'opacity-75');
    expect(orgHeader).not.toHaveClass('cursor-pointer');
    expect(orgHeader).not.toHaveAttribute('role', 'button');
  });

  it('should not render when no organization exists', () => {
    mockUseOrganization.mockReturnValue({
      organization: null,
      userRole: null,
      members: [],
      isLoading: false,
      canManageOrganization: false,
    });

    const { container } = renderNavOrganizationHeader();
    expect(container.firstChild).toBeNull();
  });

  it('should not render when loading', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'owner',
      members: [{ id: '1' }],
      isLoading: true,
      canManageOrganization: true,
    });

    const { container } = renderNavOrganizationHeader();
    expect(container.firstChild).toBeNull();
  });

  it('should display correct role icon for owner', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'owner',
      members: [{ id: '1' }],
      isLoading: false,
      canManageOrganization: true,
    });

    renderNavOrganizationHeader();

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('1 members')).toBeInTheDocument();
  });

  it('should display correct role icon for member', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'member',
      members: [{ id: '1' }, { id: '2' }],
      isLoading: false,
      canManageOrganization: false,
    });

    renderNavOrganizationHeader();

    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('should not open settings modal when non-owner clicks', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'member',
      members: [{ id: '1' }],
      isLoading: false,
      canManageOrganization: false,
    });

    renderNavOrganizationHeader();

    const orgHeader = screen.getByTestId('nav-organization-header');
    fireEvent.click(orgHeader);

    // Settings modal should not appear
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });
});