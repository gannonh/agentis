/**
 * @fileoverview Hook for managing onboarding state
 * @module hooks/useOnboardingState
 */

export enum OnboardingStep {
  ORGANIZATION = 'organization',
  PROFILE = 'profile',
  TEAM = 'team',
  WELCOME = 'welcome',
}

export interface OnboardingState {
  currentStep: OnboardingStep;
}

export function useOnboardingState() {
  const state: OnboardingState = {
    currentStep: OnboardingStep.ORGANIZATION,
  };

  return {
    state,
  };
}