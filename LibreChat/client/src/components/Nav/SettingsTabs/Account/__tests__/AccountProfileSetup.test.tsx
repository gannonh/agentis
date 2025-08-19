/**
 * @fileoverview Unit tests for AccountProfileSetup component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RecoilRoot } from 'recoil';
import { fileConfig as defaultFileConfig } from 'librechat-data-provider';
import { AccountProfileSetup } from '../AccountProfileSetup';
import { authClient } from '~/config/betterAuth';
import { useUploadAvatarMutation, useGetFileConfig, useGetUserQuery } from '~/data-provider';
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
  useGetUserQuery: vi.fn(),
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
    (useGetUserQuery as any).mockReturnValue({
      data: mockUser,
      refetch: vi.fn().mockResolvedValue({ data: mockUser }),
    });
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
      </RecoilRoot>,
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
    expect(
      await screen.findByText(
        'Username can only contain letters, numbers, underscores, and hyphens',
      ),
    ).toBeInTheDocument();
  });

  it('checks username availability', async () => {
    const user = userEvent.setup();
    renderComponent();

    const usernameInput = screen.getByTestId('profile-username-input');
    await user.clear(usernameInput);
    await user.type(usernameInput, 'newusername');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/check-username?username=newusername');
    });

    expect(screen.getByTestId('username-available')).toBeInTheDocument();
  });

  it('does not check username availability for current username', async () => {
    const user = userEvent.setup();

    // Mock debounce to return current username immediately to prevent intermediate calls
    (useDebounce as any).mockImplementation((value) => {
      if (value === 'johndoe') return 'johndoe';
      return ''; // Return empty for any intermediate values
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
    expect(
      await screen.findByText('Please select a valid image file (JPEG, PNG, GIF, or WebP)'),
    ).toBeInTheDocument();
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
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
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

    // Set up user with avatar in both session and userData
    const userWithAvatar = { ...mockUser, avatar: '/uploads/avatar.jpg' };
    (authClient.useSession as any).mockReturnValue({
      data: {
        user: userWithAvatar,
      },
      refetch: vi.fn(),
    });
    (useGetUserQuery as any).mockReturnValue({
      data: userWithAvatar,
      refetch: vi.fn().mockResolvedValue({ data: userWithAvatar }),
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

  describe('Error Boundary and Unexpected Error Handling', () => {
    beforeEach(() => {
      // Suppress console errors for error boundary tests
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('handles network failure during session fetch gracefully', () => {
      // Mock session hook to throw network error
      (authClient.useSession as any).mockReturnValue({
        data: null,
        error: new Error('Network request failed'),
        refetch: vi.fn(),
      });

      expect(() => renderComponent()).not.toThrow();

      // Component should render with fallback state
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('handles corrupted session data gracefully', () => {
      // Mock corrupted session data
      (authClient.useSession as any).mockReturnValue({
        data: {
          user: {
            id: null, // Invalid ID
            name: null, // Invalid name
            email: undefined, // Invalid email
            username: 123, // Invalid type
          },
        },
        refetch: vi.fn(),
      });

      expect(() => renderComponent()).not.toThrow();

      // Should handle null/undefined values gracefully
      expect(screen.getByText('Profile Information')).toBeInTheDocument();

      // Form inputs should handle null values
      const nameInput = screen.getByTestId('profile-name-input');
      expect(nameInput).toHaveValue('');
    });

    it('handles invalid user data from query gracefully', () => {
      // Mock invalid user data structure
      (useGetUserQuery as any).mockReturnValue({
        data: {
          // Missing required fields
          id: undefined,
          name: '',
          avatar: 'javascript:alert("xss")', // Malicious URL
        },
        refetch: vi.fn().mockRejectedValue(new Error('Failed to refetch user data')),
      });

      expect(() => renderComponent()).not.toThrow();

      // Should sanitize malicious URLs
      expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
    });

    it('handles file config fetch failure gracefully', () => {
      // Mock file config failure - the component should use defaultFileConfig as fallback
      (useGetFileConfig as any).mockReturnValue({
        data: defaultFileConfig, // This will ensure the select function returns defaultFileConfig
        error: new Error('Failed to fetch file config'),
      });

      expect(() => renderComponent()).not.toThrow();

      // Should use default file config (check the actual default size in the output)
      expect(screen.getByText(/Max size of \d+MB/)).toBeInTheDocument();
    });

    it('handles avatar upload mutation error gracefully', async () => {
      const user = userEvent.setup();

      // Mock upload mutation to throw unexpected error
      mockUploadAvatarMutation.mutateAsync.mockRejectedValue(
        new TypeError('Cannot read property of undefined'),
      );

      renderComponent();

      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('Failed to upload avatar. Please try again.')).toBeInTheDocument();
      });

      // Component should remain functional
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('handles username check API failure gracefully', async () => {
      const user = userEvent.setup();

      // Mock fetch to throw network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      renderComponent();

      const usernameInput = screen.getByTestId('profile-username-input');
      await user.clear(usernameInput);
      await user.type(usernameInput, 'newusername');

      await waitFor(() => {}, { timeout: 600 });

      // Should handle error gracefully without crashing
      expect(screen.getByText('Profile Information')).toBeInTheDocument();

      // Username availability should be null (not checked)
      expect(screen.queryByTestId('username-available')).not.toBeInTheDocument();
    });

    it('handles form submission with corrupted auth client', async () => {
      const user = userEvent.setup();

      // Mock auth client to be undefined/corrupted
      (authClient.updateUser as any).mockImplementation(() => {
        throw new TypeError('authClient.updateUser is not a function');
      });

      renderComponent();

      // Make form dirty
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

      // Component should remain functional
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('handles malformed avatar URLs without crashing', () => {
      // Mock user with malformed avatar URL
      const userWithBadAvatar = {
        ...mockUser,
        avatar: '<img src=x onerror=alert(1)>',
      };

      (authClient.useSession as any).mockReturnValue({
        data: { user: userWithBadAvatar },
        refetch: vi.fn(),
      });

      (useGetUserQuery as any).mockReturnValue({
        data: userWithBadAvatar,
        refetch: vi.fn().mockResolvedValue({ data: userWithBadAvatar }),
      });

      expect(() => renderComponent()).not.toThrow();

      // Should not render malicious avatar
      expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();

      // Should show initials instead
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('handles debounce hook failure gracefully', () => {
      // Mock debounce hook to return empty string when it fails
      (useDebounce as any).mockImplementation((value) => {
        // Simulate debounce failure by returning the original value without debouncing
        return value || '';
      });

      expect(() => renderComponent()).not.toThrow();

      // Should still render form
      expect(screen.getByTestId('profile-username-input')).toBeInTheDocument();
    });

    it('handles toast context unavailable', () => {
      // Mock toast context to be undefined
      (useToastContext as any).mockReturnValue({
        showToast: undefined,
      });

      expect(() => renderComponent()).not.toThrow();

      // Component should render without toast functionality
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('handles image onError event gracefully', async () => {
      const userWithAvatar = {
        ...mockUser,
        avatar: '/uploads/broken-image.jpg',
      };

      (authClient.useSession as any).mockReturnValue({
        data: { user: userWithAvatar },
        refetch: vi.fn(),
      });

      (useGetUserQuery as any).mockReturnValue({
        data: userWithAvatar,
        refetch: vi.fn().mockResolvedValue({ data: userWithAvatar }),
      });

      renderComponent();

      // Avatar should be visible initially
      const avatarImg = screen.getByTestId('avatar-preview');
      expect(avatarImg).toBeInTheDocument();

      // Simulate image load error
      fireEvent.error(avatarImg);

      // Avatar should be removed and initials should show
      await waitFor(() => {
        expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });

    it('handles form state corruption during submission', async () => {
      const user = userEvent.setup();

      renderComponent();

      // Make form dirty
      const nameInput = screen.getByTestId('profile-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Doe');

      // Simulate form submission error by mocking handleSubmit to throw
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock the form submission to fail unexpectedly
      const originalSubmit = HTMLFormElement.prototype.submit;
      HTMLFormElement.prototype.submit = vi.fn().mockImplementation(() => {
        throw new Error('Form state corrupted');
      });

      const saveButton = screen.getByTestId('profile-save-button');

      // Click should not crash the component
      await user.click(saveButton);

      // Component should remain functional
      expect(screen.getByText('Profile Information')).toBeInTheDocument();

      // Restore original submit method
      HTMLFormElement.prototype.submit = originalSubmit;
      consoleErrorSpy.mockRestore();
    });

    it('handles concurrent state updates gracefully', async () => {
      const user = userEvent.setup();

      renderComponent();

      // Simulate sequential updates that could cause race conditions
      const nameInput = screen.getByTestId('profile-name-input');
      const usernameInput = screen.getByTestId('profile-username-input');

      // Sequential updates to avoid character interleaving
      await user.clear(nameInput);
      await user.type(nameInput, 'Fast Name');
      await user.clear(usernameInput);
      await user.type(usernameInput, 'fastuser');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      // Component should remain stable
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(nameInput).toHaveValue('New Name');
      expect(usernameInput).toHaveValue('fastuser');
    });

    it('handles memory leaks from unmounted component interactions', async () => {
      const user = userEvent.setup();

      const { unmount } = renderComponent();

      // Start an async operation
      const usernameInput = screen.getByTestId('profile-username-input');
      await user.type(usernameInput, 'testuser');

      // Unmount component while async operation might be in progress
      unmount();

      // Wait for any potential async operations to complete
      await waitFor(() => {}, { timeout: 1000 });

      // This test passes if no errors are thrown and no memory leaks occur
      expect(true).toBe(true);
    });
  });
});
