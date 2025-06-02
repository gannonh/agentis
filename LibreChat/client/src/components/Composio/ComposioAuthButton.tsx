import React, { useState, useEffect } from 'react';
import { useAuthContext } from '~/hooks';

interface ComposioAuthButtonProps {
  service: string;
  onAuthSuccess?: (service: string, connectedAccountId: string) => void;
  onAuthError?: (error: string) => void;
  inline?: boolean; // New prop for inline vs full card display
}

export const ComposioAuthButton: React.FC<ComposioAuthButtonProps> = ({
  service,
  onAuthSuccess,
  onAuthError,
  inline = false,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('unknown');
  const [isChecking, setIsChecking] = useState(true); // Add loading state for initial check
  const { token } = useAuthContext();

  // Check connection status when component mounts and poll for updates
  useEffect(() => {
    const checkConnectionStatus = async () => {
      if (!token) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch(`/api/composio/connection-status/${service}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasActiveConnection) {
            setConnectionStatus('pending'); // Treat any existing connection as pending (which works)
          } else {
            // Only reset to unknown if we're not currently in an auth flow
            if (!isAuthenticating) {
              setConnectionStatus('unknown');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check connection status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkConnectionStatus();

    // Set up polling every 5 seconds, but only if we're in an authenticating state
    let pollInterval: NodeJS.Timeout | null = null;
    
    if (isAuthenticating) {
      pollInterval = setInterval(checkConnectionStatus, 5000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [service, token, isAuthenticating]);

  const handleAuthenticate = async () => {
    if (!token) {
      onAuthError?.('Not authenticated');
      return;
    }

    setIsAuthenticating(true);
    setConnectionStatus('initiating');

    try {
      // Step 1: Initiate OAuth flow
      const response = await fetch(`/api/composio/auth/${service}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate OAuth: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('OAuth initiated:', data);

      setConnectionStatus('redirecting');

      // Step 2: Open OAuth popup
      const popup = window.open(
        data.redirectUrl,
        'composio-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please allow popups for this site.');
      }

      // Step 3: Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return;
        }

        console.log('Received message:', event.data);

        if (event.data.type === 'COMPOSIO_AUTH_SUCCESS') {
          console.log('OAuth success:', event.data);
          setConnectionStatus('pending');
          window.removeEventListener('message', handleMessage);
          popup.close();
          
          // Call wait-for-connection to update MongoDB with the new active connection ID
          fetch(`/api/composio/wait-for-connection`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              service: service,
              connectedAccountId: event.data.connectedAccountId,
              timeoutSeconds: 30,
            }),
          })
          .then(response => response.json())
          .then(data => {
            console.log('Wait-for-connection response:', data);
            if (data.success && data.isActive) {
              setConnectionStatus('active');
              setIsAuthenticating(false);
              onAuthSuccess?.(service, data.connectedAccountId);
            } else if (data.success) {
              // Connection exists but might not be ACTIVE yet - treat as success
              setConnectionStatus('active'); 
              setIsAuthenticating(false);
              onAuthSuccess?.(service, event.data.connectedAccountId);
            } else {
              setConnectionStatus('error');
              setIsAuthenticating(false);
              onAuthError?.('Connection did not become active');
            }
          })
          .catch(error => {
            console.error('Failed to wait for connection:', error);
            setConnectionStatus('error');
            setIsAuthenticating(false);
            onAuthError?.('Failed to verify connection');
          });
        } else if (event.data.type === 'COMPOSIO_AUTH_ERROR') {
          console.error('OAuth error:', event.data);
          setConnectionStatus('error');
          setIsAuthenticating(false);
          onAuthError?.(event.data.error);
          window.removeEventListener('message', handleMessage);
          popup.close();
        } else if (event.data.type === 'COMPOSIO_AUTH_PENDING') {
          console.log('OAuth pending:', event.data);
          setConnectionStatus('pending');
          window.removeEventListener('message', handleMessage);
          popup.close();
          
          // Call wait-for-connection to update MongoDB with the new active connection ID
          fetch(`/api/composio/wait-for-connection`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              service: service,
              connectedAccountId: event.data.connectedAccountId,
              timeoutSeconds: 30,
            }),
          })
          .then(response => response.json())
          .then(data => {
            console.log('Wait-for-connection response (PENDING):', data);
            if (data.success && data.isActive) {
              setConnectionStatus('active');
              setIsAuthenticating(false);
              onAuthSuccess?.(service, data.connectedAccountId);
            } else if (data.success) {
              // Connection exists but might not be ACTIVE yet - treat as success
              setConnectionStatus('active');
              setIsAuthenticating(false);
              onAuthSuccess?.(service, event.data.connectedAccountId);
            } else {
              setConnectionStatus('pending');
              setIsAuthenticating(false);
              // Connection is still being set up, but we can proceed
              onAuthSuccess?.(service, event.data.connectedAccountId);
            }
          })
          .catch(error => {
            console.error('Failed to wait for connection:', error);
            setConnectionStatus('pending');
            setIsAuthenticating(false);
            onAuthSuccess?.(service, event.data.connectedAccountId);
          });
        }
      };

      window.addEventListener('message', handleMessage);

      // Step 4: Handle popup closed without completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          if (isAuthenticating) {
            setConnectionStatus('cancelled');
            setIsAuthenticating(false);
            onAuthError?.('OAuth was cancelled');
            window.removeEventListener('message', handleMessage);
          }
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth error:', error);
      setConnectionStatus('error');
      setIsAuthenticating(false);
      onAuthError?.(error instanceof Error ? error.message : 'OAuth failed');
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'active': return 'text-green-600';
      case 'pending': return 'text-green-600'; // Treat pending as green since it works
      case 'error': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'initiating': return 'Starting OAuth...';
      case 'redirecting': return 'Opening authorization window...';
      case 'active': return 'Connected!';
      case 'pending': return 'Connected!'; // Treat pending as connected since it works
      case 'error': return 'Connection failed';
      case 'cancelled': return 'OAuth cancelled';
      default: return 'Not connected';
    }
  };

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

  if (inline) {
    // Inline version for use in chat messages
    return (
      <div className="flex flex-col space-y-2">        
        {/* Authentication button */}
        <button
          onClick={handleAuthenticate}
          disabled={isChecking || isAuthenticating || connectionStatus === 'active' || connectionStatus === 'pending'}
          className={`
            w-full px-4 py-2 rounded-md font-medium transition-colors text-sm
            ${isChecking || isAuthenticating || connectionStatus === 'active' || connectionStatus === 'pending'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }
          `}
        >
          {isChecking
            ? 'Checking...'
            : isAuthenticating 
              ? 'Authenticating...' 
              : (connectionStatus === 'active' || connectionStatus === 'pending')
                ? '✓ Connected' 
                : `Connect ${getServiceDisplayName(service)}`
          }
        </button>
      </div>
    );
  }

  // Original card version for test page
  return (
    <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
      <h3 className="font-semibold capitalize">{getServiceDisplayName(service)}</h3>
      <p className={`text-sm ${getStatusColor()}`}>
        {getStatusText()}
      </p>
      <button
        onClick={handleAuthenticate}
        disabled={isChecking || isAuthenticating || connectionStatus === 'active' || connectionStatus === 'pending'}
        className={`
          px-4 py-2 rounded-md font-medium transition-colors
          ${isChecking || isAuthenticating || connectionStatus === 'active' || connectionStatus === 'pending'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {isChecking
          ? 'Checking...'
          : isAuthenticating 
            ? 'Authenticating...' 
            : (connectionStatus === 'active' || connectionStatus === 'pending')
              ? 'Connected' 
              : `Connect ${getServiceDisplayName(service)}`
        }
      </button>
    </div>
  );
};

export default ComposioAuthButton;