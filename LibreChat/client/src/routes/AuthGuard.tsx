import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '~/hooks/AuthContext';
import { useGetSessionQuery } from '~/data-provider';

/**
 * AuthGuard component that handles root path routing
 * Waits for authentication check before redirecting to avoid flash
 */
export default function AuthGuard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  
  // Check session status without refetching if already authenticated
  const { data: sessionData, isLoading } = useGetSessionQuery({
    enabled: !isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // If we're already authenticated, go to chat
    if (isAuthenticated) {
      navigate('/c/new', { replace: true });
      return;
    }

    // If session query is complete and user is not authenticated, go to login
    if (!isLoading && (!sessionData?.session || !sessionData?.user)) {
      navigate('/login', { replace: true });
      return;
    }

    // If session exists but context hasn't updated yet, wait for context update
    // The AuthContext will handle setting isAuthenticated to true
    if (sessionData?.session && sessionData?.user && !isAuthenticated) {
      // Context update is in progress, do nothing - let AuthContext handle it
      return;
    }
  }, [isAuthenticated, sessionData, isLoading, navigate]);

  // Show loading state while checking authentication
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
        <div className="text-gray-600">Loading...</div>
      </div>
    </div>
  );
}