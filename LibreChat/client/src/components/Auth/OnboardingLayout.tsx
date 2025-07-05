/**
 * @fileoverview Modern onboarding layout with Slack-inspired design
 * @module components/Auth/OnboardingLayout
 */

import React from 'react';
import { cn } from '~/utils';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string | React.ReactNode;
  subtitle?: string;
  step?: {
    current: number;
    total: number;
  };
  className?: string;
}

/**
 * Modern onboarding layout component with Slack-inspired design
 *
 * Features:
 * - Wide centered layout
 * - Large typography and generous spacing
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
  className,
}: OnboardingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Progress indicator */}
      {step && (
        <div className="w-full px-16 pt-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                Step {step.current} of {step.total}
              </span>
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
        </div>
      )}

      {/* Main content - wide centered layout */}
      <div className="flex flex-1 items-center justify-center px-16 py-20">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Header */}
          <div className="mb-16">
            <h1 className="mb-8 text-6xl font-bold leading-tight text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto max-w-4xl text-2xl leading-relaxed text-gray-600 dark:text-gray-300">
                {subtitle}
              </p>
            )}
          </div>

          {/* Content */}
          <div className={cn('mx-auto max-w-2xl', className)}>{children}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Need help? Contact our support team
        </p>
      </div>
    </div>
  );
}
