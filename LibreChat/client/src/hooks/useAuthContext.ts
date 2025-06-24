/**
 * Compatibility hook for useAuthContext using Better Auth
 * This provides the same interface as the old AuthContext for components that haven't been migrated yet
 */
import { useNavigate } from 'react-router-dom';
import { authClient } from '../config/betterAuth';

export function useAuthContext() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await authClient.signOut();
      // Use React Router navigation instead of window.location.href
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
      // Use React Router navigation for error case too
      navigate('/login', { replace: true });
    }
  };

  // Map Better Auth user to legacy user format
  const user = session?.user
    ? {
        ...session.user,
        // Add legacy fields that components expect
        avatar: session.user.image || '',
        provider: 'local', // Default provider
        role: session.user.role || 'user', // Use actual role from Better Auth session
        // Convert dates to strings to match TUser type
        createdAt: session.user.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: session.user.updatedAt?.toISOString() || new Date().toISOString(),
        // Add missing fields with default values
        plugins: (session.user as any).plugins || [],
        twoFactorEnabled: (session.user as any).twoFactorEnabled || false,
        backupCodes: (session.user as any).backupCodes || [],
        // Keep all Better Auth fields
      }
    : null;

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
      admin: {
        permissions: {
          AGENTS: {
            USE: true,
            CREATE: true,
            SHARE: true,
            SHARED_GLOBAL: true,
          },
          PROMPTS: {
            USE: true,
            CREATE: true,
            SHARE: true,
            SHARED_GLOBAL: true,
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
