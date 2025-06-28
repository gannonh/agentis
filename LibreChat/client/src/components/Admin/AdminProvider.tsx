/**
 * @fileoverview Admin context provider for Better-auth admin plugin
 * @module components/Admin/AdminProvider
 */

import React, { createContext, useContext } from 'react';
import { authClient } from '~/config/betterAuth';
import { logger } from '~/services/logger';
import type { AdminUser, AdminSession, CreateUserData, AdminRole } from '~/config/betterAuth';

interface AdminContextValue {
  // Admin user management
  users: AdminUser[];
  totalUsers: number;
  loadUsers: (query?: UserListQuery) => Promise<void>;
  createUser: (userData: CreateUserData) => Promise<AdminUser>;
  setUserRole: (userId: string, role: 'user' | 'admin') => Promise<void>;
  updateUser: (userId: string, updates: { name?: string; email?: string }) => Promise<void>;
  listUserSessions: (userId: string) => Promise<AdminSession[]>;
  revokeUserSessions: (userId: string) => Promise<void>;

  // Admin analytics
  getUserStats: () => Promise<UserStats>;
  getSessionStats: () => Promise<SessionStats>;

  // User management
  banUser: (userId: string, reason?: string, banExpiresIn?: number) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;

  // Loading states
  isLoadingUsers: boolean;
  isLoadingStats: boolean;
}

interface UserListQuery {
  limit?: number;
  offset?: number;
  searchField?: 'email' | 'name';
  searchOperator?: 'contains' | 'starts_with' | 'ends_with';
  searchValue?: string;
  filterField?: string;
  filterOperator?: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains';
  filterValue?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number;
}

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

interface AdminProviderProps {
  children: React.ReactNode;
}

/**
 * Admin context provider component
 * Provides Better-auth admin plugin functionality
 */
export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);

  const loadUsers = React.useCallback(async (query?: UserListQuery) => {
    logger.info('Starting to load users', {
      component: 'AdminProvider',
      action: 'loadUsers-start',
      query,
    });
    setIsLoadingUsers(true);
    try {
      const response = await authClient.admin.listUsers({
        query: query || { limit: 20 }, // Default to 20 users per page
      });
      logger.info('Admin listUsers response received', {
        component: 'AdminProvider',
        action: 'listUsers',
        response,
      });

      // Better Auth returns users, total, limit, offset
      const responseData = response as any;

      // The response might be nested differently
      const users = responseData?.users || responseData?.data?.users || responseData || [];
      const total = responseData?.total || responseData?.data?.total || users.length || 0;

      // Transform the response to match our AdminUser interface
      const transformedUsers: AdminUser[] = users.map((user: any) => ({
        id: user.id,
        name: user.name || '',
        email: user.email,
        emailVerified: user.emailVerified || false,
        image: user.image || null,
        role: (user.role || 'user') as AdminRole,
        banned: user.banned || false,
        banReason: user.banReason || null,
        banExpires: user.banExpires || null,
        createdAt: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: user.updatedAt
          ? new Date(user.updatedAt).toISOString()
          : new Date().toISOString(),
        lastLoginAt: null, // Better Auth doesn't provide lastLoginAt field
      }));
      setUsers(transformedUsers);
      setTotalUsers(total);
      logger.info('Users transformed for admin interface', {
        component: 'AdminProvider',
        action: 'transformUsers',
        userCount: transformedUsers.length,
        totalUsers: total,
      });
    } catch (error) {
      logger.error(
        'Failed to load users',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'loadUsers',
        },
      );
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Load users data manually since Better-auth admin plugin doesn't provide hooks
  React.useEffect(() => {
    logger.info('AdminProvider initialized', {
      component: 'AdminProvider',
      action: 'initialize',
    });
    loadUsers();
  }, [loadUsers]);

  const createUser = async (userData: CreateUserData): Promise<AdminUser> => {
    try {
      // Check if email already exists in current user list
      const existingUser = users.find(user => 
        user.email.toLowerCase() === userData.email.toLowerCase()
      );
      
      if (existingUser) {
        throw new Error(`A user with email ${userData.email} already exists.`);
      }

      // Match the exact format from Better Auth documentation
      const requestData = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'user',
        data: userData.data || {},
      };

      const response = await authClient.admin.createUser(requestData);

      // The response might be the user directly or wrapped in a data/user property
      const responseUser = response?.user || response?.data?.user || response;

      if (responseUser && responseUser.id) {
        const newUser: AdminUser = {
          id: responseUser.id,
          name: responseUser.name || '',
          email: responseUser.email,
          emailVerified: responseUser.emailVerified || false,
          image: responseUser.image || null,
          role: (responseUser.role || 'user') as AdminRole,
          banned: responseUser.banned || false,
          banReason: responseUser.banReason || null,
          banExpires: responseUser.banExpires || null,
          createdAt: responseUser.createdAt
            ? new Date(responseUser.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: responseUser.updatedAt
            ? new Date(responseUser.updatedAt).toISOString()
            : new Date().toISOString(),
          lastLoginAt: null, // Better Auth doesn't provide lastLoginAt field
        };
        setUsers((prev) => [...prev, newUser]);

        // Refresh the user list to ensure consistency
        loadUsers();

        return newUser;
      }
      throw new Error('Failed to create user - no user data in response');
    } catch (error: any) {
      // Log detailed error information
      logger.error('API Error details', error, {
        component: 'AdminProvider',
        action: 'createUser-error',
        email: userData.email,
        status: error?.status,
        statusText: error?.statusText,
        responseData: error?.response?.data,
        fullError: error,
      });

      // Handle specific error types
      if (error?.code === 'USER_ALREADY_EXISTS') {
        throw new Error(`A user with email ${userData.email} already exists.`);
      }
      
      // Parse error message from API response - try multiple possible error locations
      let errorMessage = 'Failed to create user';
      
      // Check for HTTP status 400 (Bad Request) which likely means duplicate email
      if (error?.status === 400 || error?.response?.status === 400) {
        errorMessage = `A user with email ${userData.email} already exists.`;
      }
      // Try to get specific error message from response
      else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message && !error.message.includes('Failed to fetch')) {
        errorMessage = error.message;
      }
      
      const finalError = new Error(errorMessage);
      logger.error(
        'Failed to create user',
        finalError,
        {
          component: 'AdminProvider',
          action: 'createUser',
          email: userData.email,
        },
      );
      throw finalError;
    }
  };

  const setUserRole = async (userId: string, role: 'user' | 'admin'): Promise<void> => {
    try {
      await authClient.admin.setRole({
        userId,
        role,
      });

      // Update local state
      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
    } catch (error) {
      logger.error(
        'Failed to set user role',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'setUserRole',
          userId,
          role,
        },
      );
      throw error;
    }
  };

  const updateUser = async (
    userId: string,
    updates: { name?: string; email?: string },
  ): Promise<void> => {
    try {
      // Call our custom admin update endpoint
      const response = await fetch(`/api/user/admin/update/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const { user: updatedUser } = await response.json();

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                name: updatedUser.name || user.name,
                email: updatedUser.email || user.email,
              }
            : user,
        ),
      );

      logger.info('User updated successfully', {
        component: 'AdminProvider',
        action: 'updateUser',
        userId,
        updates,
      });
    } catch (error) {
      logger.error(
        'Failed to update user',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'updateUser',
          userId,
          updates,
        },
      );
      throw error;
    }
  };

  const listUserSessions = async (userId: string): Promise<AdminSession[]> => {
    try {
      const response = await authClient.admin.listUserSessions({
        userId,
      });

      logger.debug('Session API response received', {
        component: 'AdminProvider',
        action: 'listUserSessions',
        userId,
        sessionCount: Array.isArray(response) ? response.length : 'unknown',
      });

      // Better Auth might return the sessions directly or wrapped in data
      const sessions =
        (response as any)?.sessions || (response as any)?.data?.sessions || response || [];

      if (Array.isArray(sessions)) {
        return sessions.map((session: any) => ({
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          ipAddress: session.ipAddress || session.ip,
          userAgent: session.userAgent,
        }));
      }

      return [];
    } catch (error) {
      logger.error(
        'Failed to list user sessions',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'listUserSessions',
          userId,
        },
      );
      throw error;
    }
  };

  const revokeUserSessions = async (userId: string): Promise<void> => {
    try {
      await authClient.admin.revokeUserSessions({
        userId,
      });
    } catch (error) {
      logger.error(
        'Failed to revoke user sessions',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'revokeUserSessions',
          userId,
        },
      );
      throw error;
    }
  };

  const getUserStats = async (): Promise<UserStats> => {
    setIsLoadingStats(true);
    try {
      // Calculate stats from users data
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalUsers = users.length;
      // Since Better Auth doesn't provide lastLoginAt, we'll consider all non-banned users as potentially active
      // In a real implementation, you'd track this separately
      const activeUsers = users.filter((user) => !user.banned).length;

      const newUsersToday = users.filter((user) => {
        const createdAt = new Date(user.createdAt);
        return createdAt >= today;
      }).length;

      const newUsersThisWeek = users.filter((user) => {
        const createdAt = new Date(user.createdAt);
        return createdAt >= weekAgo;
      }).length;

      const newUsersThisMonth = users.filter((user) => {
        const createdAt = new Date(user.createdAt);
        return createdAt >= monthAgo;
      }).length;

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
      };
    } catch (error) {
      logger.error(
        'Failed to get user stats',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'getUserStats',
        },
      );
      throw error;
    } finally {
      setIsLoadingStats(false);
    }
  };

  const banUser = async (userId: string, reason?: string, banExpiresIn?: number): Promise<void> => {
    try {
      const banData: any = {
        userId,
        banReason: reason || 'No reason provided',
      };

      // Only add banExpiresIn if it's provided (undefined means permanent ban)
      if (banExpiresIn !== undefined) {
        banData.banExpiresIn = banExpiresIn;
      }

      await authClient.admin.banUser(banData);

      // Calculate ban expiration date for local state
      let banExpires: string | null = null;
      if (banExpiresIn !== undefined && banExpiresIn > 0) {
        const expirationDate = new Date();
        expirationDate.setSeconds(expirationDate.getSeconds() + banExpiresIn);
        banExpires = expirationDate.toISOString();
      }

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                banned: true,
                banReason: reason || 'No reason provided',
                banExpires,
              }
            : user,
        ),
      );

      logger.info('User banned successfully', {
        component: 'AdminProvider',
        action: 'banUser',
        userId,
        banExpiresIn,
      });
    } catch (error) {
      logger.error(
        'Failed to ban user',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'banUser',
          userId,
        },
      );
      throw error;
    }
  };

  const unbanUser = async (userId: string): Promise<void> => {
    try {
      await authClient.admin.unbanUser({
        userId,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                banned: false,
                banReason: null,
                banExpires: null,
              }
            : user,
        ),
      );

      logger.info('User unbanned successfully', {
        component: 'AdminProvider',
        action: 'unbanUser',
        userId,
      });
    } catch (error) {
      logger.error(
        'Failed to unban user',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'unbanUser',
          userId,
        },
      );
      throw error;
    }
  };

  const getSessionStats = async (): Promise<SessionStats> => {
    try {
      // For now, return estimated session stats since fetching all user sessions might be expensive
      // In a real implementation, you'd want to get this from an aggregated endpoint
      const estimatedActiveSessions = users.filter((user) => !user.banned).length;

      return {
        totalSessions: estimatedActiveSessions * 2, // Estimate 2 sessions per active user
        activeSessions: estimatedActiveSessions, // At least one session per active user
        averageSessionDuration: 2.5, // Estimate 2.5 hours average
      };
    } catch (error) {
      logger.error(
        'Failed to get session stats',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'AdminProvider',
          action: 'getSessionStats',
        },
      );
      throw error;
    }
  };

  const value: AdminContextValue = {
    users,
    totalUsers,
    loadUsers,
    createUser,
    setUserRole,
    updateUser,
    listUserSessions,
    revokeUserSessions,
    getUserStats,
    getSessionStats,
    banUser,
    unbanUser,
    isLoadingUsers,
    isLoadingStats,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

/**
 * Hook to use admin context
 */
export const useAdmin = (): AdminContextValue => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
