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

// Create a context to pass the auth config if needed
const AuthConfigContext = createContext<AuthConfig | null>(null);

/**
 * AuthContextProvider component that wraps the app with auth context
 */
export function AuthContextProvider({ children, authConfig }: AuthContextProviderProps) {
  return (
    <AuthConfigContext.Provider value={authConfig}>
      {children}
    </AuthConfigContext.Provider>
  );
}

/**
 * Hook to access auth context - re-exports the Better Auth context
 */
export function useAuthContext() {
  return useBetterAuthContext();
}

/**
 * Hook to access auth config
 */
export function useAuthConfig() {
  const config = useContext(AuthConfigContext);
  return config;
}

export default AuthContextProvider; 