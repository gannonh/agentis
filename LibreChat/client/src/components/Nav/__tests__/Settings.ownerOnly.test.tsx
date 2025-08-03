import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { vi } from 'vitest';
import Settings from '../Settings';

// Mock useOrganization hook
const mockUseOrganization = vi.fn();
vi.mock('~/Providers', () => ({
  useOrganization: () => mockUseOrganization(),
}));

// Mock useLocalize
vi.mock('~/hooks/useLocalize', () => ({
  default: () => (key: string) => key,
}));

// Mock useMediaQuery
vi.mock('~/hooks/useMediaQuery', () => ({
  default: () => false,
}));

const renderSettings = (props = {}) => {
  return render(
    <RecoilRoot>
      <Settings {...props} />
    </RecoilRoot>,
  );
};

describe('Settings - Organization Tab Owner Visibility', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show Organization tab when user is organization owner', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'owner',
      canManageOrganization: true,
    });

    renderSettings(mockProps);

    // Should show organization tab
    expect(screen.getByText('com_nav_setting_organization')).toBeInTheDocument();
  });

  it('should hide Organization tab when user is not organization owner', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'member',
      canManageOrganization: false,
    });

    renderSettings(mockProps);

    // Should not show organization tab
    expect(screen.queryByText('com_nav_setting_organization')).not.toBeInTheDocument();
  });

  it('should hide Organization tab when user is admin but not owner', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'admin',
      canManageOrganization: false,
    });

    renderSettings(mockProps);

    // Should not show organization tab
    expect(screen.queryByText('com_nav_setting_organization')).not.toBeInTheDocument();
  });

  it('should hide Organization tab when no organization exists', () => {
    mockUseOrganization.mockReturnValue({
      organization: null,
      userRole: null,
      canManageOrganization: false,
    });

    renderSettings(mockProps);

    // Should not show organization tab
    expect(screen.queryByText('com_nav_setting_organization')).not.toBeInTheDocument();
  });

  it('should maintain correct tab order when Organization tab is hidden', () => {
    mockUseOrganization.mockReturnValue({
      organization: { id: 'org-123', name: 'Test Org' },
      userRole: 'member',
      canManageOrganization: false,
    });

    renderSettings(mockProps);

    // Check that Sharing tab is now the last tab when Organization is hidden
    const tabs = screen.getAllByRole('tab');
    const lastTab = tabs[tabs.length - 1];
    expect(lastTab).toHaveTextContent('Sharing');
  });
});
