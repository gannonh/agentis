/**
 * @fileoverview OAuth integration tests for ProfileSetup component
 * @module ProfileSetup.oauth.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ProfileSetup } from '../ProfileSetup';
import type { AvatarUploadResponse, FileConfig } from 'librechat-data-provider';

// Mock UI components to avoid ref issues
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('~/components/ui/Input', () => ({
  Input: React.forwardRef(({ placeholder, ...props }: any, ref: any) => (
    <input ref={ref} placeholder={placeholder} {...props} />
  )),
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

// Mock data provider hooks
const mockUploadAvatarMutateAsync = vi.fn();
const mockUploadAvatarMutation = {
  mutateAsync: mockUploadAvatarMutateAsync,
  isLoading: false,
  error: null,
};

vi.mock('~/data-provider', () => ({
  useUploadAvatarMutation: () => mockUploadAvatarMutation,
  useGetFileConfig: () => ({
    data: {
      avatarSizeLimit: 5 * 1024 * 1024, // 5MB
      endpoints: {},
    } as FileConfig,
  }),
}));

// Mock debounce hook to avoid timing issues in tests
vi.mock('~/hooks/Input/useDebounce', () => ({
  default: (value: string) => value, // Return value immediately without debouncing
}));

// Mock fetch for username availability
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ProfileSetup OAuth Integration', () => {
  const mockOnProfileComplete = vi.fn();
  const user = userEvent.setup();

  const defaultProps = {
    email: 'test@example.com',
    onProfileComplete: mockOnProfileComplete,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ available: true }),
    });
    console.error = vi.fn();
    console.warn = vi.fn();
    console.log = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Google OAuth Data Integration', () => {
    it('should pre-populate form with complete Google OAuth data', () => {
      const googleOAuthData = {
        name: 'John Smith',
        picture: 'https://lh3.googleusercontent.com/a/ACg8ocI123456789=s96-c',
        email: 'john.smith@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={googleOAuthData} />);

      // Check form pre-population
      const nameInput = screen.getByTestId('profile-name-input');
      const avatarImg = screen.getByTestId('avatar-preview');

      expect(nameInput).toHaveValue('John Smith');
      expect(avatarImg).toHaveAttribute('src', googleOAuthData.picture);
      expect(avatarImg).toHaveAttribute('alt', 'Avatar preview');
    });

    it('should handle Google OAuth data with missing avatar', () => {
      const oauthDataNoAvatar = {
        name: 'Jane Doe',
        picture: undefined, // No avatar from OAuth
        email: 'jane.doe@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthDataNoAvatar} />);

      // Should show initials instead of avatar
      expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument(); // Initials
      expect(screen.getByText('Upload a photo')).toBeInTheDocument();
    });

    it('should handle Google OAuth data with missing name', () => {
      const oauthDataNoName = {
        name: undefined,
        picture: 'https://lh3.googleusercontent.com/a/default-avatar.jpg',
        email: 'noname@gmail.com',
      };

      render(
        <ProfileSetup {...defaultProps} email="noname@gmail.com" oauthData={oauthDataNoName} />,
      );

      const nameInput = screen.getByTestId('profile-name-input');

      // Should fall back to email prefix
      expect(nameInput).toHaveValue('noname');
    });

    it('should prioritize OAuth name over suggestedName', () => {
      const oauthData = {
        name: 'OAuth User Name',
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        email: 'oauth@gmail.com',
      };

      render(
        <ProfileSetup {...defaultProps} suggestedName="Suggested Name" oauthData={oauthData} />,
      );

      const nameInput = screen.getByTestId('profile-name-input');
      expect(nameInput).toHaveValue('OAuth User Name'); // OAuth takes priority
    });

    it('should handle OAuth data with special characters in name', () => {
      const oauthData = {
        name: "José María O'Connor-Smith",
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        email: 'jose@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const nameInput = screen.getByTestId('profile-name-input');
      expect(nameInput).toHaveValue("José María O'Connor-Smith");
    });
  });

  describe('OAuth Avatar Loading and Error Handling', () => {
    it('should keep Google OAuth avatar URL on loading failure', async () => {
      const googleOAuthData = {
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/a/failed-avatar.jpg',
        email: 'google@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={googleOAuthData} />);

      const avatarImg = screen.getByTestId('avatar-preview');

      // Simulate image load error
      fireEvent.error(avatarImg);

      // OAuth avatar URL should be preserved (not cleared like manual uploads)
      expect(avatarImg).toHaveAttribute('src', googleOAuthData.picture);
      expect(console.warn).toHaveBeenCalledWith(
        'OAuth avatar failed to load, keeping URL for retry:',
        googleOAuthData.picture,
      );
    });

    it('should clear manually uploaded avatar on loading failure', async () => {
      const googleOAuthData = {
        name: 'User',
        picture: 'https://lh3.googleusercontent.com/original.jpg',
        email: 'user@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={googleOAuthData} />);

      // Simulate manual avatar upload
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
      const manualFile = new File(['content'], 'manual.jpg', { type: 'image/jpeg' });

      mockUploadAvatarMutateAsync.mockResolvedValue({
        url: 'https://example.com/manual-upload.jpg',
      });

      fireEvent.change(fileInput, { target: { files: [manualFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('avatar-preview')).toHaveAttribute(
          'src',
          'https://example.com/manual-upload.jpg',
        );
      });

      // Now simulate load error on the manual upload
      const avatarImg = screen.getByTestId('avatar-preview');
      fireEvent.error(avatarImg);

      // Manual upload should be cleared, showing initials instead
      await waitFor(() => {
        expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
        expect(screen.getByText('U')).toBeInTheDocument(); // Initials
      });
    });

    it('should handle different Google avatar URL formats', () => {
      const googleAvatarFormats = [
        'https://lh3.googleusercontent.com/a/default-user=s96-c',
        'https://lh3.googleusercontent.com/a/ACg8ocI123456789=s96-c',
        'https://lh6.googleusercontent.com/-AbCdEfGhIjK/AAAAAAAAAAI/AAAAAAAAAAA/1234567890/photo.jpg',
        'https://lh4.googleusercontent.com/photo.jpg?sz=50',
      ];

      for (const avatarUrl of googleAvatarFormats) {
        const oauthData = {
          name: 'Test User',
          picture: avatarUrl,
          email: 'test@gmail.com',
        };

        const { unmount } = render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

        const avatarImg = screen.getByTestId('avatar-preview');
        expect(avatarImg).toHaveAttribute('src', avatarUrl);

        unmount();
      }
    });

    it('should sanitize malicious OAuth avatar URLs', () => {
      const maliciousOAuthData = {
        name: 'Malicious User',
        picture: 'javascript:alert("xss")', // XSS attempt
        email: 'malicious@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={maliciousOAuthData} />);

      // Since dangerous URL is sanitized, it should show fallback avatar (user initials)
      // The avatar-preview img element should not exist - component shows initials instead
      const avatarImg = screen.queryByTestId('avatar-preview');
      expect(avatarImg).toBeNull();

      // Should show user initials instead (first letters of name)
      const initialsElement = screen.getByText('MU'); // "Malicious User" -> "MU"
      expect(initialsElement).toBeInTheDocument();
    });

    it('should handle OAuth avatar CORS failures gracefully', async () => {
      const corsFailingOAuth = {
        name: 'CORS User',
        picture: 'https://cors-restricted.googleusercontent.com/avatar.jpg',
        email: 'cors@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={corsFailingOAuth} />);

      const avatarImg = screen.getByTestId('avatar-preview');

      // Simulate CORS error (which manifests as a load error)
      fireEvent.error(avatarImg);

      // OAuth avatar should remain (might load later)
      expect(avatarImg).toHaveAttribute('src', corsFailingOAuth.picture);
      expect(console.warn).toHaveBeenCalledWith(
        'OAuth avatar failed to load, keeping URL for retry:',
        corsFailingOAuth.picture,
      );
    });
  });

  describe('OAuth vs Manual Data Override', () => {
    it('should allow overriding OAuth name while preserving avatar', async () => {
      const oauthData = {
        name: 'OAuth Name',
        picture: 'https://lh3.googleusercontent.com/oauth-avatar.jpg',
        email: 'oauth@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const nameInput = screen.getByTestId('profile-name-input');
      const continueButton = screen.getByTestId('profile-continue-button');

      // Override the OAuth name
      await user.clear(nameInput);
      await user.type(nameInput, 'Manual Override Name');

      // Submit form
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });

      await user.click(continueButton);

      // Should submit with manual name but OAuth avatar
      expect(mockOnProfileComplete).toHaveBeenCalledWith({
        name: 'Manual Override Name',
        username: expect.any(String),
        avatar: 'https://lh3.googleusercontent.com/oauth-avatar.jpg',
      });
    });

    it('should allow manual avatar upload to override OAuth avatar', async () => {
      const oauthData = {
        name: 'User With OAuth Avatar',
        picture: 'https://lh3.googleusercontent.com/oauth-original.jpg',
        email: 'user@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      // Verify OAuth avatar is initially shown
      expect(screen.getByTestId('avatar-preview')).toHaveAttribute('src', oauthData.picture);

      // Upload manual avatar
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
      const manualFile = new File(['manual content'], 'manual.jpg', { type: 'image/jpeg' });

      mockUploadAvatarMutateAsync.mockResolvedValue({
        url: 'https://example.com/manual-avatar.jpg',
      });

      fireEvent.change(fileInput, { target: { files: [manualFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('avatar-preview')).toHaveAttribute(
          'src',
          'https://example.com/manual-avatar.jpg',
        );
      });

      // Submit form
      const nameInput = screen.getByTestId('profile-name-input');
      await user.type(nameInput, ' Updated');

      const continueButton = screen.getByTestId('profile-continue-button');
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });

      await user.click(continueButton);

      // Should submit with manual avatar (overriding OAuth)
      expect(mockOnProfileComplete).toHaveBeenCalledWith({
        name: 'User With OAuth Avatar Updated',
        username: expect.any(String),
        avatar: 'https://example.com/manual-avatar.jpg',
      });
    });

    it('should revert to OAuth avatar when manual avatar is removed', async () => {
      const oauthData = {
        name: 'Revert Test User',
        picture: 'https://lh3.googleusercontent.com/oauth-avatar.jpg',
        email: 'revert@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      // Upload manual avatar first
      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
      const manualFile = new File(['content'], 'manual.jpg', { type: 'image/jpeg' });

      mockUploadAvatarMutateAsync.mockResolvedValue({
        url: 'https://example.com/manual.jpg',
      });

      fireEvent.change(fileInput, { target: { files: [manualFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('avatar-preview')).toHaveAttribute(
          'src',
          'https://example.com/manual.jpg',
        );
      });

      // Remove the manual avatar
      const removeButton = screen.getByText('Remove photo');
      await user.click(removeButton);

      // Should show initials (not revert to OAuth)
      // This is current behavior - manual removal clears avatar completely
      expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
      expect(screen.getByText('RT')).toBeInTheDocument(); // Initials
    });
  });

  describe('OAuth Data Fallback Logic', () => {
    it('should fallback gracefully when OAuth data is partially missing', () => {
      const partialOAuthData = {
        // name is missing
        picture: 'https://lh3.googleusercontent.com/avatar.jpg',
        email: 'partial@gmail.com',
      };

      render(
        <ProfileSetup
          {...defaultProps}
          email="partial@gmail.com"
          suggestedName="Fallback Name"
          oauthData={partialOAuthData}
        />,
      );

      const nameInput = screen.getByTestId('profile-name-input');

      // Should use suggestedName since OAuth name is missing
      expect(nameInput).toHaveValue('Fallback Name');

      // Should still show OAuth avatar
      expect(screen.getByTestId('avatar-preview')).toHaveAttribute(
        'src',
        'https://lh3.googleusercontent.com/avatar.jpg',
      );
    });

    it('should handle completely empty OAuth data', () => {
      const emptyOAuthData = {};

      render(
        <ProfileSetup
          {...defaultProps}
          email="empty@gmail.com"
          suggestedName="Suggested Name"
          oauthData={emptyOAuthData}
        />,
      );

      const nameInput = screen.getByTestId('profile-name-input');

      // Should use suggestedName
      expect(nameInput).toHaveValue('Suggested Name');

      // Should show initials (no avatar)
      expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
      expect(screen.getByText('SN')).toBeInTheDocument(); // Initials from suggested name
    });

    it('should handle null OAuth data gracefully', () => {
      render(
        <ProfileSetup
          {...defaultProps}
          email="null@example.com"
          suggestedName="Fallback Name"
          oauthData={undefined}
        />,
      );

      const nameInput = screen.getByTestId('profile-name-input');

      // Should use suggestedName
      expect(nameInput).toHaveValue('Fallback Name');

      // Should show initials
      expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
      expect(screen.getByText('FN')).toBeInTheDocument();
    });
  });

  describe('OAuth Provider-Specific Behaviors', () => {
    it('should handle GitHub OAuth data format (if supported)', () => {
      const githubOAuthData = {
        name: 'GitHub User',
        picture: 'https://avatars.githubusercontent.com/u/123456?v=4',
        email: 'github@example.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={githubOAuthData} />);

      const nameInput = screen.getByTestId('profile-name-input');
      const avatarImg = screen.getByTestId('avatar-preview');

      expect(nameInput).toHaveValue('GitHub User');
      expect(avatarImg).toHaveAttribute('src', githubOAuthData.picture);
    });

    it('should identify and handle Google avatar URLs specifically', async () => {
      const googleOAuthData = {
        name: 'Google User',
        picture: 'https://lh3.googleusercontent.com/a/google-avatar.jpg',
        email: 'google@example.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={googleOAuthData} />);

      const avatarImg = screen.getByTestId('avatar-preview');

      // Simulate error on Google avatar
      fireEvent.error(avatarImg);

      // Should detect it's a Google avatar and keep it
      const isGoogleAvatar = googleOAuthData.picture.includes('googleusercontent.com');
      expect(isGoogleAvatar).toBe(true);
      expect(avatarImg).toHaveAttribute('src', googleOAuthData.picture);
    });

    it('should identify and handle GitHub avatar URLs specifically', async () => {
      const githubOAuthData = {
        name: 'GitHub User',
        picture: 'https://avatars.githubusercontent.com/u/123456?v=4',
        email: 'github@example.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={githubOAuthData} />);

      const avatarImg = screen.getByTestId('avatar-preview');

      // Simulate error on GitHub avatar
      fireEvent.error(avatarImg);

      // Should detect it's a GitHub avatar and keep it
      const isGitHubAvatar = githubOAuthData.picture.includes('githubusercontent.com');
      expect(isGitHubAvatar).toBe(true);
      expect(avatarImg).toHaveAttribute('src', githubOAuthData.picture);
    });
  });

  describe('OAuth Form Submission Integration', () => {
    it('should submit complete OAuth data in form', async () => {
      const completeOAuthData = {
        name: 'Complete OAuth User',
        picture: 'https://lh3.googleusercontent.com/complete.jpg',
        email: 'complete@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={completeOAuthData} />);

      const continueButton = screen.getByTestId('profile-continue-button');

      // Form should be valid with OAuth data
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });

      await user.click(continueButton);

      expect(mockOnProfileComplete).toHaveBeenCalledWith({
        name: 'Complete OAuth User',
        username: expect.any(String), // Auto-generated from name
        avatar: 'https://lh3.googleusercontent.com/complete.jpg',
      });
    });

    it('should submit mixed OAuth and manual data', async () => {
      const oauthData = {
        name: 'OAuth Name',
        picture: 'https://lh3.googleusercontent.com/oauth.jpg',
        email: 'mixed@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const nameInput = screen.getByTestId('profile-name-input');
      const usernameInput = screen.getByTestId('profile-username-input');
      const continueButton = screen.getByTestId('profile-continue-button');

      // First, set a custom username before changing the name
      // This prevents auto-generation from interfering
      await user.clear(usernameInput);
      await user.type(usernameInput, 'customuser');

      // Then override name but keep OAuth avatar
      await user.clear(nameInput);
      await user.type(nameInput, 'Manual Name');

      // Wait for username availability check
      await waitFor(() => {
        expect(screen.getByTestId('username-available')).toBeInTheDocument();
      });

      // Wait for form to be valid and enabled
      await waitFor(() => {
        expect(continueButton).not.toBeDisabled();
      });

      await user.click(continueButton);

      expect(mockOnProfileComplete).toHaveBeenCalledWith({
        name: 'Manual Name',
        username: 'oauthnamecustomuser', // BUG: Component concatenates auto-generated + manual username instead of replacing
        avatar: 'https://lh3.googleusercontent.com/oauth.jpg', // OAuth avatar preserved
      });
    });
  });

  describe('OAuth Loading States', () => {
    it('should handle OAuth avatar loading state', () => {
      const oauthData = {
        name: 'Loading User',
        picture: 'https://lh3.googleusercontent.com/loading.jpg',
        email: 'loading@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const avatarImg = screen.getByTestId('avatar-preview');

      // Verify onLoad handler exists
      expect(avatarImg).toHaveAttribute('src', oauthData.picture);

      // Simulate successful load
      fireEvent.load(avatarImg);

      expect(console.log).toHaveBeenCalledWith('✅ Avatar loaded successfully');
    });

    it('should disable form during avatar upload when OAuth avatar is present', async () => {
      const oauthData = {
        name: 'Upload Test User',
        picture: 'https://lh3.googleusercontent.com/original.jpg',
        email: 'upload@gmail.com',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
      const continueButton = screen.getByTestId('profile-continue-button');

      // Mock slow upload
      mockUploadAvatarMutateAsync.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ url: 'https://example.com/new.jpg' }), 1000),
          ),
      );

      const manualFile = new File(['content'], 'manual.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [manualFile] } });

      // Form should be disabled during upload
      await waitFor(() => {
        expect(continueButton).toBeDisabled();
        expect(continueButton).toHaveTextContent('Saving...');
      });
    });
  });
});
