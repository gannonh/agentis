/**
 * @fileoverview Tests for useOnboardingState hook
 * @module hooks/useOnboardingState.test
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOnboardingState, OnboardingStep } from '../useOnboardingState';

// Mock the Better Auth client
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
    updateUser: vi.fn(),
  },
}));

// Mock React Router's useSearchParams hook
vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
}));

const mockUseSession = vi.fn();
const mockUpdateUser = vi.fn();
const mockRefetchSession = vi.fn();

// Mock fetch for API calls
const mockFetch = vi.fn();

// Import the mocked modules to get typed access
const { authClient } = await import('~/config/betterAuth');
const { useSearchParams } = await import('react-router-dom');
(authClient.useSession as any).mockImplementation(() => mockUseSession());
(authClient.updateUser as any).mockImplementation(mockUpdateUser);
const mockUseSearchParams = useSearchParams as any;

describe('useOnboardingState', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock global fetch
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Reset URL search params - return empty URLSearchParams by default
    mockUseSearchParams.mockReturnValue([new URLSearchParams()]);

    // Default mock - user with no onboarding step
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      refetch: mockRefetchSession,
    });

    mockUpdateUser.mockResolvedValue({});
    mockRefetchSession.mockResolvedValue({});
  });

  it('should initialize with organization step as current step', () => {
    const { result } = renderHook(() => useOnboardingState());

    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
  });

  it('should initialize with step from URL parameter when provided', () => {
    // Set URL parameter
    const searchParams = new URLSearchParams();
    searchParams.set('step', 'profile');
    mockUseSearchParams.mockReturnValue([searchParams]);

    const { result } = renderHook(() => useOnboardingState());

    expect(result.current.state.currentStep).toBe(OnboardingStep.PROFILE);
  });

  it('should ignore invalid step parameter and use default', () => {
    // Set invalid URL parameter
    const searchParams = new URLSearchParams();
    searchParams.set('step', 'invalid-step');
    mockUseSearchParams.mockReturnValue([searchParams]);

    const { result } = renderHook(() => useOnboardingState());

    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
  });

  it('should have empty completed steps initially', () => {
    const { result } = renderHook(() => useOnboardingState());

    expect(result.current.state.completedSteps).toEqual([]);
  });

  it('should move to profile step when goToNextStep is called', async () => {
    const { result } = renderHook(() => useOnboardingState());

    await act(async () => {
      await result.current.goToNextStep();
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.PROFILE);
    expect(mockFetch).toHaveBeenCalledWith('/api/user/update-onboarding-step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        onboardingStep: OnboardingStep.PROFILE,
      }),
    });
  });

  it('should mark previous step as completed when moving to next step', async () => {
    const { result } = renderHook(() => useOnboardingState());

    await act(async () => {
      await result.current.goToNextStep();
    });

    expect(result.current.state.completedSteps).toContain(OnboardingStep.ORGANIZATION);
  });

  it('should go back to previous step when goToPreviousStep is called', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // First go to profile step
    await act(async () => {
      await result.current.goToNextStep();
    });

    // Then go back
    act(() => {
      result.current.goToPreviousStep();
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
  });

  it('should remove step from completed when going back', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // Go forward twice
    await act(async () => {
      await result.current.goToNextStep(); // -> PROFILE
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> TEAM
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.TEAM);
    expect(result.current.state.completedSteps).toEqual([
      OnboardingStep.ORGANIZATION,
      OnboardingStep.PROFILE,
    ]);

    // Go back
    act(() => {
      result.current.goToPreviousStep(); // -> PROFILE
    });

    // Should remove PROFILE from completed (steps after target step)
    expect(result.current.state.currentStep).toBe(OnboardingStep.PROFILE);
    expect(result.current.state.completedSteps).toEqual([OnboardingStep.ORGANIZATION]);
  });

  it('should handle multiple backward navigations correctly', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // Go to the last step
    await act(async () => {
      await result.current.goToNextStep(); // -> PROFILE
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> TEAM
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> WELCOME
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.WELCOME);
    expect(result.current.state.completedSteps).toEqual([
      OnboardingStep.ORGANIZATION,
      OnboardingStep.PROFILE,
      OnboardingStep.TEAM,
    ]);

    // Go back to PROFILE
    act(() => {
      result.current.goToPreviousStep(); // -> TEAM
    });
    act(() => {
      result.current.goToPreviousStep(); // -> PROFILE
    });

    // Should remove PROFILE and TEAM from completed
    expect(result.current.state.currentStep).toBe(OnboardingStep.PROFILE);
    expect(result.current.state.completedSteps).toEqual([OnboardingStep.ORGANIZATION]);

    // Go back to ORGANIZATION
    act(() => {
      result.current.goToPreviousStep(); // -> ORGANIZATION
    });

    // Should have no completed steps
    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
    expect(result.current.state.completedSteps).toEqual([]);
  });

  it('should calculate progress correctly', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // Initially at step 1 of 4 = 25%
    expect(result.current.getProgress().current).toBe(1);
    expect(result.current.getProgress().total).toBe(4);
    expect(result.current.getProgress().percentage).toBe(25);

    // Move to step 2 of 4 = 50%
    await act(async () => {
      await result.current.goToNextStep();
    });

    expect(result.current.getProgress().current).toBe(2);
    expect(result.current.getProgress().percentage).toBe(50);
  });

  it('should not add duplicate steps to completedSteps when goToNextStep is called multiple times', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // Move to profile step
    await act(async () => {
      await result.current.goToNextStep(); // organization -> profile
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.PROFILE);
    expect(result.current.state.completedSteps).toEqual([OnboardingStep.ORGANIZATION]);

    // Call goToNextStep multiple times on the same step
    await act(async () => {
      await result.current.goToNextStep(); // profile -> team
    });
    await act(async () => {
      await result.current.goToNextStep(); // team -> welcome
    });

    // Now we're on welcome step
    expect(result.current.state.currentStep).toBe(OnboardingStep.WELCOME);
    expect(result.current.state.completedSteps).toEqual([
      OnboardingStep.ORGANIZATION,
      OnboardingStep.PROFILE,
      OnboardingStep.TEAM,
    ]);

    // Call goToNextStep multiple times on the last step - should not add duplicates
    const completedStepsBeforeExtra = [...result.current.state.completedSteps];

    await act(async () => {
      await result.current.goToNextStep();
    });
    await act(async () => {
      await result.current.goToNextStep();
    });

    // Should still be on welcome step with same completed steps (no duplicates)
    expect(result.current.state.currentStep).toBe(OnboardingStep.WELCOME);
    expect(result.current.state.completedSteps).toEqual(completedStepsBeforeExtra);
  });

  it('should not move past the last step when goToNextStep is called', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // Navigate to the last step
    await act(async () => {
      await result.current.goToNextStep(); // -> PROFILE
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> TEAM
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> WELCOME
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.WELCOME);

    // Try to go beyond the last step
    await act(async () => {
      await result.current.goToNextStep();
    });

    // Should remain on the last step
    expect(result.current.state.currentStep).toBe(OnboardingStep.WELCOME);
  });

  it('should not move before the first step when goToPreviousStep is called', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Already at the first step
    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);

    // Try to go before the first step
    act(() => {
      result.current.goToPreviousStep();
    });

    // Should remain on the first step
    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
    expect(result.current.state.completedSteps).toEqual([]);
  });

  it('should calculate progress correctly at final step', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // Navigate to the last step
    await act(async () => {
      await result.current.goToNextStep(); // -> PROFILE
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> TEAM
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> WELCOME
    });

    const progress = result.current.getProgress();
    expect(progress.current).toBe(4);
    expect(progress.total).toBe(4);
    expect(progress.percentage).toBe(100);
  });

  it('should update progress correctly after backward navigation', async () => {
    const { result } = renderHook(() => useOnboardingState());

    // Navigate forward then backward
    await act(async () => {
      await result.current.goToNextStep(); // -> PROFILE (step 2 of 4 = 50%)
    });
    await act(async () => {
      await result.current.goToNextStep(); // -> TEAM (step 3 of 4 = 75%)
    });

    let progress = result.current.getProgress();
    expect(progress.current).toBe(3);
    expect(progress.percentage).toBe(75);

    // Go back
    act(() => {
      result.current.goToPreviousStep(); // -> PROFILE (step 2 of 4 = 50%)
    });

    progress = result.current.getProgress();
    expect(progress.current).toBe(2);
    expect(progress.percentage).toBe(50);
  });
});
