import React, { useState, useEffect, useCallback } from 'react';
import { ComposioAuthButton } from './ComposioAuthButton';
import { useAuthContext } from '~/hooks';

const COMPOSIO_SERVICES = ['googlesheets', 'googledrive', 'googledocs', 'gmail', 'googlecalendar'];

export const ComposioTestPage: React.FC = () => {
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { token } = useAuthContext();

  const checkAllConnectionStatuses = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    const statuses: Record<string, boolean> = {};

    for (const service of COMPOSIO_SERVICES) {
      try {
        const response = await fetch(`/api/composio/connection-status/${service}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        statuses[service] = data.hasActiveConnection;
      } catch (error) {
        console.error(`Failed to check status for ${service}:`, error);
        statuses[service] = false;
      }
    }

    setConnectionStatuses(statuses);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    checkAllConnectionStatuses();
  }, [checkAllConnectionStatuses]);

  const handleAuthSuccess = (service: string, connectedAccountId: string) => {
    console.log(`✅ Auth success for ${service}:`, connectedAccountId);
    setConnectionStatuses((prev) => ({ ...prev, [service]: true }));

    // Show success message
    alert(`Successfully connected to ${service}! You can now use ${service} tools in chat.`);
  };

  const handleAuthError = (error: string) => {
    console.error('❌ Auth error:', error);
    alert(`Authentication failed: ${error}`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg">Loading connection statuses...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">Composio Authentication Test</h1>
        <p className="mb-4 text-gray-600">
          Test the OAuth flow for Composio services. Connect to Google services to use their tools
          in chat.
        </p>
        <button
          onClick={checkAllConnectionStatuses}
          className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
        >
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {COMPOSIO_SERVICES.map((service) => (
          <div key={service} className="relative">
            {connectionStatuses[service] && (
              <div className="absolute -right-2 -top-2 z-10 rounded-full bg-green-500 px-2 py-1 text-xs text-white">
                ✓ Connected
              </div>
            )}
            <ComposioAuthButton
              service={service}
              onAuthSuccess={handleAuthSuccess}
              onAuthError={handleAuthError}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg bg-gray-100 p-4">
        <h3 className="mb-2 font-semibold">How to Test:</h3>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>Click &quot;Connect&quot; for any service you want to test</li>
          <li>Complete the OAuth flow in the popup window</li>
          <li>Once connected, go to a chat and try using tools for that service</li>
          <li>Example: &quot;Create a new Google Sheet with my project tasks&quot;</li>
        </ol>
      </div>

      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-800">Connection Status:</h3>
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          {COMPOSIO_SERVICES.map((service) => (
            <div key={service} className="flex items-center space-x-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  connectionStatuses[service] ? 'bg-green-500' : 'bg-red-500'
                }`}
              ></span>
              <span className="capitalize">{service}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComposioTestPage;
