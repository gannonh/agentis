/**
 * @fileoverview Tests for AdminDashboard component
 * @module components/Admin/__tests__/AdminDashboard.test
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from '../AdminDashboard';
import { useAdmin } from '../AdminProvider';

// Mock the AdminProvider hook
vi.mock('../AdminProvider', () => ({
  useAdmin: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

  // Helper function to render with router context
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  describe('Loading State', () => {
    it('should show loading spinner when isLoadingStats is true', () => {
      vi.mocked(useAdmin).mockReturnValue({
        ...mockAdminContext,
        isLoadingStats: true,
      });

      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByText('Loading dashboard...').previousElementSibling).toHaveClass(
        'animate-spin',
      );
    });

    it('should hide loading state when not loading', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument();
    });
  });

  describe('Header Section', () => {
    it('should render dashboard title and description', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Platform overview and administration tools')).toBeInTheDocument();
    });

    it('should show admin access indicator', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('Admin Access')).toBeInTheDocument();
      // Check for the shield icon in the admin access indicator (blue colored, not gray)
      const shieldIcons = screen.getAllByTestId('shield-icon');
      expect(shieldIcons).toHaveLength(2); // One in header, one in system health
      expect(shieldIcons[0]).toHaveClass('text-blue-600');
    });

    it('should apply custom className', () => {
      const { container } = renderWithRouter(<AdminDashboard className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Statistics Cards', () => {
    it('should render stat cards with initial values', () => {
      renderWithRouter(<AdminDashboard />);

      // Initially shows 0 values before stats load
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('New Users Today')).toBeInTheDocument();
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });

    it('should show correct trend information', () => {
      renderWithRouter(<AdminDashboard />);

      // Check trend text patterns
      expect(screen.getByText(/this month/)).toBeInTheDocument();
      expect(screen.getByText(/% of total/)).toBeInTheDocument();
      expect(screen.getByText(/this week/)).toBeInTheDocument();
      expect(screen.getByText(/avg duration/)).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('should render all quick action buttons', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('Session Management')).toBeInTheDocument();
      expect(screen.getByText('Organization Management')).toBeInTheDocument();
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    it('should show correct descriptions for quick actions', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('Manage users, roles, and permissions')).toBeInTheDocument();
      expect(screen.getByText('View and manage active sessions')).toBeInTheDocument();
      expect(screen.getByText('Manage organizations and multi-tenancy')).toBeInTheDocument();
      expect(screen.getByText('Configure platform settings')).toBeInTheDocument();
    });

    it('should navigate when quick action buttons are clicked', () => {
      renderWithRouter(<AdminDashboard />);

      // Test User Management button
      fireEvent.click(screen.getByText('User Management'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/users');

      // Test Session Management button
      fireEvent.click(screen.getByText('Session Management'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/sessions');

      // Test Organization Management button
      fireEvent.click(screen.getByText('Organization Management'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/organizations');

      // Test System Settings button
      fireEvent.click(screen.getByText('System Settings'));
      expect(mockNavigate).toHaveBeenCalledWith('/admin/settings');
    });

    it('should display correct icons for each action', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.getAllByTestId('users-icon')).toHaveLength(2); // One in stat card, one in quick actions
      expect(screen.getAllByTestId('activity-icon')).toHaveLength(3); // One in stat card, one in quick actions, one in recent activity
      expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('settings-icon')).toHaveLength(2); // One in quick actions, one in system health
    });
  });

  describe('System Health Section', () => {
    it('should display system health section', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('System monitoring coming soon')).toBeInTheDocument();
    });
  });

  describe('Recent Activity Section', () => {
    it('should display recent activity section', () => {
      renderWithRouter(<AdminDashboard />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Activity tracking coming soon')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle getUserStats error gracefully', async () => {
      mockAdminContext.getUserStats.mockRejectedValue(new Error('Stats error'));

      renderWithRouter(<AdminDashboard />);

      // Should not crash and still render the dashboard
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('should handle getSessionStats error gracefully', async () => {
      mockAdminContext.getSessionStats.mockRejectedValue(new Error('Session stats error'));

      renderWithRouter(<AdminDashboard />);

      // Should not crash and still render the dashboard
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Stats Loading', () => {
    it('should call getUserStats and getSessionStats on mount', () => {
      renderWithRouter(<AdminDashboard />);

      expect(mockAdminContext.getUserStats).toHaveBeenCalledTimes(1);
      expect(mockAdminContext.getSessionStats).toHaveBeenCalledTimes(1);
    });
  });
});
