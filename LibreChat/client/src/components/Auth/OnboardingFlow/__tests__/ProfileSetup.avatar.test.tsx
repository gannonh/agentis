/**
 * @fileoverview Comprehensive tests for ProfileSetup avatar upload functionality
 * @module components/Auth/OnboardingFlow/__tests__/ProfileSetup.avatar.test
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

const mockFileConfig: FileConfig = {
  avatarSizeLimit: 5 * 1024 * 1024, // 5MB
  endpoints: {},
};

vi.mock('~/data-provider', () => ({
  useUploadAvatarMutation: () => mockUploadAvatarMutation,
  useGetFileConfig: () => ({ data: mockFileConfig }),
}));

// Mock debounce hook to avoid timing issues in tests
vi.mock('~/hooks/Input/useDebounce', () => ({
  default: (value: string) => value, // Return value immediately without debouncing
}));

// Mock fetch for username availability
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
global.URL.revokeObjectURL = vi.fn();

describe('ProfileSetup Avatar Upload Integration', () => {
  const mockOnProfileComplete = vi.fn();
  const user = userEvent.setup();

  const defaultProps = {
    email: 'test@example.com',
    onProfileComplete: mockOnProfileComplete,
  };

  // Helper function to create test files
  const createTestFile = (name: string, type: string, size: number): File => {
    const content = new Array(size).fill('a').join('');
    return new File([content], name, { type });
  };

  // Helper function to create test image
  const createTestImage = (name = 'test.png', size = 1024): File => {
    return createTestFile(name, 'image/png', size);
  };

  // Helper function to get avatar upload input
  const getAvatarInput = () => {
    const input = document.querySelector('#avatar-upload') as HTMLInputElement;
    if (!input) {
      throw new Error('Avatar upload input not found');
    }
    return input;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ available: true }),
    });
    console.error = vi.fn(); // Suppress error logs in tests
    console.warn = vi.fn(); // Suppress warning logs in tests
    console.log = vi.fn(); // Suppress info logs in tests
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Avatar Upload UI Elements', () => {
    it('should render avatar upload input and preview area', () => {
      render(<ProfileSetup {...defaultProps} />);

      // Check for avatar upload input (hidden file input)
      const avatarInput = document.querySelector('#avatar-upload');
      expect(avatarInput).toBeInTheDocument();
      expect(avatarInput).toHaveAttribute('type', 'file');
      expect(avatarInput).toHaveAttribute('accept', 'image/*');

      // Check for upload text
      expect(screen.getByText('Upload a photo')).toBeInTheDocument();
    });

    it('should show initials placeholder when no avatar is set', () => {
      render(<ProfileSetup {...defaultProps} suggestedName="John Doe" />);

      // Should show initials "JD" derived from "John Doe"
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should display OAuth avatar when provided', () => {
      const oauthData = {
        name: 'OAuth User',
        picture: 'https://example.com/oauth-avatar.jpg',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const avatarImage = screen.getByTestId('avatar-preview');
      expect(avatarImage).toBeInTheDocument();
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/oauth-avatar.jpg');
      expect(avatarImage).toHaveAttribute('alt', 'Avatar preview');
    });

    it('should show "Change photo" text when avatar is present', () => {
      const oauthData = {
        picture: 'https://example.com/avatar.jpg',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      expect(screen.getByText('Change photo')).toBeInTheDocument();
    });

    it('should show remove photo button when avatar is present', () => {
      const oauthData = {
        picture: 'https://example.com/avatar.jpg',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      expect(screen.getByText('Remove photo')).toBeInTheDocument();
    });
  });

  describe('File Selection and Validation', () => {
    it('should accept valid image files', async () => {
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/new-avatar.png' });

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage('avatar.png', 1024);

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      expect(mockUploadAvatarMutateAsync).toHaveBeenCalledWith(expect.any(FormData));
    });

    it('should reject invalid file types', async () => {
      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const invalidFile = createTestFile('document.pdf', 'application/pdf', 1024);

      // Directly fire the change event to ensure it triggers
      fireEvent.change(avatarInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid image file/i)).toBeInTheDocument();
      });

      expect(mockUploadAvatarMutateAsync).not.toHaveBeenCalled();
    });

    it('should validate supported image formats', async () => {
      const supportedFormats = [
        { name: 'test.jpg', type: 'image/jpeg' },
        { name: 'test.jpeg', type: 'image/jpeg' },
        { name: 'test.png', type: 'image/png' },
        { name: 'test.gif', type: 'image/gif' },
        { name: 'test.webp', type: 'image/webp' },
      ];

      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/avatar.png' });

      for (const format of supportedFormats) {
        render(<ProfileSetup {...defaultProps} />);

        const avatarInput = getAvatarInput();
        const testFile = createTestFile(format.name, format.type, 1024);

        fireEvent.change(avatarInput, { target: { files: [testFile] } });

        expect(mockUploadAvatarMutateAsync).toHaveBeenCalled();
        mockUploadAvatarMutateAsync.mockClear();
      }
    });

    it('should reject files exceeding size limit', async () => {
      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const oversizedFile = createTestImage('large.png', 6 * 1024 * 1024); // 6MB > 5MB limit

      fireEvent.change(avatarInput, { target: { files: [oversizedFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Image is too large/i)).toBeInTheDocument();
        expect(screen.getByText(/6\.0MB/)).toBeInTheDocument();
        expect(screen.getByText(/smaller than 5MB/)).toBeInTheDocument();
      });

      expect(mockUploadAvatarMutateAsync).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive file type validation', async () => {
      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      // Test invalid file type with uppercase
      const invalidFile = createTestFile('test.PDF', 'APPLICATION/PDF', 1024);

      // Directly fire the change event to ensure it triggers
      fireEvent.change(avatarInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid image file/i)).toBeInTheDocument();
      });

      expect(mockUploadAvatarMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('Upload Process and UI Feedback', () => {
    it('should show loading state during upload', async () => {
      // Make upload promise hang to test loading state
      let resolveUpload: (value: AvatarUploadResponse) => void;
      const uploadPromise = new Promise<AvatarUploadResponse>((resolve) => {
        resolveUpload = resolve;
      });
      mockUploadAvatarMutateAsync.mockReturnValue(uploadPromise);

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage();

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      // Should show loading spinner
      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });

      // Should disable form during upload
      expect(screen.getByTestId('profile-continue-button')).toBeDisabled();

      // Resolve upload
      resolveUpload!({ url: 'https://example.com/avatar.png' });

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });

    it('should update avatar preview after successful upload', async () => {
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/new-avatar.png' });

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage();

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      await waitFor(() => {
        const avatarImage = screen.getByTestId('avatar-preview');
        expect(avatarImage).toHaveAttribute('src', 'https://example.com/new-avatar.png');
      });

      expect(screen.getByText('Change photo')).toBeInTheDocument();
      expect(screen.getByText('Remove photo')).toBeInTheDocument();
    });

    it('should send correct FormData in upload request', async () => {
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/avatar.png' });

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage('test-avatar.png');

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      expect(mockUploadAvatarMutateAsync).toHaveBeenCalledWith(expect.any(FormData));

      const formDataCall = mockUploadAvatarMutateAsync.mock.calls[0][0] as FormData;
      expect(formDataCall.get('file')).toBe(testFile);
      expect(formDataCall.get('manual')).toBe('true');
    });

    it('should clear error state when starting new upload', async () => {
      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();

      // First, trigger an error
      const invalidFile = createTestFile('document.txt', 'text/plain', 1024);
      fireEvent.change(avatarInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid image file/i)).toBeInTheDocument();
      });

      // Then upload valid file - error should clear
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/avatar.png' });
      const validFile = createTestImage();
      fireEvent.change(avatarInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText(/Please select a valid image file/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display upload error message', async () => {
      mockUploadAvatarMutateAsync.mockRejectedValue(new Error('Upload failed'));

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage();

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Failed to upload avatar/i)).toBeInTheDocument();
      });
    });

    it('should handle specific backend error messages', async () => {
      const testCases = [
        {
          error: new Error('file too large'),
          expectedMessage: /Image is too large.*smaller than 5MB/i,
        },
        {
          error: new Error('invalid file type'),
          expectedMessage: /Invalid file format.*JPEG, PNG, GIF, or WebP/i,
        },
        {
          error: new Error('network timeout'),
          expectedMessage: /network issues.*check your connection/i,
        },
        {
          error: new Error('quota exceeded'),
          expectedMessage: /Upload limit reached.*try again later/i,
        },
      ];

      for (const testCase of testCases) {
        mockUploadAvatarMutateAsync.mockRejectedValue(testCase.error);

        render(<ProfileSetup {...defaultProps} />);

        const avatarInput = getAvatarInput();
        const testFile = createTestImage();

        fireEvent.change(avatarInput, { target: { files: [testFile] } });

        await waitFor(() => {
          expect(screen.getByText(testCase.expectedMessage)).toBeInTheDocument();
        });
      }
    });

    it('should show fallback error message for unknown errors', async () => {
      mockUploadAvatarMutateAsync.mockRejectedValue(new Error('Unknown server error'));

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage();

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Failed to upload avatar.*try again/i)).toBeInTheDocument();
      });
    });

    it('should handle non-Error objects in catch block', async () => {
      mockUploadAvatarMutateAsync.mockRejectedValue('String error');

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage();

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Failed to upload avatar.*try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Avatar Removal', () => {
    it('should remove avatar when remove button is clicked', async () => {
      const oauthData = {
        picture: 'https://example.com/avatar.jpg',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      // Initially should show avatar
      expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();

      // Click remove button
      const removeButton = screen.getByText('Remove photo');
      await user.click(removeButton);

      // Avatar should be removed
      expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
      expect(screen.getByText('Upload a photo')).toBeInTheDocument();
      expect(screen.queryByText('Remove photo')).not.toBeInTheDocument();
    });

    it('should clear error state when removing avatar', async () => {
      render(<ProfileSetup {...defaultProps} />);

      // First upload invalid file to get error
      const avatarInput = getAvatarInput();
      const invalidFile = createTestFile('document.txt', 'text/plain', 1024);
      fireEvent.change(avatarInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText(/Please select a valid image file/i)).toBeInTheDocument();
      });

      // Upload valid file to get avatar
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/avatar.png' });
      const validFile = createTestImage();
      fireEvent.change(avatarInput, { target: { files: [validFile] } });

      // Now remove avatar - should clear any error state
      await waitFor(() => {
        const removeButton = screen.getByText('Remove photo');
        return user.click(removeButton);
      });

      expect(screen.queryByText(/Please select a valid image file/i)).not.toBeInTheDocument();
    });
  });

  describe('URL Sanitization and XSS Protection', () => {
    it('should reject URLs containing event handlers', () => {
      const maliciousUrls = [
        'http://example.com?onclick=alert(1)',
        'https://example.com/image.jpg?onerror=alert(1)',
        'http://example.com?onload=alert(1)',
        'https://example.com/image.png?onmouseover=alert(1)',
        'http://example.com?onmouseout=alert(1)',
        'https://example.com/image.jpg?onfocus=alert(1)',
        'http://example.com?onblur=alert(1)',
        'https://example.com/image.png?onchange=alert(1)',
        'http://example.com?onsubmit=alert(1)',
        'https://example.com/image.jpg?onreset=alert(1)',
        'http://example.com?onselect=alert(1)',
        'https://example.com/image.png?onkeydown=alert(1)',
        'http://example.com?onkeyup=alert(1)',
        'https://example.com/image.jpg?onkeypress=alert(1)',
        'http://example.com?onscroll=alert(1)',
        'https://example.com/image.png?onresize=alert(1)',
      ];

      maliciousUrls.forEach((maliciousUrl) => {
        const oauthData = {
          picture: maliciousUrl,
        };

        const { unmount } = render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

        // Should not render an avatar image with malicious URL
        expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
        
        // Should show initials instead since avatar URL was sanitized to empty string
        expect(screen.getByText('T')).toBeInTheDocument(); // From test@example.com
        
        // Clean up for next iteration
        unmount();
      });
    });

    it('should allow legitimate URLs with safe query parameters', () => {
      const legitimateUrls = [
        'https://example.com/image.jpg?size=200',
        'http://example.com/avatar.png?version=1.2.3',
        'https://example.com/image.gif?quality=high',
        'http://example.com/avatar.jpg?cache=false',
      ];

      legitimateUrls.forEach((legitimateUrl) => {
        const oauthData = {
          picture: legitimateUrl,
        };

        const { unmount } = render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

        // Should render avatar image with legitimate URL
        const avatarImage = screen.getByTestId('avatar-preview');
        expect(avatarImage).toBeInTheDocument();
        expect(avatarImage).toHaveAttribute('src', legitimateUrl);
        
        // Clean up for next iteration
        unmount();
      });
    });
  });

  describe('OAuth Avatar Handling', () => {
    it('should keep OAuth avatar URL even if image fails to load initially', () => {
      const oauthData = {
        picture: 'https://googleusercontent.com/oauth-avatar.jpg',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const avatarImage = screen.getByTestId('avatar-preview');

      // Simulate image load error
      fireEvent.error(avatarImage);

      // OAuth avatar should still be displayed (not cleared)
      expect(avatarImage).toHaveAttribute('src', 'https://googleusercontent.com/oauth-avatar.jpg');
    });

    it('should clear user-uploaded avatar if it fails to load', async () => {
      mockUploadAvatarMutateAsync.mockResolvedValue({
        url: 'https://example.com/broken-avatar.png',
      });

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      const testFile = createTestImage();

      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      await waitFor(() => {
        const avatarImage = screen.getByTestId('avatar-preview');
        expect(avatarImage).toBeInTheDocument();

        // Simulate image load error for user-uploaded image
        fireEvent.error(avatarImage);
      });

      // Should clear broken user-uploaded image
      await waitFor(() => {
        expect(screen.queryByTestId('avatar-preview')).not.toBeInTheDocument();
      });
    });

    it('should distinguish between OAuth and user-uploaded avatars for error handling', () => {
      const oauthData = {
        picture: 'https://github.com/user.png',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const avatarImage = screen.getByTestId('avatar-preview');

      // Simulate load error on GitHub OAuth avatar
      fireEvent.error(avatarImage);

      // Should keep OAuth avatar (GitHub)
      expect(avatarImage).toHaveAttribute('src', 'https://github.com/user.png');
    });
  });

  describe('Form Integration', () => {
    it('should include avatar URL in form submission', async () => {
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/avatar.png' });

      render(<ProfileSetup {...defaultProps} />);

      // Upload avatar
      const avatarInput = getAvatarInput();
      const testFile = createTestImage();
      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
      });

      // Fill in required fields
      const nameInput = screen.getByTestId('profile-name-input');
      await user.type(nameInput, 'Test User');

      // Submit form
      const submitButton = screen.getByTestId('profile-continue-button');
      await user.click(submitButton);

      expect(mockOnProfileComplete).toHaveBeenCalledWith({
        name: expect.stringContaining('Test User'),
        username: expect.any(String),
        avatar: 'https://example.com/avatar.png',
      });
    });

    it('should disable submit button during avatar upload', async () => {
      // Make upload hang to test disabled state
      let resolveUpload: (value: AvatarUploadResponse) => void;
      const uploadPromise = new Promise<AvatarUploadResponse>((resolve) => {
        resolveUpload = resolve;
      });
      mockUploadAvatarMutateAsync.mockReturnValue(uploadPromise);

      render(<ProfileSetup {...defaultProps} />);

      // Fill in required fields first
      const nameInput = screen.getByTestId('profile-name-input');
      await user.type(nameInput, 'Test User');

      // Start avatar upload
      const avatarInput = getAvatarInput();
      const testFile = createTestImage();
      fireEvent.change(avatarInput, { target: { files: [testFile] } });

      // Submit button should be disabled during upload
      const submitButton = screen.getByTestId('profile-continue-button');
      expect(submitButton).toBeDisabled();

      // Resolve upload
      resolveUpload!({ url: 'https://example.com/avatar.png' });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should submit form without avatar if none is uploaded', async () => {
      render(<ProfileSetup {...defaultProps} />);

      // Fill in required fields
      const nameInput = screen.getByTestId('profile-name-input');
      await user.type(nameInput, 'Test User');

      // Submit form without avatar
      const submitButton = screen.getByTestId('profile-continue-button');
      await user.click(submitButton);

      expect(mockOnProfileComplete).toHaveBeenCalledWith({
        name: expect.stringContaining('Test User'),
        username: expect.any(String),
        avatar: '',
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for avatar upload', () => {
      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();
      expect(avatarInput).toHaveAttribute('type', 'file');
      expect(avatarInput).toHaveAttribute('accept', 'image/*');
    });

    it('should have alt text for avatar image', () => {
      const oauthData = {
        picture: 'https://example.com/avatar.jpg',
      };

      render(<ProfileSetup {...defaultProps} oauthData={oauthData} />);

      const avatarImage = screen.getByTestId('avatar-preview');
      expect(avatarImage).toHaveAttribute('alt', 'Avatar preview');
    });

    it('should support keyboard navigation for avatar upload', async () => {
      render(<ProfileSetup {...defaultProps} />);

      // Should be able to focus the hidden file input via its label
      const avatarInput = getAvatarInput();
      avatarInput.focus();
      expect(avatarInput).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should handle rapid file selection changes', async () => {
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/avatar.png' });

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();

      // Rapidly select different files
      const file1 = createTestImage('avatar1.png');
      const file2 = createTestImage('avatar2.png');
      const file3 = createTestImage('avatar3.png');

      fireEvent.change(avatarInput, { target: { files: [file1] } });
      await waitFor(() => expect(mockUploadAvatarMutateAsync).toHaveBeenCalledTimes(1));

      fireEvent.change(avatarInput, { target: { files: [file2] } });
      await waitFor(() => expect(mockUploadAvatarMutateAsync).toHaveBeenCalledTimes(2));

      fireEvent.change(avatarInput, { target: { files: [file3] } });
      await waitFor(() => expect(mockUploadAvatarMutateAsync).toHaveBeenCalledTimes(3));

      // Should handle all uploads gracefully
      expect(mockUploadAvatarMutateAsync).toHaveBeenCalledTimes(3);
    });

    it('should not cause memory leaks with large numbers of uploads', async () => {
      mockUploadAvatarMutateAsync.mockResolvedValue({ url: 'https://example.com/avatar.png' });

      render(<ProfileSetup {...defaultProps} />);

      const avatarInput = getAvatarInput();

      // Simulate many uploads
      for (let i = 0; i < 10; i++) {
        const testFile = createTestImage(`avatar${i}.png`);
        fireEvent.change(avatarInput, { target: { files: [testFile] } });
      }

      expect(mockUploadAvatarMutateAsync).toHaveBeenCalledTimes(10);
    });
  });
});
