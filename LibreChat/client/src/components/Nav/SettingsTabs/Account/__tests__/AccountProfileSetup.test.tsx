/**
 * @fileoverview Unit tests for AccountProfileSetup component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RecoilRoot } from 'recoil';
import { AccountProfileSetup } from '../AccountProfileSetup';
import { authClient } from '~/config/betterAuth';
import { useUploadAvatarMutation, useGetFileConfig } from '~/data-provider';
import { useToastContext } from '~/Providers/ToastContext';
import useDebounce from '~/hooks/Input/useDebounce';

// Mock authClient
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    updateUser: vi.fn(),
  },
}));

// Mock data-provider hooks
vi.mock('~/data-provider', () => ({
  useUploadAvatarMutation: vi.fn(),
  useGetFileConfig: vi.fn(),
}));

// Mock toast context
vi.mock('~/Providers/ToastContext', () => ({
  useToastContext: vi.fn(),
}));

// Mock debounce hook
vi.mock('~/hooks/Input/useDebounce', () => ({
  default: vi.fn((value) => value),
}));

const mockShowToast = vi.fn();
const mockUploadAvatarMutation = {
  mutateAsync: vi.fn(),
};
const mockFileConfig = {
  avatarSizeLimit: 5 * 1024 * 1024, // 5MB
};

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

describe('AccountProfileSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset debounce mock to default behavior
    (useDebounce as any).mockImplementation((value) => value);
    
    (authClient.useSession as any).mockReturnValue({
      data: mockSession,
      refetch: vi.fn(),
    });
    
    (useUploadAvatarMutation as any).mockReturnValue(mockUploadAvatarMutation);
    (useGetFileConfig as any).mockReturnValue({ data: mockFileConfig });
    (useToastContext as any).mockReturnValue({ showToast: mockShowToast });
    (authClient.updateUser as any).mockResolvedValue({});

    // Mock fetch for username checking
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ available: true }),
    });
  });

  const renderComponent = () => {
    return render(
      <RecoilRoot>
        <AccountProfileSetup />
      </RecoilRoot>
    );
  };

  it('renders with user data', () => {
    renderComponent();

    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('johndoe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows save button as disabled when form is not dirty', () => {
    renderComponent();

    const saveButton = screen.getByTestId('profile-save-button');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when form is dirty and valid', async () => {
    const user = userEvent.setup();
    renderComponent();

    const nameInput = screen.getByTestId('profile-name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    // Wait for form state to update
    await waitFor(() => {
      const saveButton = screen.getByTestId('profile-save-button');
      expect(saveButton).toBeEnabled();
    });
  });

  it('validates name field', async () => {
    const user = userEvent.setup();
    renderComponent();

    const nameInput = screen.getByTestId('profile-name-input');
    await user.clear(nameInput);
    
    // Trigger validation by blurring the field
    await user.tab();
    
    // Empty name should show error
    expect(await screen.findByText('Name is required')).toBeInTheDocument();

    // Single character should show error
    await user.type(nameInput, 'A');
    await user.tab();
    expect(await screen.findByText('Name must be at least 2 characters')).toBeInTheDocument();
  });

  it('validates username field', async () => {
    const user = userEvent.setup();
    renderComponent();

    const usernameInput = screen.getByTestId('profile-username-input');
    await user.clear(usernameInput);
    
    // Short username should show error
    await user.type(usernameInput, 'ab');
    expect(await screen.findByText('Username must be at least 3 characters')).toBeInTheDocument();

    // Invalid characters should show error
    await user.clear(usernameInput);
    await user.type(usernameInput, 'user@name');
    expect(await screen.findByText('Username can only contain letters, numbers, underscores, and hyphens')).toBeInTheDocument();
  });

  it('checks username availability', async () => {
    const user = userEvent.setup();
    renderComponent();

    const usernameInput = screen.getByTestId('profile-username-input');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'newusername');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user/check-username?username=newusername'
      );
    });

    expect(screen.getByTestId('username-available')).toBeInTheDocument();
  });

  it('does not check username availability for current username', async () => {
    const user = userEvent.setup();
    
    // Mock debounce to return current username immediately to prevent intermediate calls
    (useDebounce as any).mockImplementation((value) => {
      if (value === 'johndoe') return 'johndoe';
      return '';  // Return empty for any intermediate values
    });
    
    renderComponent();

    const usernameInput = screen.getByTestId('profile-username-input');
    
    // Clear previous calls before testing
    vi.clearAllMocks();
    
    // Clear and retype the current username
    await user.clear(usernameInput);
    await user.type(usernameInput, 'johndoe');

    // Wait for debounce and any potential effects
    await waitFor(() => {}, { timeout: 600 });

    // Should not call fetch for current username
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles avatar upload', async () => {
    const user = userEvent.setup();
    mockUploadAvatarMutation.mutateAsync.mockResolvedValue({
      url: '/uploads/avatar.jpg',
    });

    renderComponent();

    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, file);

    await waitFor(() => {
      expect(mockUploadAvatarMutation.mutateAsync).toHaveBeenCalled();
    });
  });

  it('validates avatar file type', async () => {
    renderComponent();

    const file = new File(['content'], 'document.txt', { type: 'text/plain' });
    const input = document.getElementById('avatar-upload') as HTMLInputElement;

    // Trigger the file input change event directly
    fireEvent.change(input, { target: { files: [file] } });

    // Use findByText to wait for the error message to appear
    expect(await screen.findByText('Please select a valid image file (JPEG, PNG, GIF, or WebP)')).toBeInTheDocument();
  });

  it('validates avatar file size', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, largeFile);

    expect(screen.getByText(/Image is too large/)).toBeInTheDocument();
  });

  it('submits form with updated data', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Update name
    const nameInput = screen.getByTestId('profile-name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    // Update username
    const usernameInput = screen.getByTestId('profile-username-input');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'janedoe');

    const saveButton = screen.getByTestId('profile-save-button');
    await user.click(saveButton);

    await waitFor(() => {
      expect(authClient.updateUser).toHaveBeenCalledWith({
        name: 'Jane Doe',
        username: 'janedoe',
        avatar: null,
      });
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      message: 'Profile updated successfully',
      severity: 'success',
      showIcon: true,
    });
  });

  it('handles form submission error', async () => {
    const user = userEvent.setup();
    (authClient.updateUser as any).mockRejectedValue(new Error('Update failed'));
    
    renderComponent();

    // Update name to make form dirty
    const nameInput = screen.getByTestId('profile-name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    const saveButton = screen.getByTestId('profile-save-button');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Failed to update profile. Please try again.',
        severity: 'error',
        showIcon: true,
      });
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveUpdate: () => void;
    (authClient.updateUser as any).mockImplementation(
      () => new Promise((resolve) => { resolveUpdate = resolve; })
    );
    
    renderComponent();

    // Update name to make form dirty
    const nameInput = screen.getByTestId('profile-name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    const saveButton = screen.getByTestId('profile-save-button');
    await user.click(saveButton);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Resolve the promise
    resolveUpdate!();
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });

  it('removes avatar when remove button is clicked', async () => {
    const user = userEvent.setup();
    
    // Start with a user that has an avatar
    (authClient.useSession as any).mockReturnValue({
      data: {
        user: { ...mockUser, avatar: '/uploads/avatar.jpg' },
      },
      refetch: vi.fn(),
    });

    renderComponent();

    const removeButton = screen.getByText('Remove photo');
    await user.click(removeButton);

    // Avatar preview should be gone
    expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
  });

  it('displays user initials when no avatar', () => {
    renderComponent();

    // Should show "JD" for "John Doe"
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});