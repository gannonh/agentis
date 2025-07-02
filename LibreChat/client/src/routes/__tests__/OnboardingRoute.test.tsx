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
    expect(
      screen.queryByRole('heading', { name: 'Create Your Organization' }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.queryByRole('heading', { name: 'Create Your Organization' }),
    ).not.toBeInTheDocument();
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

    // Fill in organization name
    const orgNameInput = screen.getByLabelText('Organization Name');
    await user.type(orgNameInput, 'Test Organization');

    // Click continue button
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    // Wait for async submission
    await new Promise((resolve) => setTimeout(resolve, 600)); // Wait for simulated API call

    // Should show profile step heading
    expect(screen.getByRole('heading', { name: 'Complete Your Profile' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('should disable continue button when organization name is empty', async () => {
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

    // Button should be disabled when input is empty
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeDisabled();

    // Type something to enable button
    const orgNameInput = screen.getByLabelText('Organization Name');
    await user.type(orgNameInput, 'Test');
    expect(continueButton).not.toBeDisabled();

    // Clear input - button should be disabled again
    await user.clear(orgNameInput);
    expect(continueButton).toBeDisabled();
  });

  it('should show validation error when organization name is too short', async () => {
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

    // Enter a name that's too short
    const orgNameInput = screen.getByLabelText('Organization Name');
    await user.type(orgNameInput, 'A');

    // Submit the form
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    // Should show validation error
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Organization name must be at least 2 characters')).toBeInTheDocument();
  });

  it('should disable button when submitting and show loading state', async () => {
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

    // Fill in organization name
    const orgNameInput = screen.getByLabelText('Organization Name');
    await user.type(orgNameInput, 'Test Organization');

    // Click continue button
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    await user.click(continueButton);

    // Should show loading state
    expect(screen.getByRole('button', { name: 'Creating Organization...' })).toBeDisabled();
  });

  it('should handle form validation error states correctly', async () => {
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

    const orgNameInput = screen.getByLabelText('Organization Name');
    const continueButton = screen.getByRole('button', { name: 'Continue' });

    // Test that button is disabled when input is empty
    expect(continueButton).toBeDisabled();

    // Test with invalid input - this should trigger validation
    await user.type(orgNameInput, 'A'); // Too short
    expect(continueButton).not.toBeDisabled(); // Button should be enabled with input

    await user.click(continueButton);

    // Should show validation error
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Organization name must be at least 2 characters')).toBeInTheDocument();

    // Form should remain in error state until corrected
    expect(continueButton).not.toBeDisabled(); // Still enabled for retry
  });

  it('should respect maxLength attribute preventing input over 50 characters', async () => {
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

    const orgNameInput = screen.getByLabelText('Organization Name');

    // Verify the input has maxLength attribute
    expect(orgNameInput).toHaveAttribute('maxLength', '50');

    // Try to type more than 50 characters - should be truncated
    const longName = 'A'.repeat(60); // Try 60 characters
    await user.type(orgNameInput, longName);

    // Should only have 50 characters
    expect(orgNameInput).toHaveValue('A'.repeat(50));

    // The form validation logic should handle server-side validation for edge cases
    // where maxLength might be bypassed (e.g., programmatic input, copy-paste with JS disabled)

    // Button should be enabled with valid length input
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).not.toBeDisabled();
  });

  it('should handle button state correctly with whitespace input', async () => {
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

    const orgNameInput = screen.getByLabelText('Organization Name');
    const continueButton = screen.getByRole('button', { name: 'Continue' });

    // Initially button should be disabled
    expect(continueButton).toBeDisabled();

    // Test with only whitespace - button should be disabled due to trim() check
    await user.type(orgNameInput, '   ');
    expect(continueButton).toBeDisabled(); // Button disabled because trim() returns empty string

    // Test with single character plus whitespace - button should be enabled but form validation should catch it
    await user.clear(orgNameInput);
    await user.type(orgNameInput, '  A  ');
    expect(continueButton).not.toBeDisabled(); // Button enabled because there's non-whitespace content

    await user.click(continueButton);

    // Should show validation error for too short after trimming
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Organization name must be at least 2 characters')).toBeInTheDocument();

    // Test with valid name after trimming whitespace - should succeed
    await user.clear(orgNameInput);
    await user.type(orgNameInput, '  Valid Org  ');
    expect(continueButton).not.toBeDisabled();

    await user.click(continueButton);

    // Should proceed to next step (no error alert)
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Complete Your Profile' })).toBeInTheDocument();
  });

  it('should clear error state when input is corrected after validation error', async () => {
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

    const orgNameInput = screen.getByLabelText('Organization Name');
    const continueButton = screen.getByRole('button', { name: 'Continue' });

    // First, cause a validation error
    await user.type(orgNameInput, 'A'); // Too short
    await user.click(continueButton);

    // Should show error
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Organization name must be at least 2 characters')).toBeInTheDocument();

    // Now correct the input
    await user.clear(orgNameInput);
    await user.type(orgNameInput, 'Valid Organization');
    await user.click(continueButton);

    // Wait for submission
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Error should be cleared and we should proceed to next step
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Complete Your Profile' })).toBeInTheDocument();
  });
});
