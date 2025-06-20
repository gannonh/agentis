import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '~/hooks';

export enum RegistrationStep {
  EMAIL = 'EMAIL',
  VERIFICATION = 'VERIFICATION',
  ORG_DETECTION = 'ORG_DETECTION',
  PROFILE = 'PROFILE',
  ORG_SETUP = 'ORG_SETUP',
  INVITE_MEMBERS = 'INVITE_MEMBERS',
  WELCOME = 'WELCOME',
}

export enum UserRole {
  MEMBER = 'MEMBER',
  ACCOUNT_OWNER = 'ACCOUNT_OWNER',
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  domain: string;
  memberCount?: number;
}

export interface RegistrationState {
  currentStep: RegistrationStep;
  email: string;
  emailVerified: boolean;
  emailVerificationSent: boolean;
  magicLinkSent: boolean;
  organizationData: OrganizationData | null;
  userRole: UserRole | null;
  profileData: {
    name: string;
    username?: string;
    avatar?: string;
  };
  organizationSetup?: {
    name: string;
    slug: string;
    description?: string;
  };
  invitations?: string[];
  timestamp: number;
}

const initialState: RegistrationState = {
  currentStep: RegistrationStep.EMAIL,
  email: '',
  emailVerified: false,
  emailVerificationSent: false,
  magicLinkSent: false,
  organizationData: null,
  userRole: null,
  profileData: {
    name: '',
  },
  timestamp: Date.now(),
};

const EXPIRATION_TIME = 30 * 60 * 1000; // 30 minutes

export const REGISTRATION_STEPS: Record<UserRole, RegistrationStep[]> = {
  [UserRole.MEMBER]: [
    RegistrationStep.EMAIL,
    RegistrationStep.VERIFICATION,
    RegistrationStep.ORG_DETECTION,
    RegistrationStep.PROFILE,
    RegistrationStep.WELCOME,
  ],
  [UserRole.ACCOUNT_OWNER]: [
    RegistrationStep.EMAIL,
    RegistrationStep.VERIFICATION,
    RegistrationStep.ORG_DETECTION,
    RegistrationStep.PROFILE,
    RegistrationStep.ORG_SETUP,
    RegistrationStep.INVITE_MEMBERS,
    RegistrationStep.WELCOME,
  ],
};

export const useRegistrationState = () => {
  const [state, setState] = useLocalStorage<RegistrationState>(
    'registration-progress',
    initialState,
  );
  const [isExpired, setIsExpired] = useState(false);

  // Check if state is expired on mount and when state changes
  useEffect(() => {
    if (state && state.timestamp) {
      const isStateExpired = Date.now() - state.timestamp > EXPIRATION_TIME;
      if (isStateExpired && !isExpired) {
        setIsExpired(true);
        setState(initialState);
      } else if (!isStateExpired && isExpired) {
        setIsExpired(false);
      }
    } else if (state && !state.timestamp) {
      // Handle legacy state without timestamp
      setState({ ...state, timestamp: Date.now() });
    }
  }, [state, setState, isExpired]);

  const updateState = useCallback(
    (updates: Partial<RegistrationState>) => {
      const newState = {
        ...state,
        ...updates,
        timestamp: Date.now(),
      };
      setState(newState);
    },
    [setState, state],
  );

  const updateStep = useCallback(
    (step: RegistrationStep) => {
      updateState({ currentStep: step });
    },
    [updateState],
  );

  const getSteps = useCallback(() => {
    if (!state?.userRole) {
      // Default steps before role is determined
      return [
        RegistrationStep.EMAIL,
        RegistrationStep.VERIFICATION,
        RegistrationStep.ORG_DETECTION,
        RegistrationStep.PROFILE,
        RegistrationStep.WELCOME,
      ];
    }
    return REGISTRATION_STEPS[state.userRole];
  }, [state?.userRole]);

  const getCurrentStepIndex = useCallback(() => {
    const steps = getSteps();
    return steps.indexOf(state?.currentStep || RegistrationStep.EMAIL);
  }, [state?.currentStep, getSteps]);

  const canGoBack = useCallback(() => {
    return getCurrentStepIndex() > 0;
  }, [getCurrentStepIndex]);

  const canSkip = useCallback(() => {
    // Only INVITE_MEMBERS step is optional
    return state?.currentStep === RegistrationStep.INVITE_MEMBERS;
  }, [state?.currentStep]);

  const goToNextStep = useCallback(() => {
    const steps = getSteps();
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < steps.length - 1) {
      updateStep(steps[currentIndex + 1]);
    }
  }, [getSteps, getCurrentStepIndex, updateStep]);

  const goToPreviousStep = useCallback(() => {
    const steps = getSteps();
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      updateStep(steps[currentIndex - 1]);
    }
  }, [getSteps, getCurrentStepIndex, updateStep]);

  const skipCurrentStep = useCallback(() => {
    if (canSkip()) {
      goToNextStep();
    }
  }, [canSkip, goToNextStep]);

  const clearState = useCallback(() => {
    setState(initialState);
    localStorage.removeItem('registration-progress');
  }, [setState]);

  const getProgress = useCallback(() => {
    const steps = getSteps();
    const currentIndex = getCurrentStepIndex();
    return {
      current: currentIndex + 1,
      total: steps.length,
      percentage: Math.round(((currentIndex + 1) / steps.length) * 100),
    };
  }, [getSteps, getCurrentStepIndex]);

  return {
    state,
    updateState,
    updateStep,
    goToNextStep,
    goToPreviousStep,
    skipCurrentStep,
    canGoBack,
    canSkip,
    clearState,
    getProgress,
    getSteps,
  };
};
