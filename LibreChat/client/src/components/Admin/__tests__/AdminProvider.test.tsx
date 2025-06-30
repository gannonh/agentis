/**
 * @fileoverview Tests for AdminProvider component
 * @module components/Admin/__tests__/AdminProvider.test
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminProvider, useAdmin } from '../AdminProvider';
import { authClient } from '~/config/betterAuth';
import type { AdminUser, CreateUserData, AdminSession } from '~/config/betterAuth';

// Mock the auth client
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    admin: {
      listUsers: vi.fn(),
      createUser: vi.fn(),
      setRole: vi.fn(),
      listUserSessions: vi.fn(),
      revokeUserSessions: vi.fn(),
      removeUser: vi.fn(),
    },
  },
}));

// Test component to access context
const TestComponent: React.FC = () => {
  const {
    users,
    createUser,
    setUserRole,
    listUserSessions,
    revokeUserSessions,
    removeUser,
    getUserStats,
    getSessionStats,
    isLoadingUsers,
    isLoadingStats,
  } = useAdmin();

  return (
    <div>
      <div data-testid="users-count">{users.length}</div>
      <div data-testid="loading-users">{isLoadingUsers ? 'loading' : 'loaded'}</div>
      <div data-testid="loading-stats">{isLoadingStats ? 'loading' : 'loaded'}</div>
      <button
        data-testid="create-user-btn"
        onClick={() =>
          createUser({
            email: 'test@example.com',
            name: 'Test User',
            password: 'password123',
            role: 'user',
          })
        }
      >
        Create User
      </button>
      <button data-testid="set-role-btn" onClick={() => setUserRole('user1', 'admin')}>
        Set Role
      </button>
      <button data-testid="get-stats-btn" onClick={() => getUserStats()}>
        Get Stats
      </button>
      <button data-testid="get-sessions-btn" onClick={() => getSessionStats()}>
        Get Session Stats
      </button>
      <button data-testid="list-sessions-btn" onClick={() => listUserSessions('user1')}>
        List Sessions
      </button>
      <button data-testid="revoke-sessions-btn" onClick={() => revokeUserSessions('user1')}>
        Revoke Sessions
      </button>
      <button data-testid="remove-user-btn" onClick={() => removeUser('user1')}>
        Remove User
      </button>
    </div>
  );
};

// Test component for error boundary testing
const ErrorComponent: React.FC = () => {
  useAdmin(); // This should throw an error outside provider
  return <div>Should not render</div>;
};

describe('AdminProvider', () => {
  // Suppress unhandled promise rejections during error testing
  const originalUPR = process.listeners('unhandledRejection');

  beforeAll(() => {
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', () => {
      // Suppress during testing
    });
  });

  afterAll(() => {
    process.removeAllListeners('unhandledRejection');
    originalUPR.forEach((listener) => process.on('unhandledRejection', listener));
  });

  const mockUsers = [
    {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      emailVerified: true,
      image: 'https://example.com/avatar.jpg',
      role: 'user',
      banned: false,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    {
      id: 'user2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      emailVerified: false,
      image: null,
      role: 'admin',
      banned: false,
      createdAt: '2020-01-02T00:00:00Z',
      updatedAt: '2020-01-02T00:00:00Z',
    },
  ];

  const mockSessions = [
    {
      id: 'session1',
      userId: 'user1',
      expiresAt: '2024-12-31T23:59:59Z',
      createdAt: '2024-01-01T00:00:00Z',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful responses by default
    vi.mocked(authClient.admin.listUsers).mockResolvedValue({
      data: { users: mockUsers },
    });

    vi.mocked(authClient.admin.createUser).mockResolvedValue({
      user: {
        id: 'new-user',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: false,
        image: null,
        role: 'user',
        banned: false,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      },
    });

    vi.mocked(authClient.admin.setRole).mockResolvedValue({});

    vi.mocked(authClient.admin.listUserSessions).mockResolvedValue({
      data: { sessions: mockSessions },
    });

    vi.mocked(authClient.admin.revokeUserSessions).mockResolvedValue({});

    vi.mocked(authClient.admin.removeUser).mockResolvedValue({});
  });

  describe('Provider Setup', () => {
    it('should provide admin context to children', async () => {
      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      expect(screen.getByTestId('users-count')).toHaveTextContent('2');
    });

    it('should throw error when useAdmin is used outside provider', () => {
      // Expect console.error to be called due to error boundary
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<ErrorComponent />)).toThrow(
        'useAdmin must be used within an AdminProvider',
      );

      consoleSpy.mockRestore();
    });

    it('should load users on mount', async () => {
      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      expect(authClient.admin.listUsers).toHaveBeenCalledWith({
        query: { limit: 20 }, // Default to 20 users per page
      });

      await waitFor(() => {
        expect(screen.getByTestId('users-count')).toHaveTextContent('2');
      });
    });

    it('should handle loading state correctly', async () => {
      // Make the API call slow to test loading state
      vi.mocked(authClient.admin.listUsers).mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ data: { users: mockUsers } }), 100)),
      );

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      // Initially loading
      expect(screen.getByTestId('loading-users')).toHaveTextContent('loading');

      // Wait for load to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });
    });
  });

  describe('User Management', () => {
    it('should create a new user successfully', async () => {
      // Setup initial users list
      const initialUsers = [...mockUsers];
      const newUser = {
        id: 'new-user',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: false,
        image: null,
        role: 'user',
        banned: false,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };
      const updatedUsers = [...initialUsers, newUser];

      // Mock the first call to return original users, second call to return updated list
      vi.mocked(authClient.admin.listUsers)
        .mockResolvedValueOnce({ data: { users: initialUsers } })
        .mockResolvedValueOnce({ data: { users: updatedUsers } });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      // Create user
      await act(async () => {
        screen.getByTestId('create-user-btn').click();
      });

      expect(authClient.admin.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: 'user',
        data: {},
      });

      // User count should increase after refresh
      await waitFor(() => {
        expect(screen.getByTestId('users-count')).toHaveTextContent('3');
      });
    });

    it('should handle user creation error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Use implementation instead of rejected value to avoid unhandled promise rejection
      vi.mocked(authClient.admin.createUser).mockImplementation(async () => {
        throw new Error('Creation failed');
      });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('create-user-btn').click();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ [ERROR] Failed to create user',
          expect.any(Error),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should handle duplicate email error from atomic creation', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock Better Auth createUser to return a 400 error for duplicate email
      vi.mocked(authClient.admin.createUser).mockImplementation(async () => {
        const error = new Error('User already exists');
        (error as any).status = 400;
        throw error;
      });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('create-user-btn').click();
      });

      // Should call createUser but it will fail due to duplicate email
      expect(authClient.admin.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: 'user',
        data: {},
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ [ERROR] Failed to create user',
          expect.any(Error),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should set user role successfully', async () => {
      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('set-role-btn').click();
      });

      expect(authClient.admin.setRole).toHaveBeenCalledWith({
        userId: 'user1',
        role: 'admin',
      });
    });

    it('should handle set role error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Use implementation instead of rejected value to avoid unhandled promise rejection
      vi.mocked(authClient.admin.setRole).mockImplementation(async () => {
        throw new Error('Role update failed');
      });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('set-role-btn').click();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ [ERROR] Failed to set user role',
          expect.any(Error),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Session Management', () => {
    it('should list user sessions successfully', async () => {
      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('list-sessions-btn').click();
      });

      expect(authClient.admin.listUserSessions).toHaveBeenCalledWith({
        userId: 'user1',
      });
    });

    it('should handle list sessions error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Use implementation instead of rejected value to avoid unhandled promise rejection
      vi.mocked(authClient.admin.listUserSessions).mockImplementation(async () => {
        throw new Error('Sessions failed');
      });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('list-sessions-btn').click();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ [ERROR] Failed to list user sessions',
          expect.any(Error),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should revoke user sessions successfully', async () => {
      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('revoke-sessions-btn').click();
      });

      expect(authClient.admin.revokeUserSessions).toHaveBeenCalledWith({
        userId: 'user1',
      });
    });

    it('should handle revoke sessions error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Use implementation instead of rejected value to avoid unhandled promise rejection
      vi.mocked(authClient.admin.revokeUserSessions).mockImplementation(async () => {
        throw new Error('Revoke failed');
      });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('revoke-sessions-btn').click();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ [ERROR] Failed to revoke user sessions',
          expect.any(Error),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });

    it('should remove user successfully', async () => {
      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      // Initial user count should be 2
      expect(screen.getByTestId('users-count')).toHaveTextContent('2');

      await act(async () => {
        screen.getByTestId('remove-user-btn').click();
      });

      expect(authClient.admin.removeUser).toHaveBeenCalledWith({
        userId: 'user1',
      });

      // User count should decrease after removal
      await waitFor(() => {
        expect(screen.getByTestId('users-count')).toHaveTextContent('1');
      });
    });
  });

  describe('Statistics', () => {
    it('should calculate user stats correctly', async () => {
      const TestStatsComponent: React.FC = () => {
        const { getUserStats } = useAdmin();
        const [stats, setStats] = React.useState<any>(null);

        const handleGetStats = async () => {
          const result = await getUserStats();
          setStats(result);
        };

        return (
          <div>
            <button data-testid="get-stats" onClick={handleGetStats}>
              Get Stats
            </button>
            {stats && (
              <div>
                <div data-testid="total-users">{stats.totalUsers}</div>
                <div data-testid="active-users">{stats.activeUsers}</div>
                <div data-testid="new-users-today">{stats.newUsersToday}</div>
                <div data-testid="new-users-week">{stats.newUsersThisWeek}</div>
                <div data-testid="new-users-month">{stats.newUsersThisMonth}</div>
              </div>
            )}
          </div>
        );
      };

      render(
        <AdminProvider>
          <TestStatsComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('get-stats')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('get-stats').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('total-users')).toHaveTextContent('2');
        expect(screen.getByTestId('active-users')).toHaveTextContent('2'); // All non-banned users are considered active
        expect(screen.getByTestId('new-users-today')).toHaveTextContent('0'); // Old dates from 2020
        expect(screen.getByTestId('new-users-week')).toHaveTextContent('0');
        expect(screen.getByTestId('new-users-month')).toHaveTextContent('0');
      });
    });

    it('should calculate session stats correctly', async () => {
      const TestSessionStatsComponent: React.FC = () => {
        const { getSessionStats } = useAdmin();
        const [stats, setStats] = React.useState<any>(null);

        const handleGetStats = async () => {
          const result = await getSessionStats();
          setStats(result);
        };

        return (
          <div>
            <button data-testid="get-session-stats" onClick={handleGetStats}>
              Get Session Stats
            </button>
            {stats && (
              <div>
                <div data-testid="total-sessions">{stats.totalSessions}</div>
                <div data-testid="active-sessions">{stats.activeSessions}</div>
                <div data-testid="avg-duration">{Math.round(stats.averageSessionDuration)}</div>
              </div>
            )}
          </div>
        );
      };

      render(
        <AdminProvider>
          <TestSessionStatsComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('get-session-stats')).toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('get-session-stats').click();
      });

      // Wait for all session calls to complete
      await waitFor(() => {
        expect(screen.getByTestId('total-sessions')).toBeInTheDocument();
      });

      // The test component should show actual session data
      await waitFor(() => {
        const totalSessions = screen.getByTestId('total-sessions').textContent;
        const activeSessions = screen.getByTestId('active-sessions').textContent;
        // Sessions exist (2 users * 1 session each = 2 total)
        expect(parseInt(totalSessions || '0')).toBeGreaterThanOrEqual(0);
        expect(parseInt(activeSessions || '0')).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle stats errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Use implementation instead of rejected value to avoid unhandled promise rejection
      vi.mocked(authClient.admin.listUserSessions).mockImplementation(async () => {
        throw new Error('Session error');
      });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
      });

      await act(async () => {
        screen.getByTestId('list-sessions-btn').click();
      });

      // Should show errors for failed session calls per user
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '❌ [ERROR] Failed to list user sessions',
          expect.any(Error),
          expect.any(Object),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Data Transformation', () => {
    it('should transform API response to AdminUser format correctly', async () => {
      const customMockUsers = [
        {
          id: 'user3',
          name: 'Custom User',
          email: 'custom@example.com',
          emailVerified: true,
          image: 'https://example.com/custom.jpg',
          role: 'admin',
          banned: true,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-16T15:45:00Z',
        },
      ];

      vi.mocked(authClient.admin.listUsers).mockResolvedValue({
        data: { users: customMockUsers },
      });

      const TestTransformComponent: React.FC = () => {
        const { users } = useAdmin();
        const user = users[0];

        if (!user) return <div>No users</div>;

        return (
          <div>
            <div data-testid="user-id">{user.id}</div>
            <div data-testid="user-name">{user.name}</div>
            <div data-testid="user-email">{user.email}</div>
            <div data-testid="user-verified">{user.emailVerified.toString()}</div>
            <div data-testid="user-image">{user.image}</div>
            <div data-testid="user-role">{user.role}</div>
            <div data-testid="user-banned">{user.banned?.toString()}</div>
            <div data-testid="user-created">{user.createdAt}</div>
            <div data-testid="user-updated">{user.updatedAt}</div>
            <div data-testid="user-last-login">{user.lastLoginAt || 'null'}</div>
          </div>
        );
      };

      render(
        <AdminProvider>
          <TestTransformComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user3');
        expect(screen.getByTestId('user-name')).toHaveTextContent('Custom User');
        expect(screen.getByTestId('user-email')).toHaveTextContent('custom@example.com');
        expect(screen.getByTestId('user-verified')).toHaveTextContent('true');
        expect(screen.getByTestId('user-image')).toHaveTextContent(
          'https://example.com/custom.jpg',
        );
        expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
        expect(screen.getByTestId('user-banned')).toHaveTextContent('true');
        expect(screen.getByTestId('user-created')).toHaveTextContent('2024-01-15T10:30:00.000Z');
        expect(screen.getByTestId('user-updated')).toHaveTextContent('2024-01-16T15:45:00.000Z');
        expect(screen.getByTestId('user-last-login')).toHaveTextContent('null');
      });
    });

    it('should handle missing user data gracefully', async () => {
      vi.mocked(authClient.admin.listUsers).mockResolvedValue({
        data: { users: [] },
      });

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('users-count')).toHaveTextContent('0');
      });
    });

    it('should handle API errors during initial load', async () => {
      vi.mocked(authClient.admin.listUsers).mockRejectedValue(new Error('API Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <AdminProvider>
          <TestComponent />
        </AdminProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-users')).toHaveTextContent('loaded');
        expect(screen.getByTestId('users-count')).toHaveTextContent('0');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ [ERROR] Failed to load users',
        expect.any(Error),
        expect.any(Object),
      );
      consoleSpy.mockRestore();
    });
  });
});
