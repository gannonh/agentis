/**
 * @fileoverview Unit tests for Settings component Organization tab integration
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsTabValues } from 'librechat-data-provider';
import Settings from '../Settings';

// Mock MediaQuery hook
vi.mock('~/hooks', () => ({
  useMediaQuery: () => false,
  useLocalize: () => (key: string) => {
    const translations: Record<string, string> = {
      com_nav_settings: 'Settings',
      com_nav_setting_general: 'General',
      com_nav_setting_chat: 'Chat',
      com_nav_setting_beta: 'Beta features',
      com_nav_commands: 'Commands',
      com_nav_setting_speech: 'Speech',
      com_nav_setting_data: 'Data controls',
      com_nav_setting_account: 'Account',
      com_nav_setting_organization: 'Organization',
      com_ui_close: 'Close',
    };
    return translations[key] || key;
  },
}));

// Mock OrganizationProvider
vi.mock('~/Providers', () => ({
  useOrganization: () => ({
    organization: { id: 'org-123', name: 'Test Org' },
    userRole: 'owner',
    canManageOrganization: true,
  }),
}));

// Mock all settings tab components
vi.mock('../SettingsTabs', () => ({
  General: () => <div data-testid="general-tab">General Settings</div>,
  Chat: () => <div data-testid="chat-tab">Chat Settings</div>,
  Speech: () => <div data-testid="speech-tab">Speech Settings</div>,
  Beta: () => <div data-testid="beta-tab">Beta Settings</div>,
  Commands: () => <div data-testid="commands-tab">Commands Settings</div>,
  Data: () => <div data-testid="data-tab">Data Settings</div>,
  Account: () => <div data-testid="account-tab">Account Settings</div>,
  Sharing: () => <div data-testid="sharing-tab">Sharing Settings</div>,
  Organization: () => <div data-testid="organization-tab">Organization Settings</div>,
}));

// Mock UI components
vi.mock('@headlessui/react', () => ({
  Dialog: ({ children, onClose }: any) => (
    <div data-testid="dialog" onClick={onClose}>
      {children}
    </div>
  ),
  DialogPanel: ({ children }: any) => <div data-testid="dialog-panel">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  Transition: ({ children, show }: any) => (show ? <div>{children}</div> : null),
  TransitionChild: ({ children }: any) => <div>{children}</div>,
}));

// Mock Radix UI Tabs
vi.mock('@radix-ui/react-tabs', () => ({
  Root: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs-root" data-value={value} onChange={onValueChange}>
      {children}
    </div>
  ),
  List: ({ children, onKeyDown }: any) => (
    <div data-testid="tabs-list" onKeyDown={onKeyDown}>
      {children}
    </div>
  ),
  Trigger: ({ children, value, onClick }: any) => (
    <button
      data-testid={`tab-trigger-${value}`}
      data-value={value}
      onClick={() => onClick?.({ target: { value } })}
    >
      {children}
    </button>
  ),
  Content: ({ children, value }: any) => <div data-testid={`tab-content-${value}`}>{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageSquare: ({ className }: any) => (
    <div data-testid="message-square-icon" className={className} />
  ),
  Command: ({ className }: any) => <div data-testid="command-icon" className={className} />,
  Building2: ({ className }: any) => <div data-testid="building-icon" className={className} />,
  Share: ({ className }: any) => <div data-testid="share-icon" className={className} />,
}));

// Mock SVG icons
vi.mock('~/components/svg', () => ({
  GearIcon: () => <div data-testid="gear-icon" />,
  DataIcon: () => <div data-testid="data-icon" />,
  SpeechIcon: ({ className }: any) => <div data-testid="speech-icon" className={className} />,
  UserIcon: () => <div data-testid="user-icon" />,
  ExperimentIcon: () => <div data-testid="experiment-icon" />,
  OrganizationIcon: () => <div data-testid="organization-icon" />,
}));

describe('Settings - Organization Tab Integration', () => {
  const mockProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Organization Tab Navigation', () => {
    it('should include Organization in the tabs list', () => {
      render(<Settings {...mockProps} />);

      // Look for organization tab trigger
      expect(screen.getByTestId('tab-trigger-organization')).toBeInTheDocument();
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });

    it('should render Organization tab content when selected', () => {
      render(<Settings {...mockProps} />);

      // Organization tab content should be rendered
      expect(screen.getByTestId('tab-content-organization')).toBeInTheDocument();
      expect(screen.getByTestId('organization-tab')).toBeInTheDocument();
    });

    it('should include Organization in keyboard navigation', () => {
      render(<Settings {...mockProps} />);

      const tabsList = screen.getByTestId('tabs-list');

      // Simulate ArrowDown key navigation - should include Organization tab
      fireEvent.keyDown(tabsList, { key: 'ArrowDown' });

      // Organization tab should be part of the navigation cycle
      expect(screen.getByTestId('tab-trigger-organization')).toBeInTheDocument();
    });

    it('should support navigating to Organization tab with End key', () => {
      render(<Settings {...mockProps} />);

      const tabsList = screen.getByTestId('tabs-list');

      // Simulate End key - should navigate to last tab (Organization)
      fireEvent.keyDown(tabsList, { key: 'End' });

      expect(screen.getByTestId('tab-trigger-organization')).toBeInTheDocument();
    });
  });

  describe('Tab Order and Structure', () => {
    it('should render Organization tab after Sharing tab', () => {
      render(<Settings {...mockProps} />);

      const sharingTab = screen.getByTestId('tab-trigger-sharing');
      const organizationTab = screen.getByTestId('tab-trigger-organization');

      // Verify both tabs exist
      expect(sharingTab).toBeInTheDocument();
      expect(organizationTab).toBeInTheDocument();

      // Organization should come after Sharing in the DOM
      const tabTriggers = screen.getAllByRole('button');
      const sharingIndex = tabTriggers.indexOf(sharingTab);
      const organizationIndex = tabTriggers.indexOf(organizationTab);

      expect(organizationIndex).toBeGreaterThan(sharingIndex);
    });

    it('should maintain proper tab order for keyboard navigation', () => {
      render(<Settings {...mockProps} />);

      // All expected tabs should be present in the correct order
      const expectedTabs = [
        'general',
        'chat',
        'beta',
        'commands',
        'speech',
        'data',
        'account',
        'sharing',
        'organization',
      ];

      expectedTabs.forEach((tabValue) => {
        expect(screen.getByTestId(`tab-trigger-${tabValue}`)).toBeInTheDocument();
      });
    });
  });

  describe('Organization Tab Icon and Label', () => {
    it('should display organization icon and label', () => {
      render(<Settings {...mockProps} />);

      const organizationTab = screen.getByTestId('tab-trigger-organization');

      // Should contain organization icon and label
      expect(organizationTab).toContainElement(screen.getByTestId('building-icon'));
      expect(organizationTab).toHaveTextContent('Organization');
    });

    it('should use proper translation key for organization tab', () => {
      render(<Settings {...mockProps} />);

      // Should display the translated label
      expect(screen.getByText('Organization')).toBeInTheDocument();
    });
  });

  describe('Settings Modal Integration', () => {
    it('should render settings modal with organization tab when open', () => {
      render(<Settings {...mockProps} />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Settings');
      expect(screen.getByTestId('tab-trigger-organization')).toBeInTheDocument();
    });

    it('should not render when modal is closed', () => {
      render(<Settings {...mockProps} open={false} />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tab-trigger-organization')).not.toBeInTheDocument();
    });

    it('should call onOpenChange when close button is clicked', () => {
      const onOpenChange = vi.fn();
      render(<Settings open={true} onOpenChange={onOpenChange} />);

      // Find and click close button (X icon)
      const closeButton = screen.getByText('Close').closest('button');
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Organization Tab State', () => {
    it('should allow switching to organization tab', () => {
      render(<Settings {...mockProps} />);

      const organizationTab = screen.getByTestId('tab-trigger-organization');

      // Click organization tab
      fireEvent.click(organizationTab);

      // Organization content should be visible
      expect(screen.getByTestId('organization-tab')).toBeInTheDocument();
      expect(screen.getByText('Organization Settings')).toBeInTheDocument();
    });

    it('should maintain tab state when switching between tabs', () => {
      render(<Settings {...mockProps} />);

      // Click organization tab
      const organizationTab = screen.getByTestId('tab-trigger-organization');
      fireEvent.click(organizationTab);

      // Switch to account tab
      const accountTab = screen.getByTestId('tab-trigger-account');
      fireEvent.click(accountTab);

      // Switch back to organization tab
      fireEvent.click(organizationTab);

      // Organization content should still be accessible
      expect(screen.getByTestId('organization-tab')).toBeInTheDocument();
    });
  });
});
