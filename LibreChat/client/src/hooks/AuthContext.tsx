import {
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { SystemRoles } from 'librechat-data-provider';
import type * as t from 'librechat-data-provider';
import {
  useGetRole,
  useGetUserQuery,
  useLoginUserMutation,
  useGetSessionQuery,
} from '~/data-provider';
import { TAuthConfig, TUserContext, TAuthContext, TResError } from '~/common';
import useTimeout from './useTimeout';
import store from '~/store';

const AuthContext = createContext<TAuthContext | undefined>(undefined);

const AuthContextProvider = ({
  authConfig,
  children,
}: {
  authConfig?: TAuthConfig;
  children: ReactNode;
}) => {
  const [user, setUser] = useRecoilState(store.user);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [session, setSession] = useState<t.TBetterAuthSession | undefined>(undefined);
  const logoutRedirectRef = useRef<string | undefined>(undefined);

  const { data: userRole = null } = useGetRole(SystemRoles.USER, {
    enabled: !!(isAuthenticated && (user?.role ?? '')),
  });
  const { data: adminRole = null } = useGetRole(SystemRoles.ADMIN, {
    enabled: !!(isAuthenticated && user?.role === SystemRoles.ADMIN),
  });

  const navigate = useNavigate();

  const setUserContext = useCallback(
    (userContext: TUserContext) => {
      const { session, isAuthenticated, user, redirect, token } = userContext;
      setUser(user);
      setSession(session);
      setIsAuthenticated(isAuthenticated);

      // Legacy token support for backward compatibility during transition
      if (token && !session) {
        // If we still have a token but no session, we're in legacy mode
        // This ensures compatibility during the Better Auth migration
        console.warn('Using legacy token mode - Better Auth session not available');
      }

      // Use a custom redirect if set
      const finalRedirect = logoutRedirectRef.current || redirect;
      // Clear the stored redirect
      logoutRedirectRef.current = undefined;
      if (finalRedirect == null) {
        return;
      }
      if (finalRedirect.startsWith('http://') || finalRedirect.startsWith('https://')) {
        window.location.href = finalRedirect;
      } else {
        navigate(finalRedirect, { replace: true });
      }
    },
    [navigate, setUser],
  );
  const doSetError = useTimeout({ callback: (error) => setError(error as string | undefined) });

  const loginUser = useLoginUserMutation({
    onSuccess: (data: t.TLoginResponse) => {
      const { user, session, token, twoFAPending, tempToken } = data;
      if (twoFAPending) {
        // Redirect to the two-factor authentication route.
        navigate(`/login/2fa?tempToken=${tempToken}`, { replace: true });
        return;
      }
      setError(undefined);

      // Better Auth uses session-based authentication
      if (session && user) {
        setUserContext({ session, isAuthenticated: true, user, redirect: '/c/new' });
      } else if (token && user) {
        // Fallback to legacy token mode if session not available
        setUserContext({ token, isAuthenticated: true, user, redirect: '/c/new' });
      } else {
        doSetError('Authentication failed - no session or token received');
      }
    },
    onError: (error: TResError | unknown) => {
      const resError = error as TResError;
      doSetError(resError.message);
      navigate('/login', { replace: true });
    },
  });

  // Replace token refresh with session checking
  const sessionQuery = useGetSessionQuery({
    enabled: !isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const logout = useCallback(
    async (redirect?: string) => {
      const finalRedirect = redirect ?? '/login';
      console.log('Logout called with redirect:', finalRedirect);
      
      try {
        // Clear local state first
        setUser(undefined);
        setSession(undefined);
        setIsAuthenticated(false);
        
        // Sign out from Better Auth
        const { authClient } = await import('~/config/betterAuth');
        
        // Don't wait for the result, just fire and forget
        authClient.signOut().catch((error) => {
          console.error('Error signing out from Better Auth:', error);
        });
        
        // Use window.location for a hard redirect to ensure we leave the authenticated routes
        console.log('Hard redirecting to:', finalRedirect);
        window.location.href = finalRedirect;
      } catch (error) {
        console.error('Error during logout:', error);
        // Still navigate even if there's an error
        window.location.href = finalRedirect;
      }
    },
    [setUser, setSession, setIsAuthenticated],
  );

  const userQuery = useGetUserQuery({ enabled: !!isAuthenticated });

  // Handle session query results
  useEffect(() => {
    console.log('SessionQuery state:', {
      isLoading: sessionQuery.isLoading,
      isError: sessionQuery.isError,
      data: sessionQuery.data,
      error: sessionQuery.error,
      authConfigTest: authConfig?.test,
    });

    // Don't redirect if we're already on the login page
    const isOnAuthPage = window.location.pathname.includes('/login') || 
                        window.location.pathname.includes('/register');

    if (sessionQuery.data?.session && sessionQuery.data?.user) {
      console.log('Valid session found, setting authenticated');
      setUserContext({
        session: sessionQuery.data.session,
        isAuthenticated: true,
        user: sessionQuery.data.user,
      });
    } else if (sessionQuery.isError) {
      console.log('Session check error:', sessionQuery.error);
      if (authConfig?.test !== true && !isOnAuthPage) {
        console.log('Redirecting to login due to error');
        navigate('/login');
      }
    } else if (sessionQuery.data === null || (sessionQuery.data && !sessionQuery.data.session)) {
      console.log('No valid session found. User is not authenticated.');
      if (authConfig?.test !== true && !isOnAuthPage) {
        console.log('Redirecting to login due to no session');
        navigate('/login');
      }
    }
  }, [
    sessionQuery.data,
    sessionQuery.isError,
    sessionQuery.isLoading,
    sessionQuery.error,
    authConfig?.test,
    navigate,
    setUserContext,
  ]);

  const login = useCallback(
    (data: t.TLoginUser) => {
      loginUser.mutate(data);
    },
    [loginUser],
  );

  const checkSession = useCallback(() => {
    if (authConfig?.test === true) {
      console.log('Test mode. Skipping session check.');
      return;
    }

    // Trigger session refetch
    if (sessionQuery.refetch) {
      sessionQuery.refetch();
    }
  }, [authConfig?.test, sessionQuery]);

  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
    } else if (userQuery.isError) {
      doSetError((userQuery.error as Error).message);
      navigate('/login', { replace: true });
    }
    if (error != null && error && isAuthenticated) {
      doSetError(undefined);
    }
    if (session == null || !session || !isAuthenticated) {
      checkSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isAuthenticated, userQuery.data, userQuery.isError, userQuery.error, error]);
  // Note: silentRefresh, setUser, navigate, doSetError intentionally excluded to prevent circular dependencies

  useEffect(() => {
    const handleSessionUpdate = (event) => {
      console.log('sessionUpdated event received');
      const newSession = event.detail;
      setUserContext({
        session: newSession,
        isAuthenticated: true,
        user: user,
      });
    };

    window.addEventListener('sessionUpdated', handleSessionUpdate);

    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
    };
  }, [setUserContext, user]);

  // Make the provider update only when it should
  const memoedValue = useMemo(
    () => ({
      user,
      session,
      error,
      login,
      logout,
      setError,
      roles: {
        [SystemRoles.USER]: userRole,
        [SystemRoles.ADMIN]: adminRole,
      },
      isAuthenticated,
    }),

    [user, error, isAuthenticated, session, userRole, adminRole, login, logout],
  );

  return <AuthContext.Provider value={memoedValue}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext should be used inside AuthProvider');
  }

  return context;
};

export { AuthContextProvider, useAuthContext, AuthContext };
