/**
 * @fileoverview Hook for managing onboarding state
 * @module hooks/useOnboardingState
 */

import { useState } from 'react';

export enum OnboardingStep {
  ORGANIZATION = 'organization',
  PROFILE = 'profile',
  TEAM = 'team',
  WELCOME = 'welcome',
}

export interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
}

const allSteps = [
  OnboardingStep.ORGANIZATION,
  OnboardingStep.PROFILE,
  OnboardingStep.TEAM,
  OnboardingStep.WELCOME,
];

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>({
    currentStep: OnboardingStep.ORGANIZATION,
    completedSteps: [],
  });

  const goToNextStep = () => {
    const currentIndex = allSteps.indexOf(state.currentStep);
    const nextIndex = Math.min(currentIndex + 1, allSteps.length - 1);
    const nextStep = allSteps[nextIndex];
    
    setState(prevState => ({
      ...prevState,
      currentStep: nextStep,
    }));
  };

  return {
    state,
    goToNextStep,
  };
}