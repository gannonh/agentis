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
      console.log('Admin listUsers response:', response);

      // Better Auth wraps the response in data property
      const users = (response as any)?.data?.users || (response as any)?.users || [];

      // Transform the response to match our AdminUser interface
      const transformedUsers: AdminUser[] = users.map((user: any) => ({
        id: user.id,
        name: user.name || '',
        email: user.email,
        emailVerified: user.emailVerified || false,
        image: user.image || null,
        role: (user.role || 'user') as AdminRole,
        banned: user.banned || false,
        createdAt: user.createdAt
          ? new Date(user.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: user.updatedAt
          ? new Date(user.updatedAt).toISOString()
          : new Date().toISOString(),
        lastLoginAt: null, // Better Auth doesn't provide lastLoginAt field
      }));
      setUsers(transformedUsers);
      console.log('Transformed users:', transformedUsers);
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

      const responseUser = (response as any)?.user;
      if (responseUser) {
        const newUser: AdminUser = {
          id: responseUser.id,
          name: responseUser.name || '',
          email: responseUser.email,
          emailVerified: responseUser.emailVerified || false,
          image: responseUser.image || null,
          role: (responseUser.role || 'user') as AdminRole,
          banned: responseUser.banned || false,
          createdAt: responseUser.createdAt
            ? new Date(responseUser.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: responseUser.updatedAt
            ? new Date(responseUser.updatedAt).toISOString()
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

      console.log('Raw session API response for user', userId, ':', response);

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
      console.error('Failed to get user stats:', error);
      throw error;
    } finally {
      setIsLoadingStats(false);
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
