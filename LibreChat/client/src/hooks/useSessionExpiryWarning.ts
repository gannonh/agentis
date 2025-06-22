/**
 * @fileoverview Hook for managing session expiry warnings
 * @module hooks/useSessionExpiryWarning
 *
 * This hook provides session expiry warning functionality:
 * - Monitors session expiration time
 * - Shows warning 5 minutes before expiry
 * - Handles session refresh
 * - Manages graceful re-authentication
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '~/config/betterAuth';

/**
 * Hook return type
 */
interface UseSessionExpiryWarningReturn {
  showWarning: boolean;
  timeRemaining: number; // in seconds
  formattedTime: string;
  isExpired: boolean;
  isRefreshing: boolean;
  refreshError: Error | null;
  isLoading: boolean;
  isDismissed: boolean;
  refreshSession: () => Promise<void>;
  dismissWarning: () => void;
}

/**
 * Constants
 */
const WARNING_THRESHOLD = 5 * 60; // 5 minutes in seconds
const SNOOZE_DURATION = 60; // 1 minute in seconds
const UPDATE_INTERVAL = 1000; // Update every second

/**
 * Hook for managing session expiry warnings
 *
 * This hook monitors the current session and provides warning functionality
 * when the session is about to expire. It handles:
 * - Real-time countdown to session expiry
 * - Warning display 5 minutes before expiry
 * - Session refresh functionality
 * - Graceful handling of expired sessions
 *
 * @returns {UseSessionExpiryWarningReturn} Session expiry warning state and methods
 */
export function useSessionExpiryWarning(): UseSessionExpiryWarningReturn {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<Error | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  // Calculate time remaining until session expires
  const calculateTimeRemaining = useCallback(() => {
    if (!session.data?.session?.expiresAt) {
      return 0;
    }

    const expiresAt = new Date(session.data.session.expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

    return remaining;
  }, [session.data?.session?.expiresAt]);

  // Format time remaining as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Check if warning should be shown
  const shouldShowWarning = useCallback(() => {
    if (timeRemaining <= 0 || timeRemaining > WARNING_THRESHOLD) {
      return false;
    }

    // Check if dismissed and still within snooze period
    if (isDismissed && dismissedAt) {
      const timeSinceDismissed = (Date.now() - dismissedAt) / 1000;
      if (timeSinceDismissed < SNOOZE_DURATION) {
        return false;
      } else {
        // Reset dismissal after snooze period
        setIsDismissed(false);
        setDismissedAt(null);
      }
    }

    return true;
  }, [timeRemaining, isDismissed, dismissedAt]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      // Better Auth automatically refreshes the session when it's used
      // and the updateAge threshold is met. We can trigger this by
      // making any authenticated request.
      // For now, we'll just wait for the next session update.
      // In a real implementation, you might want to call an API endpoint
      // that requires authentication to trigger the refresh.

      // Simulate refresh by waiting a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if session was refreshed
      const newTimeRemaining = calculateTimeRemaining();
      if (newTimeRemaining > WARNING_THRESHOLD) {
        setIsDismissed(false);
        setDismissedAt(null);
      } else {
        throw new Error('Session refresh failed');
      }
    } catch (error) {
      setRefreshError(error as Error);
    } finally {
      setIsRefreshing(false);
    }
  }, [calculateTimeRemaining]);

  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setIsDismissed(true);
    setDismissedAt(Date.now());
  }, []);

  // Update time remaining
  useEffect(() => {
    // Skip if session is loading
    if (session.isPending && !hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;

    const updateTimeRemaining = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Check if session expired
      if (remaining === 0 && session.data?.session) {
        // Clear session and navigate to login
        navigate('/login', { replace: true });
      }
    };

    // Initial update
    updateTimeRemaining();

    // Set up interval
    intervalRef.current = setInterval(updateTimeRemaining, UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [calculateTimeRemaining, navigate, session.data?.session, session.isPending]);

  // Handle session errors
  useEffect(() => {
    if (session.error) {
      setRefreshError(session.error);
    }
  }, [session.error]);

  return {
    showWarning: shouldShowWarning(),
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isExpired: timeRemaining === 0 && !!session.data?.session,
    isRefreshing,
    refreshError,
    isLoading: session.isPending,
    isDismissed,
    refreshSession,
    dismissWarning,
  };
}