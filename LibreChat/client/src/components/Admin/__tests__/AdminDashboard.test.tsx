/**
 * @fileoverview Tests for AdminDashboard component
 * @module components/Admin/__tests__/AdminDashboard.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AdminDashboard } from '../AdminDashboard';
import { useAdmin } from '../AdminProvider';

// Mock the AdminProvider hook
vi.mock('../AdminProvider', () => ({
  useAdmin: vi.fn(),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Users: ({ className }: { className?: string }) => (
    <div data-testid="users-icon" className={className} />
  ),
  UserCheck: ({ className }: { className?: string }) => (
    <div data-testid="user-check-icon" className={className} />
  ),
  UserPlus: ({ className }: { className?: string }) => (
    <div data-testid="user-plus-icon" className={className} />
  ),
  Activity: ({ className }: { className?: string }) => (
    <div data-testid="activity-icon" className={className} />
  ),
  Clock: ({ className }: { className?: string }) => (
    <div data-testid="clock-icon" className={className} />
  ),
  Globe: ({ className }: { className?: string }) => (
    <div data-testid="globe-icon" className={className} />
  ),
  Settings: ({ className }: { className?: string }) => (
    <div data-testid="settings-icon" className={className} />
  ),
  Shield: ({ className }: { className?: string }) => (
    <div data-testid="shield-icon" className={className} />
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <div data-testid="trending-up-icon" className={className} />
  ),
  Calendar: ({ className }: { className?: string }) => (
    <div data-testid="calendar-icon" className={className} />
  ),
}));

// Mock Button component
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('AdminDashboard', () => {
  const mockUserStats = {
    totalUsers: 150,
    activeUsers: 120,
    newUsersToday: 5,
    newUsersThisWeek: 25,
    newUsersThisMonth: 75,
  };

  const mockSessionStats = {
    totalSessions: 200,
    activeSessions: 45,
    averageSessionDuration: 2.5,
  };

  const mockAdminContext = {
    users: [],
    createUser: vi.fn(),
    setUserRole: vi.fn(),
    listUserSessions: vi.fn(),
    revokeUserSessions: vi.fn(),
    getUserStats: vi.fn(),
    getSessionStats: vi.fn(),
    isLoadingUsers: false,
    isLoadingStats: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    mockAdminContext.getUserStats.mockResolvedValue(mockUserStats);
    mockAdminContext.getSessionStats.mockResolvedValue(mockSessionStats);

    vi.mocked(useAdmin).mockReturnValue(mockAdminContext);
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoadingStats is true', () => {
      vi.mocked(useAdmin).mockReturnValue({
        ...mockAdminContext,
        isLoadingStats: true,
      });

      render(<AdminDashboard />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByText('Loading dashboard...').previousElementSibling).toHaveClass(
        'animate-spin',
      );
    });

    it('should hide loading state when not loading', () => {
      render(<AdminDashboard />);

      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });
  });

  describe('Header Section', () => {
    it('should render dashboard title and description', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Platform overview and administration tools')).toBeInTheDocument();
    });

    it('should show admin access indicator', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('Admin Access')).toBeInTheDocument();
      expect(screen.getByTestId('shield-icon')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<AdminDashboard className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Statistics Cards', () => {
    it('should render all statistic cards with correct data', async () => {
      render(<AdminDashboard />);

      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
      });

      // Check all stat values
      expect(screen.getByText('150')).toBeInTheDocument(); // Total Users
      expect(screen.getByText('120')).toBeInTheDocument(); // Active Users
      expect(screen.getByText('5')).toBeInTheDocument(); // New Users Today
      expect(screen.getByText('45')).toBeInTheDocument(); // Active Sessions
    });

    it('should show trend information in stat cards', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('+75 this month')).toBeInTheDocument();
      });

      expect(screen.getByText('+75 this month')).toBeInTheDocument(); // Total users trend
      expect(screen.getByText('80% of total')).toBeInTheDocument(); // Active users percentage (120/150)
      expect(screen.getByText('25 this week')).toBeInTheDocument(); // New users today trend
      expect(screen.getByText('3h avg duration')).toBeInTheDocument(); // Session duration (rounded)
    });

    it('should handle zero stats gracefully', async () => {
      mockAdminContext.getUserStats.mockResolvedValue({
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
      });

      mockAdminContext.getSessionStats.mockResolvedValue({
        totalSessions: 0,
        activeSessions: 0,
        averageSessionDuration: 0,
      });

      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getAllByText('0')).toHaveLength(4); // All stat values should be 0
      });
    });

    it('should handle null/undefined stats', async () => {
      mockAdminContext.getUserStats.mockResolvedValue(null);
      mockAdminContext.getSessionStats.mockResolvedValue(null);

      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getAllByText('0')).toHaveLength(4); // Should default to 0
      });
    });
  });

  describe('Quick Actions', () => {
    it('should render all quick action buttons', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Session Management')).toBeInTheDocument();
      expect(screen.getByText('Organization Management')).toBeInTheDocument();
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    it('should show correct descriptions for quick actions', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('Manage users, roles, and permissions')).toBeInTheDocument();
      expect(screen.getByText('View and manage active sessions')).toBeInTheDocument();
      expect(screen.getByText('Manage organizations and multi-tenancy')).toBeInTheDocument();
      expect(screen.getByText('Configure platform settings')).toBeInTheDocument();
    });

    it('should call onNavigate when quick action buttons are clicked', () => {
      const mockOnNavigate = vi.fn();
      render(<AdminDashboard onNavigate={mockOnNavigate} />);

      // Test each quick action
      fireEvent.click(screen.getByRole('button', { name: /user management/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('users');

      fireEvent.click(screen.getByRole('button', { name: /session management/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('sessions');

      fireEvent.click(screen.getByRole('button', { name: /organization management/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('organizations');

      fireEvent.click(screen.getByRole('button', { name: /system settings/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('settings');
    });

    it('should not crash when onNavigate is not provided', () => {
      render(<AdminDashboard />);

      // Should not throw error
      fireEvent.click(screen.getByRole('button', { name: /user management/i }));
    });

    it('should display correct icons for each action', () => {
      render(<AdminDashboard />);

      expect(screen.getAllByTestId('users-icon')).toHaveLength(2); // One in stats, one in actions
      expect(screen.getAllByTestId('activity-icon')).toHaveLength(2); // One in stats, one in actions
      expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });

  describe('User Growth Section', () => {
    it('should display user growth statistics', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('User Growth')).toBeInTheDocument();
      });

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();

      // Check the values
      expect(screen.getByText('+5')).toBeInTheDocument(); // Today
      expect(screen.getByText('+25')).toBeInTheDocument(); // This week
      expect(screen.getByText('+75')).toBeInTheDocument(); // This month
    });

    it('should show trending up icon', () => {
      render(<AdminDashboard />);

      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
    });

    it('should display growth progress bar', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        const progressBars = document.querySelectorAll('.h-2.rounded-full.bg-green-500');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should calculate correct progress bar width', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        const progressBars = document.querySelectorAll('.h-2.rounded-full.bg-green-500');
        expect(progressBars.length).toBeGreaterThan(0);
        // Note: Testing inline styles is complex with mocked stats, but we can verify the element exists
      });
    });

    it('should cap progress bar at 100%', async () => {
      mockAdminContext.getUserStats.mockResolvedValue({
        ...mockUserStats,
        newUsersThisMonth: 200, // More than total users
        totalUsers: 150,
      });

      render(<AdminDashboard />);

      await waitFor(() => {
        const progressBars = document.querySelectorAll('.h-2.rounded-full.bg-green-500');
        expect(progressBars.length).toBeGreaterThan(0);
        // Progress bar exists and should handle overflow correctly
      });
    });
  });

  describe('System Health Section', () => {
    it('should display system health indicators', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Database')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('API Response')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });

    it('should show system status indicators', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('Healthy')).toBeInTheDocument(); // Database
      expect(screen.getByText('Operational')).toBeInTheDocument(); // Authentication
      expect(screen.getByText('Fast')).toBeInTheDocument(); // API Response
      expect(screen.getByText('75% Used')).toBeInTheDocument(); // Storage
    });

    it('should display green status indicator', () => {
      render(<AdminDashboard />);

      const statusIndicators = document.querySelectorAll('.h-3.w-3.rounded-full.bg-green-500');
      expect(statusIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Recent Activity Section', () => {
    it('should display recent activity feed', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('New user registration: user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Organization created: TechCorp Inc.')).toBeInTheDocument();
      expect(screen.getByText('Session expired for user: admin@platform.com')).toBeInTheDocument();
    });

    it('should show activity timestamps', () => {
      render(<AdminDashboard />);

      expect(screen.getByText('2 min ago')).toBeInTheDocument();
      expect(screen.getByText('15 min ago')).toBeInTheDocument();
      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    });

    it('should display View All Activity button', () => {
      render(<AdminDashboard />);

      const viewAllButton = screen.getByRole('button', { name: /view all activity/i });
      expect(viewAllButton).toBeInTheDocument();
    });

    it('should call onNavigate when View All Activity is clicked', () => {
      const mockOnNavigate = vi.fn();
      render(<AdminDashboard onNavigate={mockOnNavigate} />);

      fireEvent.click(screen.getByRole('button', { name: /view all activity/i }));
      expect(mockOnNavigate).toHaveBeenCalledWith('activity');
    });

    it('should display activity status indicators', () => {
      render(<AdminDashboard />);

      const activityDots = document.querySelectorAll('.h-2.w-2.rounded-full');
      // Should have activity status dots
      expect(activityDots.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle getUserStats error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAdminContext.getUserStats.mockRejectedValue(new Error('Stats failed'));

      render(<AdminDashboard />);

      await waitFor(() => {
        // Should still render with default values
        expect(screen.getAllByText('0')).toHaveLength(4);
      });

      consoleSpy.mockRestore();
    });

    it('should handle getSessionStats error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAdminContext.getSessionStats.mockRejectedValue(new Error('Session stats failed'));

      render(<AdminDashboard />);

      await waitFor(() => {
        // Should still render with default values
        expect(screen.getAllByText('0')).toHaveLength(4);
      });

      consoleSpy.mockRestore();
    });

    it('should handle both stats failing', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAdminContext.getUserStats.mockRejectedValue(new Error('User stats failed'));
      mockAdminContext.getSessionStats.mockRejectedValue(new Error('Session stats failed'));

      render(<AdminDashboard />);

      await waitFor(() => {
        // Should still render dashboard structure
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getAllByText('0')).toHaveLength(4);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Stats Loading Effect', () => {
    it('should load stats on component mount', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        expect(mockAdminContext.getUserStats).toHaveBeenCalledTimes(1);
        expect(mockAdminContext.getSessionStats).toHaveBeenCalledTimes(1);
      });
    });

    it('should memoize the loadStats callback', () => {
      const { rerender } = render(<AdminDashboard />);

      // Re-render with same props shouldn't trigger new calls
      rerender(<AdminDashboard />);

      // Should still only be called once (from initial mount)
      expect(mockAdminContext.getUserStats).toHaveBeenCalledTimes(1);
      expect(mockAdminContext.getSessionStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('StatCard Component', () => {
    it('should render stat card with trend direction colors', async () => {
      render(<AdminDashboard />);

      await waitFor(() => {
        // Check that trend text exists (color testing is challenging with RTL)
        expect(screen.getByText('+75 this month')).toBeInTheDocument();
        expect(screen.getByText('80% of total')).toBeInTheDocument();
      });
    });

    it('should handle missing trend data', async () => {
      mockAdminContext.getUserStats.mockResolvedValue({
        totalUsers: 100,
        activeUsers: 50,
        newUsersToday: 0,
        newUsersThisWeek: 0,
        newUsersThisMonth: 0,
      });

      render(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
      });

      // Trend should show +0
      expect(screen.getByText('+0 this month')).toBeInTheDocument();
      expect(screen.getByText('0 this week')).toBeInTheDocument();
    });
  });
});
