/**
 * @fileoverview Slack-style onboarding layout component
 * @module components/Auth/OnboardingFlow/OnboardingLayout
 */

import React, { ReactNode } from 'react';
import { Button } from '~/components/ui/Button';
import { Progress } from '~/components/ui/Progress';

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  backLabel?: string;
  isNextDisabled?: boolean;
  showProgress?: boolean;
  className?: string;
}

/**
 * Onboarding layout component with Slack-inspired design
 * Provides consistent layout for all onboarding steps
 */
export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Next',
  backLabel = 'Back',
  isNextDisabled = false,
  showProgress = true,
  className = '',
}) => {
  const progressPercentage = (step / totalSteps) * 100;

  return (
    <div className={`flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Progress bar */}
      {showProgress && (
        <div className="w-full border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-md px-6 py-4">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Step {step} of {totalSteps}
              </span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-lg text-gray-600 dark:text-gray-400">{subtitle}</p>}
          </div>

          {/* Content */}
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {children}
          </div>

          {/* Navigation buttons */}
          {(onNext || onBack) && (
            <div className="mt-8 flex items-center justify-between">
              <div>
                {onBack && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {backLabel}
                  </Button>
                )}
              </div>
              <div>
                {onNext && (
                  <Button
                    type="button"
                    onClick={onNext}
                    disabled={isNextDisabled}
                    className="bg-primary px-8 text-white hover:bg-primary/90"
                  >
                    {nextLabel}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          Need help?{' '}
          <a href="/support" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
};
