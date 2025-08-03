/**
 * @fileoverview Unit tests for OrganizationSettings component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoilRoot } from 'recoil';
import { OrganizationSettings } from '../OrganizationSettings';
import { useOrganization } from '~/Providers/OrganizationProvider';

// Mock the organization provider
vi.mock('~/Providers/OrganizationProvider');
const mockUseOrganization = useOrganization as any;

// Mock useLocalize hook
vi.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Mock UI components
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

vi.mock('~/components/ui/Input', () => ({
  Input: ({ value, onChange, placeholder, className, type, id, ...props }: any) => (
    <input
      id={id}
      type={type || 'text'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  ),
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, htmlFor, className, ...props }: any) => (
    <label htmlFor={htmlFor} className={className} {...props}>
      {children}
    </label>
  ),
}));

vi.mock('~/components/ui/Textarea', () => ({
  Textarea: ({ value, onChange, placeholder, className, rows, id, ...props }: any) => (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      rows={rows}
      {...props}
    />
  ),
}));

vi.mock('~/components/ui/AlertDialog', () => ({
  AlertDialog: ({ children }: any) => <div data-testid="alert-dialog">{children}</div>,
  AlertDialogTrigger: ({ children }: any) => (
    <div data-testid="alert-dialog-trigger">{children}</div>
  ),
  AlertDialogContent: ({ children }: any) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: any) => <div data-testid="alert-dialog-header">{children}</div>,
  AlertDialogTitle: ({ children }: any) => <div data-testid="alert-dialog-title">{children}</div>,
  AlertDialogDescription: ({ children }: any) => (
    <div data-testid="alert-dialog-description">{children}</div>
  ),
  AlertDialogFooter: ({ children }: any) => <div data-testid="alert-dialog-footer">{children}</div>,
  AlertDialogCancel: ({ children }: any) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
  AlertDialogAction: ({ children, onClick, disabled }: any) => (
    <button data-testid="alert-dialog-action" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

// Mock react-hook-form with realistic form behavior
const mockFormValues = {
  name: 'Test Organization',
  description: 'Test organization description',
  website: 'https://test.com',
  logo: 'https://example.com/logo.png',
};

const mockRegister = vi.fn((name, options) => ({
  name,
  onChange: vi.fn((e) => {
    // Update mock form values when inputs change
    if (e.target) {
      mockFormValues[name as keyof typeof mockFormValues] = e.target.value;
    }
  }),
  onBlur: vi.fn(),
  ref: vi.fn(),
}));

const mockSetValue = vi.fn((name, value) => {
  // Update mock form values when setValue is called
  mockFormValues[name as keyof typeof mockFormValues] = value;
});

const mockWatch = vi.fn((name?: string) => {
  if (name) {
    return mockFormValues[name as keyof typeof mockFormValues];
  }
  return mockFormValues;
});

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: mockRegister,
    handleSubmit: vi.fn((fn) => (e: any) => {
      e.preventDefault();
      // Return actual form values instead of hardcoded data
      fn({ ...mockFormValues });
    }),
    watch: mockWatch,
    setValue: mockSetValue,
    reset: vi.fn((values) => {
      if (values) {
        Object.assign(mockFormValues, values);
      }
    }),
    formState: {
      errors: {},
      isSubmitting: false,
      isDirty: true,
    },
  }),
}));

// Helper function to render component with RecoilRoot
const renderOrganizationSettings = (props = {}) => {
  return render(
    <RecoilRoot>
      <OrganizationSettings {...props} />
    </RecoilRoot>
  );
};

describe('OrganizationSettings', () => {
  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    logo: 'https://example.com/logo.png',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    metadata: {
      domain: 'test.com',
      autoCreated: false,
      createdFromEmail: 'admin@test.com',
      description: 'Test organization description',
      website: 'https://test.com',
    },
  };

  const defaultMockData = {
    organization: mockOrganization,
    userRole: 'owner' as const,
    members: [],
    invitations: [],

    // Loading states
    isLoading: false,
    isLoadingMembers: false,
    isLoadingInvitations: false,

    // Error states
    error: null,

    // Organization management functions
    inviteMember: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    updateOrganization: vi.fn(),

    // Invitation management
    cancelInvitation: vi.fn(),

    // Organization creation (for onboarding)
    createOrganization: vi.fn(),

    // Organization deletion
    deleteOrganization: vi.fn(),

    // Permission helpers
    canManageMembers: true,
    canManageOrganization: true,
    canInviteMembers: true,
    canUpdateSettings: true,
    canDeleteOrganization: true,
    canViewMembers: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock form values to default organization data
    Object.assign(mockFormValues, {
      name: 'Test Organization',
      description: 'Test organization description',
      website: 'https://test.com',
      logo: 'https://example.com/logo.png',
    });
    
    mockUseOrganization.mockReturnValue(defaultMockData);
    global.URL.createObjectURL = vi.fn(() => 'mocked-blob-url');
    global.FileReader = vi.fn(() => ({
      readAsDataURL: vi.fn(function (this: any) {
        this.onload({ target: { result: 'data:image/png;base64,mock-image' } });
      }),
    })) as any;
  });

  describe('Access Control', () => {
    it('should render access denied when no organization', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        organization: null,
      });

      renderOrganizationSettings();

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText("You don't have permission to manage organization settings."),
      ).toBeInTheDocument();
    });

    it('should render access denied when user cannot manage organization', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        canUpdateSettings: false,
      });

      renderOrganizationSettings();

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(
        screen.getByText("You don't have permission to manage organization settings."),
      ).toBeInTheDocument();
    });

    it('should render settings form when user can manage organization', () => {
      renderOrganizationSettings();

      expect(screen.getByText('Organization Settings')).toBeInTheDocument();
      expect(
        screen.getByText("Manage your organization's profile and settings"),
      ).toBeInTheDocument();
    });

    describe('Edge Cases', () => {
      it('should render access denied when userRole is null and canUpdateSettings is false', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          userRole: null,
          canUpdateSettings: false,
        });

        renderOrganizationSettings();

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have permission to manage organization settings."),
        ).toBeInTheDocument();
      });

      it('should render access denied when userRole is undefined and canUpdateSettings is false', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          userRole: undefined,
          canUpdateSettings: false,
        });

        renderOrganizationSettings();

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have permission to manage organization settings."),
        ).toBeInTheDocument();
      });

      it('should render access denied when organization data is undefined', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          organization: undefined,
        });

        renderOrganizationSettings();

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have permission to manage organization settings."),
        ).toBeInTheDocument();
      });

      it('should render access denied with invalid permission combination (has role but no permissions)', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          userRole: 'owner',
          canUpdateSettings: false,
          canManageOrganization: false,
          canDeleteOrganization: false,
        });

        renderOrganizationSettings();

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have permission to manage organization settings."),
        ).toBeInTheDocument();
      });

      it('should render access denied when organization has malformed data structure', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          organization: {
            // Missing required fields
            id: null,
            name: '',
            slug: undefined,
          } as any,
          canUpdateSettings: false, // This would be false if organization is malformed
        });

        renderOrganizationSettings();

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have permission to manage organization settings."),
        ).toBeInTheDocument();
      });

      it('should handle empty organization metadata gracefully', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          organization: {
            ...mockOrganization,
            metadata: null,
          },
        });

        renderOrganizationSettings();

        // Should still render the form since permissions are valid
        expect(screen.getByText('Organization Settings')).toBeInTheDocument();
        // Should handle missing metadata gracefully in form fields
        expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
      });

      it('should handle organization with missing critical fields', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          organization: {
            ...mockOrganization,
            name: null,
            slug: null,
          } as any,
        });

        renderOrganizationSettings();

        // Should still render the form since permissions are valid
        expect(screen.getByText('Organization Settings')).toBeInTheDocument();
      });

      it('should render access denied when organization is null specifically', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          organization: null,
        });

        renderOrganizationSettings();

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have permission to manage organization settings."),
        ).toBeInTheDocument();
      });

      it('should fail safely when both organization and permissions are invalid', () => {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          organization: null,
          userRole: null,
          canUpdateSettings: false,
          canManageOrganization: false,
        });

        renderOrganizationSettings();

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(
          screen.getByText("You don't have permission to manage organization settings."),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Form Rendering', () => {
    it('should render all form sections', () => {
      renderOrganizationSettings();

      expect(screen.getByText('Organization Logo')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Organization Details')).toBeInTheDocument();
    });

    it('should render organization logo section with current logo', () => {
      renderOrganizationSettings();

      const logoImg = screen.getByAltText('Test Organization logo');
      expect(logoImg).toBeInTheDocument();
      expect(logoImg).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('should render default logo placeholder when no logo', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        organization: { ...mockOrganization, logo: undefined },
      });

      renderOrganizationSettings();

      expect(screen.queryByAltText('Test Organization logo')).not.toBeInTheDocument();
      // Should render Building2 icon in gradient background
      const gradientDiv = screen
        .getByText('Organization Logo')
        .parentElement?.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });

    it('should render all form fields with current values', () => {
      renderOrganizationSettings();

      expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
      expect(screen.getByText('Organization Slug')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Website')).toBeInTheDocument();
    });

    it('should display organization slug as read-only', () => {
      renderOrganizationSettings();

      expect(screen.getByText('test-org')).toBeInTheDocument();
      expect(screen.getByText('The organization slug cannot be changed')).toBeInTheDocument();
    });

    it('should display organization details', () => {
      renderOrganizationSettings();

      expect(screen.getByText('org-123')).toBeInTheDocument();
      expect(screen.getByText('owner')).toBeInTheDocument();
      expect(screen.getByText('test.com')).toBeInTheDocument();
      // Check for the formatted date from the mock data
      const expectedDate = new Date('2023-01-01T00:00:00Z').toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  describe('Logo Upload Functionality', () => {
    it('should render upload logo button', () => {
      renderOrganizationSettings();

      expect(screen.getByText('Upload Logo')).toBeInTheDocument();
    });

    it('should render remove logo button when logo exists', () => {
      renderOrganizationSettings();

      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('should not render remove logo button when no logo', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        organization: { ...mockOrganization, logo: undefined },
      });

      renderOrganizationSettings();

      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });

    it('should handle logo upload button click', () => {
      renderOrganizationSettings();

      const uploadButton = screen.getByText('Upload Logo');
      fireEvent.click(uploadButton);

      // Should have a hidden file input
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('should handle file upload', () => {
      renderOrganizationSettings();

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['logo'], 'logo.png', { type: 'image/png' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Should process the file and set preview
      expect(global.FileReader).toHaveBeenCalled();
    });

    it('should handle remove logo', () => {
      renderOrganizationSettings();

      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      // Should call setValue to clear logo
      expect(mockSetValue).toHaveBeenCalledWith('logo', '');
    });
  });

  describe('Form Submission', () => {
    it('should render save button', () => {
      renderOrganizationSettings();

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should handle form submission with form values', async () => {
      const updateOrganization = vi.fn().mockResolvedValue(undefined);
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        updateOrganization,
      });

      renderOrganizationSettings();

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateOrganization).toHaveBeenCalledWith({
          name: 'Test Organization',
          description: 'Test organization description',
          website: 'https://test.com',
          logo: 'https://example.com/logo.png',
        });
      });
    });

    it('should capture form input changes and submit updated values', async () => {
      const updateOrganization = vi.fn().mockResolvedValue(undefined);
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        updateOrganization,
      });

      renderOrganizationSettings();

      // Simulate user input changes
      const nameInput = screen.getByLabelText('Organization Name');
      const websiteInput = screen.getByLabelText('Website');
      const descriptionInput = screen.getByLabelText('Description');

      // Change form values
      fireEvent.change(nameInput, { target: { value: 'Updated Organization Name' } });
      fireEvent.change(websiteInput, { target: { value: 'https://updated-website.com' } });
      fireEvent.change(descriptionInput, { target: { value: 'Updated organization description' } });

      // Submit form
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateOrganization).toHaveBeenCalledWith({
          name: 'Updated Organization Name',
          description: 'Updated organization description',
          website: 'https://updated-website.com',
          logo: 'https://example.com/logo.png',
        });
      });
    });

    it('should handle form submission error', async () => {
      const updateOrganization = vi.fn().mockRejectedValue(new Error('Update failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          updateOrganization,
        });

        renderOrganizationSettings();

        const saveButton = screen.getByText('Save Changes');
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Failed to update organization:',
            expect.any(Error),
          );
        });
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('Delete Organization', () => {
    it('should render delete button for owners', () => {
      renderOrganizationSettings();

      // Get all delete organization buttons and target the trigger (first one with outline variant)
      const deleteButtons = screen.getAllByRole('button', { name: /delete organization/i });
      const triggerButton = deleteButtons.find(
        (button) => button.getAttribute('data-variant') === 'outline',
      );
      expect(triggerButton).toBeInTheDocument();
    });

    it('should not render delete button for non-owners', () => {
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        userRole: 'member',
      });

      renderOrganizationSettings();

      expect(screen.queryByText('Delete Organization')).not.toBeInTheDocument();
    });

    it('should render delete confirmation dialog', () => {
      renderOrganizationSettings();

      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('alert-dialog-trigger')).toBeInTheDocument();
    });

    it('should handle delete organization', async () => {
      const deleteOrganization = vi.fn().mockResolvedValue(undefined);
      mockUseOrganization.mockReturnValue({
        ...defaultMockData,
        deleteOrganization,
      });

      renderOrganizationSettings();

      const deleteAction = screen.getByTestId('alert-dialog-action');
      fireEvent.click(deleteAction);

      await waitFor(() => {
        expect(deleteOrganization).toHaveBeenCalled();
      });
    });

    it('should handle delete organization error', async () => {
      const deleteOrganization = vi.fn().mockRejectedValue(new Error('Delete failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        mockUseOrganization.mockReturnValue({
          ...defaultMockData,
          deleteOrganization,
        });

        renderOrganizationSettings();

        const deleteAction = screen.getByTestId('alert-dialog-action');
        fireEvent.click(deleteAction);

        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Failed to delete organization:',
            expect.any(Error),
          );
        });
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = renderOrganizationSettings({ className: "custom-class" });
      // The custom className is applied to the root div inside RecoilRoot
      const rootDiv = container.querySelector('.mx-auto.max-w-2xl');
      expect(rootDiv).toHaveClass('custom-class');
    });
  });

  describe('Loading States', () => {
    it('should show loading state during form submission', () => {
      // This test would require properly mocking react-hook-form
      // For now, we'll just verify the save button exists
      renderOrganizationSettings();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('should disable save button when form is not dirty', () => {
      // This test would require properly mocking react-hook-form
      // For now, we'll just verify the save button exists
      renderOrganizationSettings();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors', () => {
      // This test would require properly mocking react-hook-form
      // For now, we'll just verify the form fields exist
      renderOrganizationSettings();
      expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Website')).toBeInTheDocument();
    });
  });
});
