/**
 * @fileoverview Hook for managing onboarding state with database synchronization
 * @module hooks/useOnboardingState
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

/**
 * Enumeration of onboarding steps in the flow
 * @enum {string}
 */
export enum OnboardingStep {
  /** Organization setup step */
  ORGANIZATION = 'organization',
  /** User profile completion step */
  PROFILE = 'profile',
  /** Team member invitation step */
  TEAM = 'team',
  /** Welcome/completion step */
  WELCOME = 'welcome',
}

/**
 * Interface representing the current state of the onboarding flow
 * @interface OnboardingState
 */
export interface OnboardingState {
  /** The current step the user is on */
  currentStep: OnboardingStep;
  /** Array of steps that have been completed */
  completedSteps: OnboardingStep[];
}

const allSteps = [
  OnboardingStep.ORGANIZATION,
  OnboardingStep.PROFILE,
  OnboardingStep.TEAM,
  OnboardingStep.WELCOME,
];

/**
 * Custom hook for managing onboarding flow state and navigation with database synchronization
 *
 * Provides state management for a multi-step onboarding process including:
 * - Current step tracking synced with database
 * - Completed steps history
 * - Navigation between steps with database updates
 * - Progress calculation
 * - URL parameter support for resuming onboarding
 *
 * @returns {Object} Hook interface with state and navigation functions
 * @returns {OnboardingState} returns.state - Current onboarding state
 * @returns {Function} returns.goToNextStep - Navigate to the next step and update database
 * @returns {Function} returns.goToPreviousStep - Navigate to the previous step
 * @returns {Function} returns.getProgress - Get current progress information
 *
 * @example
 * ```tsx
 * const { state, goToNextStep, goToPreviousStep, getProgress } = useOnboardingState();
 *
 * // Check current step
 * if (state.currentStep === OnboardingStep.ORGANIZATION) {
 *   // Show organization setup form
 * }
 *
 * // Get progress for display
 * const progress = getProgress();
 * console.log(`Step ${progress.current} of ${progress.total} (${progress.percentage}%)`);
 * ```
 */
export function useOnboardingState() {
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [searchParams] = useSearchParams();

  // Initialize state from URL parameter or user's database step
  const getInitialStep = useCallback((): OnboardingStep => {
    const stepParam = searchParams.get('step') as OnboardingStep;

    // If URL has a valid step parameter, use it
    if (stepParam && allSteps.includes(stepParam)) {
      return stepParam;
    }

    // Otherwise use user's current onboarding step from database
    return (session?.user?.onboardingStep as OnboardingStep) || OnboardingStep.ORGANIZATION;
  }, [searchParams, session?.user?.onboardingStep]);

  const [state, setState] = useState<OnboardingState>({
    currentStep: getInitialStep(),
    completedSteps: [],
  });

  // Update state when session changes or URL parameters change
  useEffect(() => {
    const currentStep = getInitialStep();
    setState((prevState) => ({
      ...prevState,
      currentStep,
    }));
  }, [session?.user?.onboardingStep, searchParams, getInitialStep]);

  const goToNextStep = async () => {
    const currentIndex = allSteps.indexOf(state.currentStep);
    const nextIndex = Math.min(currentIndex + 1, allSteps.length - 1);
    const nextStep = allSteps[nextIndex];

    // Update database with new onboarding step using direct API call
    try {
      const response = await fetch('/api/user/update-onboarding-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session authentication
        body: JSON.stringify({
          onboardingStep: nextStep,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update onboarding step: ${response.status}`);
      }

      const result = await response.json();
      console.log('Updated user onboarding step to:', nextStep, result);

      // Use Better Auth's built-in refetch method to refresh session cache
      await refetchSession();
      console.log('Refreshed session after onboarding step update');
    } catch (error) {
      console.error('Failed to update onboarding step in database:', error);
      // Continue with local state update even if database update fails
    }

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

    setState((prevState) => {
      // When going back, remove steps from completed that come after the target step
      const newCompletedSteps = prevState.completedSteps.filter((step) => {
        const stepIndex = allSteps.indexOf(step);
        const targetIndex = allSteps.indexOf(prevStep);
        return stepIndex < targetIndex;
      });

      return {
        ...prevState,
        currentStep: prevStep,
        completedSteps: newCompletedSteps,
      };
    });
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
