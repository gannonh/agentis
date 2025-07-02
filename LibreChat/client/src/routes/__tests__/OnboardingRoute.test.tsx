/**
 * @fileoverview Tests for OnboardingRoute component
 * @module routes/OnboardingRoute.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authClient } from '~/config/betterAuth';
import OnboardingRoute from '../OnboardingRoute';

// Mock the authClient
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    useListOrganizations: vi.fn(),
  },
}));

// Mock hooks
vi.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
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

    expect(screen.getByText('com_ui_loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
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

    // Should not show onboarding content when not authenticated
    expect(screen.queryByText('Onboarding content will go here')).not.toBeInTheDocument();
    expect(screen.queryByText('com_ui_loading...')).not.toBeInTheDocument();
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

    // Should not show onboarding content when user has organizations
    expect(screen.queryByText('Onboarding content will go here')).not.toBeInTheDocument();
    expect(screen.queryByText('com_ui_loading...')).not.toBeInTheDocument();
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

    // Should show onboarding content (now showing organization form)
    expect(screen.getByRole('heading', { name: 'Create Your Organization' })).toBeInTheDocument();
    expect(screen.queryByText('com_ui_loading...')).not.toBeInTheDocument();
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

    // Should show progress bar
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
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

    // Should show organization step heading
    expect(screen.getByRole('heading', { name: 'Create Your Organization' })).toBeInTheDocument();
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

    // Should show organization form elements
    expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('should navigate to profile step when clicking continue on organization step', async () => {
    const user = userEvent.setup();
    
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

    // Click continue button
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    // Should show profile step heading
    expect(screen.getByRole('heading', { name: 'Complete Your Profile' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });
});