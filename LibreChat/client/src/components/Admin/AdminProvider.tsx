/**
 * @fileoverview Admin context provider for Better-auth admin plugin
 * @module components/Admin/AdminProvider
 */

import React, { createContext, useContext } from 'react';
import { authClient } from '~/config/betterAuth';
import type { AdminUser, AdminSession, CreateUserData, AdminRole } from '~/config/betterAuth';

interface AdminContextValue {
  // Admin user management
  users: AdminUser[];
  createUser: (userData: CreateUserData) => Promise<AdminUser>;
  setUserRole: (userId: string, role: 'user' | 'admin') => Promise<void>;
  listUserSessions: (userId: string) => Promise<AdminSession[]>;
  revokeUserSessions: (userId: string) => Promise<void>;

  // Admin analytics
  getUserStats: () => Promise<UserStats>;
  getSessionStats: () => Promise<SessionStats>;

  // Loading states
  isLoadingUsers: boolean;
  isLoadingStats: boolean;
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
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);

  // Load users data manually since Better-auth admin plugin doesn't provide hooks
  React.useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await authClient.admin.listUsers({
        query: { limit: 1000 }, // Get all users
      });
      if (response.data) {
        // Transform the response to match our AdminUser interface
        const transformedUsers: AdminUser[] = response.data.users.map((user: any) => ({
          id: user.user.id,
          name: user.user.name,
          email: user.user.email,
          emailVerified: user.user.emailVerified,
          image: user.user.image,
          role: (user.user.role || 'user') as AdminRole,
          banned: user.user.banned,
          createdAt: user.user.createdAt
            ? new Date(user.user.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: user.user.updatedAt
            ? new Date(user.user.updatedAt).toISOString()
            : new Date().toISOString(),
          lastLoginAt: null, // Better Auth doesn't provide lastLoginAt field
        }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const createUser = async (userData: CreateUserData): Promise<AdminUser> => {
    try {
      const response = await authClient.admin.createUser({
        email: userData.email,
        password: userData.password,
        name: userData.name,
        role: userData.role || 'user',
        data: {
          emailVerified: userData.emailVerified || false,
          ...userData.data,
        },
      });

      if (response.data) {
        const newUser: AdminUser = {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          emailVerified: response.data.user.emailVerified,
          image: response.data.user.image,
          role: (response.data.user.role || 'user') as AdminRole,
          banned: response.data.user.banned,
          createdAt: response.data.user.createdAt
            ? new Date(response.data.user.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: response.data.user.updatedAt
            ? new Date(response.data.user.updatedAt).toISOString()
            : new Date().toISOString(),
          lastLoginAt: null, // Better Auth doesn't provide lastLoginAt field
        };
        setUsers((prev) => [...prev, newUser]);
        return newUser;
      }
      throw new Error('Failed to create user');
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
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
      console.error('Failed to set user role:', error);
      throw error;
    }
  };

  const listUserSessions = async (userId: string): Promise<AdminSession[]> => {
    try {
      const response = await authClient.admin.listUserSessions({
        userId,
      });

      if (response.data) {
        return response.data.sessions.map((session: any) => ({
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to list user sessions:', error);
      throw error;
    }
  };

  const revokeUserSessions = async (userId: string): Promise<void> => {
    try {
      await authClient.admin.revokeUserSessions({
        userId,
      });
    } catch (error) {
      console.error('Failed to revoke user sessions:', error);
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
      const activeUsers = users.filter((user) => {
        // Assume user is active if they've logged in within the last 30 days
        const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
        return lastLogin && lastLogin > monthAgo;
      }).length;

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
      console.error('Failed to get user stats:', error);
      throw error;
    } finally {
      setIsLoadingStats(false);
    }
  };

  const getSessionStats = async (): Promise<SessionStats> => {
    try {
      // Get session stats by aggregating all user sessions
      const allSessions: AdminSession[] = [];

      for (const user of users) {
        try {
          const userSessions = await listUserSessions(user.id);
          allSessions.push(...userSessions);
        } catch (error) {
          // Skip users we can't access sessions for
          continue;
        }
      }

      const activeSessions = allSessions.filter(
        (session) => !session.expiresAt || new Date(session.expiresAt) > new Date(),
      ).length;

      // Calculate average session duration (simplified)
      const totalDuration = allSessions.reduce((acc, session) => {
        if (session.expiresAt) {
          const duration =
            new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime();
          return acc + duration;
        }
        return acc;
      }, 0);

      const averageSessionDuration =
        allSessions.length > 0 ? totalDuration / allSessions.length / (1000 * 60 * 60) : 0; // in hours

      return {
        totalSessions: allSessions.length,
        activeSessions,
        averageSessionDuration,
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      throw error;
    }
  };

  const value: AdminContextValue = {
    users,
    createUser,
    setUserRole,
    listUserSessions,
    revokeUserSessions,
    getUserStats,
    getSessionStats,
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
