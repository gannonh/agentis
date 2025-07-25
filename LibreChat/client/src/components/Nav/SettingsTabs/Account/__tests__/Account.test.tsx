/**
 * @fileoverview Unit tests for Account component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { RecoilRoot } from 'recoil';
import Account from '../Account';
import { authClient } from '~/config/betterAuth';

// Mock authClient
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

// Mock AccountProfileSetup component
vi.mock('../AccountProfileSetup', () => ({
  AccountProfileSetup: () => <div data-testid="account-profile-setup">Account Profile Setup</div>,
}));

// Mock DeleteAccount component
vi.mock('../DeleteAccount', () => ({
  default: () => <div data-testid="delete-account">Delete Account</div>,
}));

// Mock data-provider hooks
vi.mock('~/data-provider', () => ({
  useUploadAvatarMutation: vi.fn(),
  useGetFileConfig: vi.fn(),
}));

// Mock toast context
vi.mock('~/Providers/ToastContext', () => ({
  useToastContext: vi.fn(() => ({ showToast: vi.fn() })),
}));

// Mock debounce hook
vi.mock('~/hooks/Input/useDebounce', () => ({
  default: vi.fn((value) => value),
}));

const mockUser = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  username: 'johndoe',
  avatar: null,
};

const mockSession = {
  user: mockUser,
};

describe('Account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <RecoilRoot>
        <Account />
      </RecoilRoot>
    );
  };

  it('renders loading state when no session', () => {
    (authClient.useSession as any).mockReturnValue({
      data: null,
    });

    renderComponent();

    expect(screen.getByText('Loading account information...')).toBeInTheDocument();
  });

  it('renders account settings when user is authenticated', () => {
    (authClient.useSession as any).mockReturnValue({
      data: mockSession,
    });

    renderComponent();

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your profile information and account preferences')).toBeInTheDocument();
    expect(screen.getByTestId('account-profile-setup')).toBeInTheDocument();
    expect(screen.getByTestId('delete-account')).toBeInTheDocument();
  });

  it('renders danger zone section', () => {
    (authClient.useSession as any).mockReturnValue({
      data: mockSession,
    });

    renderComponent();

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Permanently delete your account and all associated data')).toBeInTheDocument();
  });

  it('uses modern layout with proper spacing', () => {
    (authClient.useSession as any).mockReturnValue({
      data: mockSession,
    });

    const { container } = renderComponent();

    // Check for modern layout classes
    const mainContainer = container.querySelector('.mx-auto.max-w-2xl.space-y-6');
    expect(mainContainer).toBeInTheDocument();

    // Check for card-style containers
    const dangerZoneCard = container.querySelector('.rounded-lg.bg-white.p-6.shadow');
    expect(dangerZoneCard).toBeInTheDocument();
  });

  it('has proper heading hierarchy', () => {
    (authClient.useSession as any).mockReturnValue({
      data: mockSession,
    });

    renderComponent();

    // Main heading
    const mainHeading = screen.getByRole('heading', { level: 1, name: 'Account Settings' });
    expect(mainHeading).toBeInTheDocument();

    // Danger zone heading
    const dangerHeading = screen.getByRole('heading', { level: 3, name: 'Danger Zone' });
    expect(dangerHeading).toBeInTheDocument();
  });

  it('maintains component isolation for testing', () => {
    (authClient.useSession as any).mockReturnValue({
      data: mockSession,
    });

    renderComponent();

    // Verify that child components are rendered but we're not testing their internal logic
    expect(screen.getByTestId('account-profile-setup')).toBeInTheDocument();
    expect(screen.getByTestId('delete-account')).toBeInTheDocument();
  });
});