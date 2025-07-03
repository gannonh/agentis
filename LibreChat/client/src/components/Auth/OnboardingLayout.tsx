/**
 * @fileoverview Modern onboarding layout with Slack-inspired design
 * @module components/Auth/OnboardingLayout
 */

import React from 'react';
import { cn } from '~/utils';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  step?: {
    current: number;
    total: number;
  };
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Modern onboarding layout component with Slack-inspired design
 * 
 * Features:
 * - Centered layout with generous spacing
 * - Subtle gradient background
 * - Progress indicator
 * - Responsive design
 * - Accessibility compliant
 * 
 * @param props - Component props
 * @returns JSX.Element
 */
export default function OnboardingLayout({
  children,
  title,
  subtitle,
  step,
  maxWidth = 'md',
  className
}: OnboardingLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {/* Progress indicator */}
        {step && (
          <div className="mb-8 w-full max-w-md">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
              <span>Step {step.current} of {step.total}</span>
              <span>{Math.round((step.current / step.total) * 100)}%</span>
            </div>
            <div 
              className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700"
              role="progressbar"
              aria-valuenow={step.current}
              aria-valuemin={0}
              aria-valuemax={step.total}
              aria-label={`Step ${step.current} of ${step.total}`}
            >
              <div
                className="h-2 rounded-full bg-indigo-600 transition-all duration-300 ease-out"
                style={{ width: `${(step.current / step.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Main content card */}
        <div className={cn(
          'w-full',
          maxWidthClasses[maxWidth],
          'rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 dark:shadow-gray-900/20',
          'border border-gray-100 dark:border-gray-700',
          className
        )}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Content */}
          <div>
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact our support team
          </p>
        </div>
      </div>
    </div>
  );
}