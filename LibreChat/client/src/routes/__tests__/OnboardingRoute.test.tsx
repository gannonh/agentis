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

// Mock OrganizationDetectionStep component
vi.mock('~/components/Auth/OrganizationDetectionStep', () => ({
  default: ({ onNext }: any) => (
    <div data-testid="organization-detection-step">
      <button onClick={() => onNext({ action: 'create', organizationName: 'Test Org' })}>
        Mock Create Organization
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
    const createButton = screen.getByRole('button', { name: 'Mock Create Organization' });
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
    const createButton = screen.getByRole('button', { name: 'Mock Create Organization' });
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
    await user.click(screen.getByRole('button', { name: 'Mock Create Organization' }));

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
    await user.click(screen.getByRole('button', { name: 'Mock Create Organization' }));

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
    await user.click(screen.getByRole('button', { name: 'Mock Create Organization' }));

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
});
