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
      // Check if window is available (not in test environment)
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Check if window is available (not in test environment)
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  // Map Better Auth user to legacy user format
  const user = session?.user ? {
    ...session.user,
    // Add legacy fields that components expect
    avatar: session.user.image || '',
    provider: 'local', // Default provider
    role: 'user', // Default role for permission system
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
    roles: {
      // TODO: TEMPORARY FIX - Replace with proper role-based permission system
      // This hardcoded permissions object is a temporary solution during Better Auth migration
      // to restore agents/prompts functionality. Should be replaced with:
      // 1. Dynamic role loading from backend API
      // 2. Proper multi-tenant role inheritance 
      // 3. Organization-level permission overrides
      // 4. User-specific role assignments
      // See: auth multi-tenant refactor tasks for proper implementation
      user: {
        permissions: {
          AGENTS: {
            USE: true,
            CREATE: true,
            SHARE: true,
          },
          PROMPTS: {
            USE: true,
            CREATE: true,
            SHARE: true,
          },
          BOOKMARKS: {
            USE: true,
            CREATE: true,
          },
          MULTI_CONVO: {
            USE: true,
          },
          EXECUTE_CODE: {
            USE: true,
          },
        },
      },
    },
  };
}