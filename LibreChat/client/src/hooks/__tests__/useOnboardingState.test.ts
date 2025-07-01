/**
 * @fileoverview Tests for useOnboardingState hook
 * @module hooks/useOnboardingState.test
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useOnboardingState, OnboardingStep } from '../useOnboardingState';

describe('useOnboardingState', () => {
  it('should initialize with organization step as current step', () => {
    const { result } = renderHook(() => useOnboardingState());

    expect(result.current.state.currentStep).toBe(OnboardingStep.ORGANIZATION);
  });
});