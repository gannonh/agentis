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
});