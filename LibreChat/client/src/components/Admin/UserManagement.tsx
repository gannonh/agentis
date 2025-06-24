/**
 * @fileoverview User management interface for admin panel
 * @module components/Admin/UserManagement
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  Search,
  MoreVertical,
  UserPlus,
  Shield,
  Calendar,
  Activity,
  Crown,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/DropdownMenu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/Select';
import { useAdmin } from './AdminProvider';
import type { AdminUser } from '~/config/betterAuth';

interface CreateUserFormData {
  email: string;
  name: string;
  password: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
}

interface UserManagementProps {
  className?: string;
}

/**
 * User management component for admin panel
 * Provides CRUD operations for user accounts
 */
const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const { users, createUser, setUserRole, listUserSessions, revokeUserSessions, isLoadingUsers } =
    useAdmin();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    defaultValues: {
      role: 'user',
      emailVerified: false,
    },
  });

  // Filter users based on search and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      selectedRole === 'all' ||
      (selectedRole === 'admin' && user.role === 'admin') ||
      (selectedRole === 'user' && user.role !== 'admin');
    return matchesSearch && matchesRole;
  });

  const onCreateUser = async (data: CreateUserFormData) => {
    try {
      await createUser(data);
      reset();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handlePromoteUser = async (user: AdminUser) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await setUserRole(user.id, newRole);
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const handleRevokeUserSessions = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke all sessions for this user?')) {
      return;
    }

    try {
      await revokeUserSessions(userId);
    } catch (error) {
      console.error('Failed to revoke user sessions:', error);
    }
  };

  const getUserStatusBadge = (user: AdminUser) => {
    if (user.banned) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900/20 dark:text-red-300">
          Banned
        </span>
      );
    }

    if (user.emailVerified) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300">
          Verified
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
        Unverified
      </span>
    );
  };

  const getRoleBadge = (user: AdminUser) => {
    if (user.role === 'admin') {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
          <Crown className="mr-1 h-3 w-3" />
          Admin
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
        <Users className="mr-1 h-3 w-3" />
        User
      </span>
    );
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading users...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Management</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage user accounts and permissions
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user account with specified permissions.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                  placeholder="user@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register('name', {
                    required: 'Name is required',
                    minLength: {
                      value: 2,
                      message: 'Name must be at least 2 characters',
                    },
                  })}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  placeholder="Enter password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Role</Label>
                <Select
                  value={watch('role')}
                  onValueChange={(value) => setValue('role', value as 'user' | 'admin')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="emailVerified"
                  {...register('emailVerified')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <Label htmlFor="emailVerified">Email verified</Label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Role filter */}
          <div className="sm:w-48">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div>Total: {filteredUsers.length} users</div>
          <div>Admins: {filteredUsers.filter((u) => u.role === 'admin').length}</div>
          <div>Verified: {filteredUsers.filter((u) => u.emailVerified).length}</div>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-lg bg-white shadow dark:bg-gray-800">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h4 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                No users found
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery || selectedRole !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No users have been created yet'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  {/* User info */}
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={`${user.name} avatar`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white">
                        {getAvatarInitials(user.name)}
                      </div>
                    )}

                    {/* Details */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </h4>
                        {getRoleBadge(user)}
                        {getUserStatusBadge(user)}
                      </div>
                      <div className="mt-1 flex items-center space-x-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                      </div>
                      <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        {user.lastLoginAt && (
                          <div className="flex items-center space-x-1">
                            <Activity className="h-3 w-3" />
                            <span>Last seen {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => handlePromoteUser(user)}>
                        <Shield className="mr-2 h-4 w-4" />
                        {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => handleRevokeUserSessions(user.id)}>
                        <Activity className="mr-2 h-4 w-4" />
                        Revoke Sessions
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export { UserManagement };
