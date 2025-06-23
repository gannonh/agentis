/**
 * AuthContext using Better Auth
 * Provides authentication context for components that need auth state
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthContext as useBetterAuthContext } from './useAuthContext';

interface AuthConfig {
  loginRedirect: string;
  test?: boolean;
}

interface AuthContextProviderProps {
  children: ReactNode;
  authConfig: AuthConfig;
}

// Create contexts for both auth config and auth state
const AuthConfigContext = createContext<AuthConfig | null>(null);
const AuthStateContext = createContext<ReturnType<typeof useBetterAuthContext> | null>(null);

/**
 * AuthContextProvider component that wraps the app with auth context
 */
export function AuthContextProvider({ children, authConfig }: AuthContextProviderProps) {
  const authState = useBetterAuthContext();

  return (
    <AuthConfigContext.Provider value={authConfig}>
      <AuthStateContext.Provider value={authState}>{children}</AuthStateContext.Provider>
    </AuthConfigContext.Provider>
  );
}

/**
 * Hook to access auth context - throws error if used outside provider
 */
export function useAuthContext() {
  const context = useContext(AuthStateContext);
  if (context === null) {
    throw new Error('useAuthContext is not a function');
  }
  return context;
}

/**
 * Hook to access auth config
 */
export function useAuthConfig() {
  const config = useContext(AuthConfigContext);
  return config;
}

export default AuthContextProvider;
