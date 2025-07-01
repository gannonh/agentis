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
});