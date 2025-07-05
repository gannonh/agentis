/**
 * @fileoverview Tests for OnboardingRoute component
 * @module routes/OnboardingRoute.test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authClient } from '~/config/betterAuth';
import OnboardingRoute from '../OnboardingRoute';

const mockNavigate = vi.fn();

// Mock the authClient
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    useListOrganizations: vi.fn(),
    organization: {
      create: vi.fn(),
      setActive: vi.fn(),
      acceptInvitation: vi.fn(),
    },
    updateUser: vi.fn(),
  },
  authUtils: {
    getEmailDomain: (email: string) => email.split('@')[1]?.toLowerCase() || '',
  },
}));

// Mock hooks
vi.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-testid="navigate" data-to={to} data-replace={String(replace)} />
    ),
    useNavigate: () => mockNavigate,
  };
});

// Variable to control mock organization action for flexible testing
let mockOrganizationAction: {
  action: 'create' | 'skip' | 'invite';
  organizationName?: string;
  organizationId?: string;
  enableDomainJoin?: boolean;
} = { action: 'create', organizationName: 'Test Org' };

// Mock OrganizationDetectionStep component
vi.mock('~/components/Auth/OrganizationDetectionStep', () => ({
  default: ({ onNext }: any) => (
    <div data-testid="organization-detection-step">
      <button onClick={() => onNext(mockOrganizationAction)}>
        Mock {mockOrganizationAction.action} Organization
      </button>
    </div>
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

describe('OnboardingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock organization action to default 'create' behavior
    mockOrganizationAction = { action: 'create', organizationName: 'Test Org' };
  });

  it('should render loading state while checking authentication', () => {
    // Mock loading session
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: true,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: true,
    } as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Checking your account...')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', () => {
    // Mock no session
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Should redirect to login instead
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
  });

  it('should redirect to chat when user has organizations', () => {
    // Mock authenticated user with organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [{ id: '1', name: 'Test Org' }],
      isPending: false,
    } as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Should redirect to chat instead
    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/c/new');
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
  });

  it('should show onboarding content when user is authenticated but has no organizations', () => {
    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Should show onboarding content - the title has a line break so we need to check differently
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "What's the name of yourcompany or team?",
    );
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('should show progress bar with current step information', () => {
    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Should show step progress
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('should display the current step name in the heading', () => {
    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Should show organization step heading - check the heading element
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent("What's the name of yourcompany or team?");
  });

  it('should render organization step content when on organization step', () => {
    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Should show organization detection step component
    expect(screen.getByTestId('organization-detection-step')).toBeInTheDocument();
  });

  it('should navigate to profile step when organization is created', async () => {
    const user = userEvent.setup();

    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    // Mock organization API calls
    vi.mocked(authClient.organization.create).mockResolvedValue({
      data: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
    } as any);
    vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Click the mock create organization button
    const createButton = screen.getByRole('button', { name: 'Mock create Organization' });
    await user.click(createButton);

    // Wait for profile step to appear
    await waitFor(() => {
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    });
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('should show profile form when on profile step', async () => {
    const user = userEvent.setup();

    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    // Mock organization API calls
    vi.mocked(authClient.organization.create).mockResolvedValue({
      data: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
    } as any);
    vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Navigate to profile step
    const createButton = screen.getByRole('button', { name: 'Mock create Organization' });
    await user.click(createButton);

    // Wait for profile form to appear
    await waitFor(() => {
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('should validate profile name in profile step', async () => {
    const user = userEvent.setup();

    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    // Mock organization API calls
    vi.mocked(authClient.organization.create).mockResolvedValue({
      data: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
    } as any);
    vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Navigate to profile step
    await user.click(screen.getByRole('button', { name: 'Mock create Organization' }));

    // Wait for profile step
    await waitFor(() => {
      expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    });

    // Try to submit without filling name
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    // Should still be on profile step - validation prevents progress
    // The submit should not proceed without a name, but no error is actually shown
    // Just verify we're still on the same step
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
  });

  it('should show loading state when submitting forms', async () => {
    const user = userEvent.setup();

    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    // Mock organization API calls
    vi.mocked(authClient.organization.create).mockResolvedValue({
      data: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
    } as any);
    vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);

    // Mock updateUser to be slow so we can catch the loading state
    vi.mocked(authClient.updateUser).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Navigate to profile step
    await user.click(screen.getByRole('button', { name: 'Mock create Organization' }));

    // Wait for profile step
    await waitFor(() => {
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
    });

    // Fill profile name
    const nameInput = screen.getByLabelText('Your Name');
    await user.type(nameInput, 'John Doe');

    // Click continue button to trigger loading state
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    // Should briefly show loading state
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });

  it('should navigate through all onboarding steps', async () => {
    const user = userEvent.setup();

    // Mock authenticated user without organizations
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com', name: 'Test User' } },
      isPending: false,
    } as any);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [],
      isPending: false,
    } as any);

    // Mock API calls
    vi.mocked(authClient.organization.create).mockResolvedValue({
      data: { id: 'org-123', name: 'Test Org', slug: 'test-org' },
    } as any);
    vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);
    vi.mocked(authClient.updateUser).mockResolvedValue({} as any);

    const Wrapper = createWrapper();
    render(<OnboardingRoute />, { wrapper: Wrapper });

    // Step 1: Organization
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mock create Organization' }));

    // Wait for Step 2: Profile
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });
    const nameInput = screen.getByLabelText('Your Name');
    await user.type(nameInput, 'John Doe');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // Wait for Step 3: Team
    await waitFor(() => {
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Skip for Now' }));

    // Step 4: Welcome
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    expect(screen.getByText('🎉 Congratulations! Your workspace is ready.')).toBeInTheDocument();

    // Click finish button
    await user.click(screen.getByRole('button', { name: /start your first conversation/i }));

    // Should navigate to chat
    expect(mockNavigate).toHaveBeenCalledWith('/c/new');
  });

  describe('Organization Detection Scenarios', () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    const mockSession = { data: { user: mockUser }, isPending: false };
    const mockOrganizations = { data: [], isPending: false };

    // Helper function to set up mock organization action for testing different scenarios
    const setMockAction = (action: typeof mockOrganizationAction) => {
      mockOrganizationAction = action;
    };

    beforeEach(() => {
      vi.mocked(authClient.useSession).mockReturnValue(mockSession as any);
      vi.mocked(authClient.useListOrganizations).mockReturnValue(mockOrganizations as any);
    });

    it('should handle skip organization action', async () => {
      const user = userEvent.setup();

      // Set mock to trigger 'skip' action
      setMockAction({
        action: 'skip',
        organizationName: 'Personal workspace',
      });

      // Mock organization API calls
      vi.mocked(authClient.organization.create).mockResolvedValue({
        data: { id: 'personal-123', name: 'Personal workspace', slug: 'personal-workspace' },
      } as any);
      vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Click the mock skip organization button
      const skipButton = screen.getByRole('button', { name: 'Mock skip Organization' });
      await user.click(skipButton);

      // Wait for profile step to appear
      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      // Verify organization.create was called with personal workspace
      expect(vi.mocked(authClient.organization.create)).toHaveBeenCalledWith({
        name: 'Personal workspace',
        slug: 'personal-1',
      });
    });

    it('should handle invite acceptance action', async () => {
      const user = userEvent.setup();

      // Set mock to trigger 'invite' action
      setMockAction({
        action: 'invite',
        organizationId: 'invited-org-123',
      });

      // Mock organization API calls
      vi.mocked(authClient.organization.acceptInvitation).mockResolvedValue({} as any);
      vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);

      // Mock URL search params for invitation token
      Object.defineProperty(window, 'location', {
        value: {
          search: '?invite=invitation-token-123',
        },
        writable: true,
      });

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Click the mock invite organization button
      const inviteButton = screen.getByRole('button', { name: 'Mock invite Organization' });
      await user.click(inviteButton);

      // Wait for profile step to appear
      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      // Verify acceptInvitation was called
      expect(vi.mocked(authClient.organization.acceptInvitation)).toHaveBeenCalledWith({
        invitationId: 'invitation-token-123',
      });
      // Verify setActive was called with invited organization
      expect(vi.mocked(authClient.organization.setActive)).toHaveBeenCalledWith({
        organizationId: 'invited-org-123',
      });
    });

    it('should handle create organization action with domain join enabled', async () => {
      const user = userEvent.setup();

      // Set mock to trigger 'create' action with domain join
      setMockAction({
        action: 'create',
        organizationName: 'Acme Corp',
        enableDomainJoin: true,
      });

      // Mock organization API calls
      vi.mocked(authClient.organization.create).mockResolvedValue({
        data: { id: 'acme-123', name: 'Acme Corp', slug: 'acme-corp' },
      } as any);
      vi.mocked(authClient.organization.setActive).mockResolvedValue({} as any);

      // Mock fetch for domain join endpoint
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as any);

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Click the mock create organization button
      const createButton = screen.getByRole('button', { name: 'Mock create Organization' });
      await user.click(createButton);

      // Wait for profile step to appear
      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      // Verify organization.create was called
      expect(vi.mocked(authClient.organization.create)).toHaveBeenCalledWith({
        name: 'Acme Corp',
        slug: 'acme-corp',
      });

      // Verify domain join endpoint was called
      expect(global.fetch).toHaveBeenCalledWith('/api/organization/enable-domain-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: 'acme-123',
          domain: 'example.com',
        }),
      });
    });

    it('should handle organization action errors gracefully', async () => {
      const user = userEvent.setup();

      // Set mock to trigger 'create' action
      setMockAction({
        action: 'create',
        organizationName: 'Failed Org',
      });

      // Mock organization API to throw error
      vi.mocked(authClient.organization.create).mockRejectedValue(
        new Error('Failed to create organization'),
      );

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Click the mock create organization button
      const createButton = screen.getByRole('button', { name: 'Mock create Organization' });
      await user.click(createButton);

      // Should stay on organization step and show error (implementation detail)
      // The exact error handling depends on the component implementation
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('should handle missing invitation token gracefully', async () => {
      const user = userEvent.setup();

      // Set mock to trigger 'invite' action but without invitation token in URL
      setMockAction({
        action: 'invite',
        organizationId: 'invited-org-123',
      });

      // Clear search params
      Object.defineProperty(window, 'location', {
        value: {
          search: '',
        },
        writable: true,
      });

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Click the mock invite organization button
      const inviteButton = screen.getByRole('button', { name: 'Mock invite Organization' });
      await user.click(inviteButton);

      // Should progress to next step even without token (graceful handling)
      await waitFor(() => {
        expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
      });

      // acceptInvitation should not be called without token
      expect(vi.mocked(authClient.organization.acceptInvitation)).not.toHaveBeenCalled();
    });
  });
});
