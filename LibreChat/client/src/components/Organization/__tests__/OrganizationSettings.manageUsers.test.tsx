import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { OrganizationSettings } from '../OrganizationSettings';
import { useOrganization } from '~/Providers/OrganizationProvider';

// Mock the organization provider
vi.mock('~/Providers/OrganizationProvider');
const mockUseOrganization = useOrganization as any;

// Mock useLocalize hook
vi.mock('~/hooks/useLocalize', () => ({
  default: () => (key: string) => {
    const translations: Record<string, string> = {
      com_nav_manage_members: 'Manage Members',
      com_ui_manage: 'Manage',
    };
    return translations[key] || key;
  },
}));

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: () => ({}),
    handleSubmit: (fn: any) => fn,
    watch: () => '',
    setValue: vi.fn(),
    reset: vi.fn(),
    formState: { errors: {}, isSubmitting: false, isDirty: false },
  }),
}));

// Mock dialog components - always render content for testing
vi.mock('~/components', () => ({
  OGDialog: ({ children }: any) => <div data-testid="user-management-modal">{children}</div>,
  OGDialogTrigger: ({ children }: any) => children,
}));

vi.mock('~/components/ui/OGDialogTemplate', () => ({
  default: ({ title, main }: any) => (
    <div data-testid="dialog-template">
      <h2>{title}</h2>
      {main}
    </div>
  ),
}));

// Mock MemberManagement component
vi.mock('../MemberManagement', () => ({
  MemberManagement: ({ onInviteMember }: any) => (
    <div data-testid="member-management">
      <button onClick={onInviteMember}>Invite Member</button>
    </div>
  ),
}));

// Mock Button component with proper structure
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

const renderOrganizationSettings = (props = {}) => {
  return render(<OrganizationSettings {...props} />);
};

describe('OrganizationSettings - Manage Users Button', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: '2024-01-01T00:00:00Z',
    metadata: {
      description: 'Test description',
      website: 'https://test.com',
    },
  };

  const mockMembers = [
    {
      id: '1',
      userId: 'user-1',
      role: 'owner',
      user: { id: 'user-1', name: 'Owner User', email: 'owner@test.com' },
    },
    {
      id: '2',
      userId: 'user-2',
      role: 'member',
      user: { id: 'user-2', name: 'Member User', email: 'member@test.com' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup
    mockUseOrganization.mockReturnValue({
      organization: mockOrganization,
      userRole: 'owner',
      members: mockMembers,
      invitations: [],
      isLoading: false,
      isLoadingMembers: false,
      isLoadingInvitations: false,
      error: null,
      inviteMember: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      updateOrganization: vi.fn(),
      cancelInvitation: vi.fn(),
      createOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
      canManageMembers: true,
      canManageOrganization: true,
      canInviteMembers: true,
      canUpdateSettings: true,
      canDeleteOrganization: true,
      canViewMembers: true,
    });
  });

  it('should show Manage Users button when user can manage organization', () => {
    renderOrganizationSettings();

    // Use more specific selector to avoid multiple "Team Members" elements
    expect(screen.getByRole('heading', { name: 'Team Members', level: 3 })).toBeInTheDocument();
    expect(
      screen.getByText('Manage your organization members and their roles'),
    ).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
    expect(screen.getByTestId('manage-users-button')).toBeInTheDocument();
    expect(screen.getByText('Manage')).toBeInTheDocument();
  });

  it('should not show Manage Users section when user cannot manage organization', () => {
    mockUseOrganization.mockReturnValue({
      organization: mockOrganization,
      userRole: 'member',
      members: mockMembers,
      invitations: [],
      isLoading: false,
      isLoadingMembers: false,
      isLoadingInvitations: false,
      error: null,
      inviteMember: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      updateOrganization: vi.fn(),
      cancelInvitation: vi.fn(),
      createOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
      canManageMembers: false,
      canManageOrganization: false,
      canInviteMembers: false,
      canUpdateSettings: false,
      canDeleteOrganization: false,
      canViewMembers: true,
    });

    renderOrganizationSettings();

    expect(screen.queryByText('Team Members')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manage-users-button')).not.toBeInTheDocument();
  });

  it('should render modal dialog components when user can manage organization', () => {
    renderOrganizationSettings();

    // Check that the dialog components are present in the DOM (even if not visible)
    const manageButton = screen.getByTestId('manage-users-button');
    expect(manageButton).toBeInTheDocument();

    // Verify the dialog components exist in the DOM structure
    expect(screen.getByTestId('dialog-template')).toBeInTheDocument();
    expect(screen.getByTestId('member-management')).toBeInTheDocument();
  });

  it('should display correct member count in singular form', () => {
    mockUseOrganization.mockReturnValue({
      organization: mockOrganization,
      userRole: 'owner',
      members: [mockMembers[0]], // Only one member
      invitations: [],
      isLoading: false,
      isLoadingMembers: false,
      isLoadingInvitations: false,
      error: null,
      inviteMember: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      updateOrganization: vi.fn(),
      cancelInvitation: vi.fn(),
      createOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
      canManageMembers: true,
      canManageOrganization: true,
      canInviteMembers: true,
      canUpdateSettings: true,
      canDeleteOrganization: true,
      canViewMembers: true,
    });

    renderOrganizationSettings();

    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('should display correct member count in plural form', () => {
    renderOrganizationSettings();

    expect(screen.getByText('2 members')).toBeInTheDocument();
  });
});
