/**
 * @fileoverview Welcome dashboard component for completing onboarding
 * @module components/Auth/OnboardingFlow/WelcomeDashboard
 */

import React from 'react';
import { CheckCircle, Users, MessageSquare, Settings, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import type { OrganizationData, UserRole } from '~/config/betterAuth';

interface WelcomeDashboardProps {
  organization: OrganizationData;
  userRole: UserRole;
  memberCount: number;
  invitationsSent?: number;
  onGetStarted: () => void;
  className?: string;
}

/**
 * Welcome dashboard component shown after successful onboarding
 * Celebrates completion and guides user to next steps
 */
export const WelcomeDashboard: React.FC<WelcomeDashboardProps> = ({
  organization,
  userRole,
  memberCount,
  invitationsSent = 0,
  onGetStarted,
  className = '',
}) => {
  const isOwner = userRole === 'owner';

  return (
    <div className={`text-center ${className}`}>
      {/* Success celebration */}
      <div className="mb-8">
        <div className="relative">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -right-1 -top-1">
            <CheckCircle className="h-8 w-8 rounded-full bg-white text-green-500" />
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to {organization.name}!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {isOwner
            ? 'You&apos;ve successfully created your organization'
            : `You&apos;ve joined ${organization.name} as a team member`}
        </p>
      </div>

      {/* Organization stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <Users className="mx-auto mb-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{memberCount}</div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            Team {memberCount === 1 ? 'Member' : 'Members'}
          </div>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <MessageSquare className="mx-auto mb-2 h-6 w-6 text-green-600 dark:text-green-400" />
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">0</div>
          <div className="text-sm text-green-700 dark:text-green-300">Conversations</div>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <Settings className="mx-auto mb-2 h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {isOwner ? 'Owner' : 'Member'}
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300">Your Role</div>
        </div>
      </div>

      {/* Invitation status */}
      {isOwner && invitationsSent > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center justify-center space-x-2 text-yellow-700 dark:text-yellow-300">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {invitationsSent} invitation{invitationsSent > 1 ? 's' : ''} sent successfully
            </span>
          </div>
          <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
            Your team members will receive email invitations to join {organization.name}
          </p>
        </div>
      )}

      {/* Next steps */}
      <div className="mb-8 rounded-lg bg-gray-50 p-6 text-left dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          What&apos;s next?
        </h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Start your first conversation
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Try out Agentis with AI-powered conversations
              </p>
            </div>
          </div>

          {isOwner && (
            <>
              <div className="flex items-start space-x-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Customize your organization
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload a logo, set up teams, and configure settings
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="mt-0.5 h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Invite more team members
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Grow your team and collaborate on AI projects
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Get started button */}
      <Button
        onClick={onGetStarted}
        size="lg"
        className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-white hover:from-blue-700 hover:to-purple-700"
      >
        Get Started with Agentis
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>

      {/* Help text */}
      <div className="mt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Need help getting started?{' '}
          <a href="/docs" className="text-blue-600 hover:underline dark:text-blue-400">
            Check out our guides
          </a>{' '}
          or{' '}
          <a href="/support" className="text-blue-600 hover:underline dark:text-blue-400">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
};
