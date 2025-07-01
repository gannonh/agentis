/**
 * @fileoverview Tests for OnboardingRoute component
 * @module routes/OnboardingRoute.test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authClient } from '~/config/betterAuth';
import OnboardingRoute from '../OnboardingRoute';

// Mock the authClient
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    useListOrganizations: vi.fn(),
  },
}));

// Mock child components
vi.mock('../OnboardingSteps/OrganizationStep', () => ({
  default: () => <div data-testid="organization-step">Organization Step</div>,
}));

vi.mock('../OnboardingSteps/ProfileStep', () => ({
  default: () => <div data-testid="profile-step">Profile Step</div>,
}));

vi.mock('../OnboardingSteps/TeamStep', () => ({
  default: () => <div data-testid="team-step">Team Step</div>,
}));

vi.mock('../OnboardingSteps/WelcomeStep', () => ({
  default: () => <div data-testid="welcome-step">Welcome Step</div>,
}));

// Mock hooks
vi.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useMediaQuery: () => false,
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
      <RecoilRoot>
        <BrowserRouter>{children}</BrowserRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );

  return Wrapper;
};

const createMemoryWrapper = (initialEntries: string[] = ['/onboarding']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RecoilRoot>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </RecoilRoot>
    </QueryClientProvider>
  );

  return Wrapper;
};

describe('OnboardingRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authentication guard', () => {
    it('should redirect to login when user is not authenticated', async () => {
      // Mock no session
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      const Wrapper = createMemoryWrapper(['/onboarding']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Should show loading state while redirecting
      expect(screen.queryByText('Organization Step')).not.toBeInTheDocument();
    });

    it('should redirect to chat when user has organizations', async () => {
      // Mock authenticated user with organizations
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [{ id: '1', name: 'Test Org' }],
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      const Wrapper = createMemoryWrapper(['/onboarding']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Should not show onboarding content
      expect(screen.queryByText('Organization Step')).not.toBeInTheDocument();
    });

    it('should show loading state while checking authentication', async () => {
      // Mock loading session
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
        isPending: true,
        error: null,
        isLoading: true,
        isError: false,
        isSuccess: false,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: true,
        error: null,
        isLoading: true,
        isError: false,
        isSuccess: false,
      } as any);

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('step routing', () => {
    beforeEach(() => {
      // Mock authenticated user without organizations
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);
    });

    it('should render organization step by default', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('organization-step')).toBeInTheDocument();
      });
    });

    it('should render organization step when explicitly navigated to', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding/organization']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('organization-step')).toBeInTheDocument();
      });
    });

    it('should render profile step when navigated to', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding/profile']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('profile-step')).toBeInTheDocument();
      });
    });

    it('should render team step when navigated to', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding/team']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('team-step')).toBeInTheDocument();
      });
    });

    it('should render welcome step when navigated to', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding/welcome']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
      });
    });
  });

  describe('progress tracking', () => {
    beforeEach(() => {
      // Mock authenticated user without organizations
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);
    });

    it('should show progress indicator', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
    });

    it('should show current step in progress', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument();
      });
    });

    it('should update progress when navigating to different steps', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding/profile']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
      });
    });
  });

  describe('state persistence', () => {
    beforeEach(() => {
      // Mock authenticated user without organizations
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);
    });

    it('should persist state across route changes', async () => {
      // This test will verify that state is maintained when navigating between steps
      const Wrapper = createMemoryWrapper(['/onboarding']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('organization-step')).toBeInTheDocument();
      });

      // State persistence will be tested once implementation is complete
    });

    it('should restore state on page refresh', async () => {
      // This test will verify that state is restored from localStorage
      const Wrapper = createMemoryWrapper(['/onboarding/profile']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('profile-step')).toBeInTheDocument();
      });

      // State restoration will be tested once implementation is complete
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      // Mock authenticated user without organizations
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);
    });

    it('should handle invalid routes by redirecting to organization step', async () => {
      const Wrapper = createMemoryWrapper(['/onboarding/invalid']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('organization-step')).toBeInTheDocument();
      });
    });

    it('should allow navigation between steps', async () => {
      const user = userEvent.setup();
      const Wrapper = createMemoryWrapper(['/onboarding']);
      render(<OnboardingRoute />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByTestId('organization-step')).toBeInTheDocument();
      });

      // Navigation will be tested once step components are implemented
    });
  });

  describe('error handling', () => {
    it('should handle session errors gracefully', async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: null,
        isPending: false,
        error: new Error('Session error'),
        isLoading: false,
        isError: true,
        isSuccess: false,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Should handle error state gracefully
      expect(screen.queryByText('Organization Step')).not.toBeInTheDocument();
    });

    it('should handle organization loading errors gracefully', async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        isPending: false,
        error: null,
        isLoading: false,
        isError: false,
        isSuccess: true,
      } as any);

      vi.mocked(authClient.useListOrganizations).mockReturnValue({
        data: [],
        isPending: false,
        error: new Error('Organizations error'),
        isLoading: false,
        isError: true,
        isSuccess: false,
      } as any);

      const Wrapper = createWrapper();
      render(<OnboardingRoute />, { wrapper: Wrapper });

      // Should handle error state gracefully
      expect(screen.queryByText('Organization Step')).not.toBeInTheDocument();
    });
  });
});