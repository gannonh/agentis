/**
 * @fileoverview Admin dashboard with platform statistics and quick actions
 * @module components/Admin/AdminDashboard
 */

import React from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Activity,
  Clock,
  Globe,
  Settings,
  Shield,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { useAdmin } from './AdminProvider';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendDirection = 'neutral',
  className = '',
}) => {
  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={`rounded-lg bg-white p-6 shadow dark:bg-gray-800 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {trend && <p className={`text-sm ${getTrendColor()}`}>{trend}</p>}
        </div>
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
      </div>
    </div>
  );
};

interface AdminDashboardProps {
  onNavigate?: (section: string) => void;
  className?: string;
}

/**
 * Admin dashboard component
 * Shows platform statistics and provides quick access to admin features
 */
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, className = '' }) => {
  const { getUserStats, getSessionStats, isLoadingStats } = useAdmin();

  const [userStats, setUserStats] = React.useState<any>(null);
  const [sessionStats, setSessionStats] = React.useState<any>(null);

  const loadStats = React.useCallback(async () => {
    try {
      const [users, sessions] = await Promise.all([getUserStats(), getSessionStats()]);
      setUserStats(users);
      setSessionStats(sessions);
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  }, [getUserStats, getSessionStats]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: <Users className="h-6 w-6" />,
      action: () => onNavigate?.('users'),
      color: 'bg-blue-500',
    },
    {
      title: 'Session Management',
      description: 'View and manage active sessions',
      icon: <Activity className="h-6 w-6" />,
      action: () => onNavigate?.('sessions'),
      color: 'bg-green-500',
    },
    {
      title: 'Organization Management',
      description: 'Manage organizations and multi-tenancy',
      icon: <Globe className="h-6 w-6" />,
      action: () => onNavigate?.('organizations'),
      color: 'bg-purple-500',
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: <Settings className="h-6 w-6" />,
      action: () => onNavigate?.('settings'),
      color: 'bg-gray-500',
    },
  ];

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Platform overview and administration tools
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Admin Access</span>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={userStats?.totalUsers || 0}
          icon={<Users className="h-8 w-8" />}
          trend={`+${userStats?.newUsersThisMonth || 0} this month`}
          trendDirection="up"
        />

        <StatCard
          title="Active Users"
          value={userStats?.activeUsers || 0}
          icon={<UserCheck className="h-8 w-8" />}
          trend={`${Math.round(((userStats?.activeUsers || 0) / (userStats?.totalUsers || 1)) * 100)}% of total`}
          trendDirection="neutral"
        />

        <StatCard
          title="New Users Today"
          value={userStats?.newUsersToday || 0}
          icon={<UserPlus className="h-8 w-8" />}
          trend={`${userStats?.newUsersThisWeek || 0} this week`}
          trendDirection="up"
        />

        <StatCard
          title="Active Sessions"
          value={sessionStats?.activeSessions || 0}
          icon={<Activity className="h-8 w-8" />}
          trend={`${Math.round(sessionStats?.averageSessionDuration || 0)}h avg duration`}
          trendDirection="neutral"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Growth Chart Placeholder */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Growth</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
              <span className="font-medium text-gray-900 dark:text-white">
                +{userStats?.newUsersToday || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
              <span className="font-medium text-gray-900 dark:text-white">
                +{userStats?.newUsersThisWeek || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
              <span className="font-medium text-gray-900 dark:text-white">
                +{userStats?.newUsersThisMonth || 0}
              </span>
            </div>
          </div>

          {/* Simple visual indicator */}
          <div className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{
                width: `${Math.min(((userStats?.newUsersThisMonth || 0) / (userStats?.totalUsers || 1)) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* System Health */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Authentication</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">API Response</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Fast</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Storage</span>
              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                75% Used
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="rounded-lg border border-gray-200 bg-white p-6 text-left shadow transition-shadow hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg text-white ${action.color}`}
              >
                {action.icon}
              </div>
              <h4 className="mb-2 font-medium text-gray-900 dark:text-white">{action.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h3>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              New user registration: user@example.com
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">2 min ago</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Organization created: TechCorp Inc.
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">15 min ago</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Session expired for user: admin@platform.com
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">1 hour ago</span>
          </div>

          <div className="pt-4 text-center">
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('activity')}>
              View All Activity
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
