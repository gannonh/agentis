import React, { useState } from 'react';
import { ComposioAuthButton } from '~/components/Composio/ComposioAuthButton';

interface AuthCodeParserProps {
  content: string;
  isAuthMessage?: boolean;
  onAuthSuccess?: (service: string, connectedAccountId: string) => void;
}

/**
 * Parses tool responses for AUTHCODE patterns and renders inline authentication
 * Format: "AUTHCODE:service:message for LLM" or detects auth messages by keywords
 */
export const AuthCodeParser: React.FC<AuthCodeParserProps> = ({
  content,
  isAuthMessage,
  onAuthSuccess,
}) => {
  const [authenticatedServices, setAuthenticatedServices] = useState<Set<string>>(new Set());

  // Service display names
  const getServiceDisplayName = (service: string) => {
    const serviceNames: Record<string, string> = {
      googlesheets: 'Google Sheets',
      googledrive: 'Google Drive',
      googledocs: 'Google Docs',
      gmail: 'Gmail',
      googlecalendar: 'Google Calendar',
    };
    return serviceNames[service] || service;
  };

  const handleAuthSuccess = (authService: string, connectedAccountId: string) => {
    console.log(`✅ Authentication successful for ${authService}:`, connectedAccountId);
    setAuthenticatedServices((prev) => new Set([...prev, authService]));

    // Call parent callback if provided
    onAuthSuccess?.(authService, connectedAccountId);

    // Show success message
    const serviceName = getServiceDisplayName(authService);
    console.log(`🎉 ${serviceName} connected successfully!`);

    // Show a user-friendly success message
    // You could add a toast notification here in the future
  };

  const handleAuthError = (error: string) => {
    console.error('❌ Authentication failed:', error);
  };

  // Check if content contains an AUTHCODE pattern first
  const authCodeMatch = content.match(/^AUTHCODE:([^:]+):(.+)$/);

  if (authCodeMatch) {
    const [, service, llmMessage] = authCodeMatch;
    const isAuthenticated = authenticatedServices.has(service);
    const serviceName = getServiceDisplayName(service);

    return (
      <div className="space-y-3">
        {/* LLM Message from AUTHCODE */}
        <div className="text-gray-800 dark:text-gray-100">{llmMessage}</div>

        {/* Authentication UI */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">✅ {serviceName} Connected</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                You can now retry using {serviceName} tools!
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">🔐 Authentication Required</span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connect your Google account to use {serviceName} tools:
              </p>

              <div className="max-w-xs">
                <ComposioAuthButton
                  service={service}
                  onAuthSuccess={handleAuthSuccess}
                  onAuthError={handleAuthError}
                  inline={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If this is marked as an auth message but no AUTHCODE pattern, try to detect the service
  if (isAuthMessage) {
    let service = 'googlesheets'; // Default to Google Sheets for now

    // Try to detect other services from the message content
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('google drive')) {
      service = 'googledrive';
    } else if (lowerContent.includes('google docs')) {
      service = 'googledocs';
    } else if (lowerContent.includes('gmail')) {
      service = 'gmail';
    } else if (lowerContent.includes('google calendar')) {
      service = 'googlecalendar';
    }

    const isAuthenticated = authenticatedServices.has(service);
    const serviceName = getServiceDisplayName(service);

    // Render the message with auth UI below
    return (
      <div className="space-y-3">
        {/* Original message (already processed by LLM) */}
        <div className="text-gray-800 dark:text-gray-100">{content}</div>

        {/* Authentication UI below the message */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
          {!isAuthenticated && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Authentication Required</span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300">
                Connect your Google account to use {serviceName} tools:
              </p>

              <div className="max-w-xs">
                <ComposioAuthButton
                  service={service}
                  onAuthSuccess={handleAuthSuccess}
                  onAuthError={handleAuthError}
                  inline={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No auth code and not marked as auth message, return original content
  return <span>{content}</span>;
};

export default AuthCodeParser;
