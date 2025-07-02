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

    setState((prevState) => {
      // Only add to completed steps if we're actually moving to a different step
      // and the current step isn't already in completed steps
      const isMovingToNewStep = nextStep !== prevState.currentStep;
      const isCurrentStepAlreadyCompleted = prevState.completedSteps.includes(
        prevState.currentStep,
      );

      const newCompletedSteps =
        isMovingToNewStep && !isCurrentStepAlreadyCompleted
          ? [...prevState.completedSteps, prevState.currentStep]
          : prevState.completedSteps;

      return {
        ...prevState,
        currentStep: nextStep,
        completedSteps: newCompletedSteps,
      };
    });
  };

  const goToPreviousStep = () => {
    const currentIndex = allSteps.indexOf(state.currentStep);
    const prevIndex = Math.max(currentIndex - 1, 0);
    const prevStep = allSteps[prevIndex];

    setState((prevState) => ({
      ...prevState,
      currentStep: prevStep,
    }));
  };

  const getProgress = () => {
    const currentIndex = allSteps.indexOf(state.currentStep);
    const current = currentIndex + 1;
    const total = allSteps.length;
    const percentage = Math.round((current / total) * 100);

    return {
      current,
      total,
      percentage,
    };
  };

  return {
    state,
    goToNextStep,
    goToPreviousStep,
    getProgress,
  };
}
