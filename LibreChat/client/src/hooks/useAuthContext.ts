/**
 * Compatibility hook for useAuthContext using Better Auth
 * This provides the same interface as the old AuthContext for components that haven't been migrated yet
 */
import { authClient } from '../config/betterAuth';

export function useAuthContext() {
  const { data: session } = authClient.useSession();
  
  const logout = async () => {
    try {
      await authClient.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/login';
    }
  };

  // Map Better Auth user to legacy user format
  const user = session?.user ? {
    ...session.user,
    // Add legacy fields that components expect
    avatar: session.user.image || '',
    provider: 'local', // Default provider
    // Keep all Better Auth fields
  } : null;

  return {
    user,
    isAuthenticated: !!session?.user,
    session: session || null,
    logout,
    // Legacy fields for compatibility - these can be removed as components are migrated
    error: null,
    login: () => {}, // Not used in new flow
    setError: () => {}, // Not used in new flow
    roles: {}, // Not used in new flow
  };
}