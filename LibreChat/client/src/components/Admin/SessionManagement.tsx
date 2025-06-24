/**
 * @fileoverview Session management interface for admin panel
 * @module components/Admin/SessionManagement
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Globe,
  Clock,
  Monitor,
  Smartphone,
  XCircle,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/Select';
import { useAdmin } from './AdminProvider';
import type { AdminSession, AdminUser } from '~/config/betterAuth';

interface SessionManagementProps {
  className?: string;
}

/**
 * Session management component for admin panel
 * Provides monitoring and control of active user sessions
 */
const SessionManagement: React.FC<SessionManagementProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const { users, listUserSessions, revokeUserSessions, isLoadingUsers } = useAdmin();

  // Load sessions for selected user
  useEffect(() => {
    // Don't try to load sessions if users haven't been loaded yet
    if (isLoadingUsers || users.length === 0) {
      return;
    }

    if (selectedUser && selectedUser !== 'all') {
      loadUserSessions(selectedUser);
    } else {
      // For "all users", we'd need to aggregate sessions from all users
      // This is a simplified version - in production you'd want a dedicated endpoint
      loadAllSessions();
    }
  }, [selectedUser, users, isLoadingUsers]);

  const loadUserSessions = async (userId: string) => {
    setIsLoadingSessions(true);
    try {
      console.log('Loading sessions for user:', userId);
      const userSessions = await listUserSessions(userId);
      console.log('User sessions response:', userSessions);
      setSessions(userSessions);
    } catch (error) {
      console.error('Failed to load user sessions:', error);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadAllSessions = async () => {
    setIsLoadingSessions(true);
    try {
      // In a real implementation, you'd have a dedicated endpoint for all sessions
      // For now, we'll load sessions for the first few users as a demo
      const allSessions: AdminSession[] = [];
      const usersToCheck = users.slice(0, 10); // Limit to prevent too many requests
      
      console.log('Loading sessions for users:', usersToCheck.map(u => ({ id: u.id, name: u.name })));
      
      for (const user of usersToCheck) {
        try {
          console.log(`Fetching sessions for user ${user.name} (${user.id})`);
          const userSessions = await listUserSessions(user.id);
          console.log(`Sessions for ${user.name}:`, userSessions);
          allSessions.push(...userSessions);
        } catch (error) {
          // Skip users that fail
          console.error(`Failed to load sessions for user ${user.id}:`, error);
        }
      }
      
      console.log('All sessions loaded:', allSessions);
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to load all sessions:', error);
      setSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke all sessions for this user?')) {
      return;
    }

    try {
      await revokeUserSessions(userId);
      // Reload sessions
      if (selectedUser === 'all') {
        loadAllSessions();
      } else {
        loadUserSessions(selectedUser);
      }
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
    }
  };

  const handleRefresh = () => {
    if (selectedUser === 'all') {
      loadAllSessions();
    } else {
      loadUserSessions(selectedUser);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || 'Unknown User';
  };

  const getUserEmail = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.email || '';
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    
    const lowerAgent = userAgent.toLowerCase();
    if (lowerAgent.includes('mobile') || lowerAgent.includes('android') || lowerAgent.includes('iphone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getDeviceInfo = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Device';
    
    // Simple parsing - in production you'd use a proper user agent parser
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    return 'Unknown Browser';
  };

  const formatSessionDuration = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  // Filter sessions based on search
  const filteredSessions = sessions.filter((session) => {
    const userName = getUserName(session.userId).toLowerCase();
    const userEmail = getUserEmail(session.userId).toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return (
      userName.includes(query) ||
      userEmail.includes(query) ||
      session.ipAddress?.includes(query)
    );
  });

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Session Management</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Monitor and manage active user sessions
          </p>
        </div>

        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="Search by user name, email, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* User filter */}
          <div className="sm:w-64">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div>Total: {filteredSessions.length} sessions</div>
          <div>Active: {filteredSessions.filter((s) => new Date(s.expiresAt) > new Date()).length}</div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoadingSessions ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h4 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                No sessions found
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery || selectedUser !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No active sessions at the moment'}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isExpired = new Date(session.expiresAt) < new Date();
              const user = users.find((u) => u.id === session.userId);
              
              return (
                <div key={session.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    {/* Session info */}
                    <div className="flex-1">
                      {/* User info */}
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white">
                          {getUserName(session.userId).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {getUserName(session.userId)}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {getUserEmail(session.userId)}
                          </p>
                        </div>
                        {user?.role === 'admin' && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </span>
                        )}
                        {isExpired && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
                            Expired
                          </span>
                        )}
                      </div>

                      {/* Session details */}
                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Globe className="h-4 w-4" />
                          <span>{session.ipAddress || 'Unknown IP'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          {getDeviceIcon(session.userAgent)}
                          <span>{getDeviceInfo(session.userAgent)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>Duration: {formatSessionDuration(session.createdAt)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Activity className="h-4 w-4" />
                          <span>
                            {isExpired ? 'Expired' : `Expires ${new Date(session.expiresAt).toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(session.userId)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export { SessionManagement };