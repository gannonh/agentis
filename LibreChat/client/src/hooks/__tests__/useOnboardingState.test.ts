/**
 * @fileoverview Tests for useOnboardingState hook
 * @module hooks/useOnboardingState.test
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useOnboardingState, OnboardingStep } from '../useOnboardingState';

describe('useOnboardingState', () => {
  it('should initialize with organization step as current step', () => {
    const { result } = renderHook(() => useOnboardingState());

    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
  });

  it('should have empty completed steps initially', () => {
    const { result } = renderHook(() => useOnboardingState());

    expect(result.current.state.completedSteps).toEqual([]);
  });

  it('should move to profile step when goToNextStep is called', () => {
    const { result } = renderHook(() => useOnboardingState());

    act(() => {
      result.current.goToNextStep();
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.PROFILE);
  });

  it('should mark previous step as completed when moving to next step', () => {
    const { result } = renderHook(() => useOnboardingState());

    act(() => {
      result.current.goToNextStep();
    });

    expect(result.current.state.completedSteps).toContain(OnboardingStep.ORGANIZATION);
  });

  it('should go back to previous step when goToPreviousStep is called', () => {
    const { result } = renderHook(() => useOnboardingState());

    // First go to profile step
    act(() => {
      result.current.goToNextStep();
    });

    // Then go back
    act(() => {
      result.current.goToPreviousStep();
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
  });

  it('should remove step from completed when going back', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Go forward twice
    act(() => {
      result.current.goToNextStep(); // -> PROFILE
    });
    act(() => {
      result.current.goToNextStep(); // -> TEAM
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

  it('should handle multiple backward navigations correctly', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Go to the last step
    act(() => {
      result.current.goToNextStep(); // -> PROFILE
    });
    act(() => {
      result.current.goToNextStep(); // -> TEAM
    });
    act(() => {
      result.current.goToNextStep(); // -> WELCOME
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

  it('should calculate progress correctly', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Initially at step 1 of 4 = 25%
    expect(result.current.getProgress().current).toBe(1);
    expect(result.current.getProgress().total).toBe(4);
    expect(result.current.getProgress().percentage).toBe(25);

    // Move to step 2 of 4 = 50%
    act(() => {
      result.current.goToNextStep();
    });

    expect(result.current.getProgress().current).toBe(2);
    expect(result.current.getProgress().percentage).toBe(50);
  });

  it('should not add duplicate steps to completedSteps when goToNextStep is called multiple times', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Move to profile step
    act(() => {
      result.current.goToNextStep(); // organization -> profile
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.PROFILE);
    expect(result.current.state.completedSteps).toEqual([OnboardingStep.ORGANIZATION]);

    // Call goToNextStep multiple times on the same step
    act(() => {
      result.current.goToNextStep(); // profile -> team
    });
    act(() => {
      result.current.goToNextStep(); // team -> welcome
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

    act(() => {
      result.current.goToNextStep();
    });
    act(() => {
      result.current.goToNextStep();
    });

    // Should still be on welcome step with same completed steps (no duplicates)
    expect(result.current.state.currentStep).toBe(OnboardingStep.WELCOME);
    expect(result.current.state.completedSteps).toEqual(completedStepsBeforeExtra);
  });

  it('should not move past the last step when goToNextStep is called', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Navigate to the last step
    act(() => {
      result.current.goToNextStep(); // -> PROFILE
    });
    act(() => {
      result.current.goToNextStep(); // -> TEAM
    });
    act(() => {
      result.current.goToNextStep(); // -> WELCOME
    });

    expect(result.current.state.currentStep).toBe(OnboardingStep.WELCOME);

    // Try to go beyond the last step
    act(() => {
      result.current.goToNextStep();
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

  it('should calculate progress correctly at final step', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Navigate to the last step
    act(() => {
      result.current.goToNextStep(); // -> PROFILE
    });
    act(() => {
      result.current.goToNextStep(); // -> TEAM
    });
    act(() => {
      result.current.goToNextStep(); // -> WELCOME
    });

    const progress = result.current.getProgress();
    expect(progress.current).toBe(4);
    expect(progress.total).toBe(4);
    expect(progress.percentage).toBe(100);
  });

  it('should update progress correctly after backward navigation', () => {
    const { result } = renderHook(() => useOnboardingState());

    // Navigate forward then backward
    act(() => {
      result.current.goToNextStep(); // -> PROFILE (step 2 of 4 = 50%)
    });
    act(() => {
      result.current.goToNextStep(); // -> TEAM (step 3 of 4 = 75%)
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
