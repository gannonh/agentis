/**
 * @fileoverview User management interface for admin panel
 * @module components/Admin/UserManagement
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Calendar,
  Activity,
  Crown,
  Edit,
  Check,
  X,
  Trash2,
  Ban,
  UserCheck,
} from 'lucide-react';
import { logger } from '~/services/logger';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/Select';
import { Switch } from '~/components/ui/Switch';
import { useAdmin } from './AdminProvider';
import type { AdminUser } from '~/config/betterAuth';

interface CreateUserFormData {
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface UserManagementProps {
  className?: string;
}

interface EditingState {
  userId: string | null;
  field: 'name' | 'email' | 'role' | null;
  value: string;
}

/**
 * User management component for admin panel
 * Provides CRUD operations for user accounts
 */
const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVerification, setSelectedVerification] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EditingState>({ userId: null, field: null, value: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserCancellingRef = useRef(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('Policy violation');
  const [banExpiresDate, setBanExpiresDate] = useState<string>('');
  const [isPermanentBan, setIsPermanentBan] = useState(false);
  const [banDuration, setBanDuration] = useState<string>('7'); // Default 7 days

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;

  const {
    users,
    totalUsers,
    loadUsers,
    createUser,
    setUserRole,
    updateUser,
    revokeUserSessions,
    banUser,
    unbanUser,
    isLoadingUsers,
  } = useAdmin();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // For now, we'll use server-side pagination with client-side filtering
  // This is because Better Auth might not support all filter types
  const filteredUsers = users.filter((user) => {
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && !user.banned) ||
      (selectedStatus === 'banned' && user.banned);

    const matchesVerification =
      selectedVerification === 'all' ||
      (selectedVerification === 'verified' && user.emailVerified) ||
      (selectedVerification === 'unverified' && !user.emailVerified);

    return matchesStatus && matchesVerification;
  });

  // Pagination calculations (using total from server)
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // Load users when pagination or server-side filters change
  useEffect(() => {
    const buildQuery = () => {
      const query: any = {
        limit: usersPerPage,
        offset: (currentPage - 1) * usersPerPage,
      };

      // Add search filter (server-side)
      // Note: Better Auth API might only support searching one field at a time
      // We'll search email by default since it's more unique
      if (searchQuery) {
        query.searchField = 'email';
        query.searchOperator = 'contains';
        query.searchValue = searchQuery;
      }

      // Add role filter (server-side)
      if (selectedRole !== 'all') {
        query.filterField = 'role';
        query.filterOperator = 'eq';
        query.filterValue = selectedRole;
      }

      // Add sorting
      query.sortBy = 'createdAt';
      query.sortDirection = 'desc';

      return query;
    };

    loadUsers(buildQuery());
  }, [currentPage, searchQuery, selectedRole, loadUsers]);

  // Reset to page 1 when search or role filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole]);

  const onCreateUser = async (data: CreateUserFormData) => {
    try {
      // Generate a secure random password since Better Auth admin plugin requires it
      // This creates an Account record with provider="credential" but users will
      // authenticate via OAuth/magic link, never using this password
      const randomPassword = crypto
        .getRandomValues(new Uint8Array(32))
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

      const createUserData = {
        ...data,
        password: randomPassword,
        // Don't send emailVerified - let the backend handle it
      };

      await createUser(createUserData);
      reset();
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      logger.error(
        'Failed to create user',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'UserManagement',
          action: 'createUser',
          email: data.email,
        },
      );

      // Show user-friendly error message
      if (error?.message?.includes('already exists') || error?.code === 'USER_ALREADY_EXISTS') {
        alert(`User with email ${data.email} already exists.`);
      } else {
        alert(error?.message || 'Failed to create user. Please check the console for details.');
      }
    }
  };

  const handlePromoteUser = async (user: AdminUser) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await setUserRole(user.id, newRole);
    } catch (error) {
      logger.error(
        'Failed to update user role',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'UserManagement',
          action: 'promoteUser',
          userId: user.id,
          newRole: user.role === 'admin' ? 'user' : 'admin',
        },
      );
    }
  };

  const handleBanUser = async (user: AdminUser) => {
    if (user.banned) {
      // Unban the user
      if (confirm(`Are you sure you want to unban ${user.name || user.email}?`)) {
        try {
          await unbanUser(user.id);
        } catch (error) {
          logger.error(
            'Failed to unban user',
            error instanceof Error ? error : new Error(String(error)),
            {
              component: 'UserManagement',
              action: 'unbanUser',
              userId: user.id,
            },
          );
          alert(`Failed to unban user. Please try again.`);
        }
      }
    } else {
      // Open ban dialog
      setUserToBan(user);
      setBanReason(''); // Clear the field instead of pre-filling
      setBanDuration('7'); // Default to 7 days
      // Set default expiration to 7 days from now
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 7);
      setBanExpiresDate(defaultExpiry.toISOString().split('T')[0]);
      setIsPermanentBan(false);
      setIsBanDialogOpen(true);
    }
  };

  const handleConfirmBan = async () => {
    if (!userToBan) return;

    try {
      let banExpiresIn: number | undefined;

      if (!isPermanentBan && banExpiresDate) {
        const expirationDate = new Date(banExpiresDate);
        const now = new Date();
        const diffInSeconds = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);

        if (diffInSeconds <= 0) {
          alert('Ban expiration date must be in the future.');
          return;
        }

        banExpiresIn = diffInSeconds;
      }

      await banUser(userToBan.id, banReason, banExpiresIn);
      setIsBanDialogOpen(false);
      setUserToBan(null);
    } catch (error) {
      logger.error(
        'Failed to ban user',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'UserManagement',
          action: 'banUser',
          userId: userToBan.id,
        },
      );
      alert('Failed to ban user. Please try again.');
    }
  };

  const handleRevokeUserSessions = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke all sessions for this user?')) {
      return;
    }

    try {
      await revokeUserSessions(userId);
    } catch (error) {
      logger.error(
        'Failed to revoke user sessions',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'UserManagement',
          action: 'revokeUserSessions',
          userId,
        },
      );
    }
  };

  // Inline editing functions
  const startEditing = useCallback(
    (userId: string, field: 'name' | 'email' | 'role', currentValue: string) => {
      // Clear any pending save from previous edit
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
      setEditing({ userId, field, value: currentValue });
      // Focus the input after state update
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    },
    [],
  );

  const cancelEditing = useCallback(() => {
    // Set cancellation flag and clear any pending save
    isUserCancellingRef.current = true;
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setEditing({ userId: null, field: null, value: '' });
    // Reset cancellation flag after state update
    setTimeout(() => {
      isUserCancellingRef.current = false;
    }, 150);
  }, []);

  const saveEditing = useCallback(async () => {
    if (!editing.userId || !editing.field) return;

    setIsUpdating(true);
    try {
      const user = users.find((u) => u.id === editing.userId);
      if (!user) return;

      if (editing.field === 'role') {
        await setUserRole(editing.userId, editing.value as 'user' | 'admin');
        setEditing({ userId: null, field: null, value: '' });
      } else if (editing.field === 'name' || editing.field === 'email') {
        // Validate email format if editing email
        if (editing.field === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(editing.value)) {
            alert('Please enter a valid email address');
            return;
          }
        }

        // Call updateUser with the appropriate field
        await updateUser(editing.userId, { [editing.field]: editing.value });
        setEditing({ userId: null, field: null, value: '' });
      }
    } catch (error) {
      logger.error(
        'Failed to update user field',
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'UserManagement',
          action: 'saveEditing',
          userId: editing.userId,
          field: editing.field,
        },
      );

      // Show specific error message if available
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      alert(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, [editing, users, setUserRole, updateUser]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        saveEditing();
      } else if (e.key === 'Escape') {
        cancelEditing();
      }
    },
    [saveEditing, cancelEditing],
  );

  const handleBlur = useCallback(() => {
    // Clear any existing timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    // Save on blur unless user clicked cancel
    blurTimeoutRef.current = setTimeout(() => {
      // Check if user cancelled in the meantime
      if (!isUserCancellingRef.current && editing.userId) {
        saveEditing();
      }
      blurTimeoutRef.current = null;
    }, 100);
  }, [editing, saveEditing]);

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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user account. They can sign in with Google or magic link.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onCreateUser)} className="mt-4">
              <div className="space-y-4 px-6">
                <div>
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
                    placeholder="Email Address"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    id="name"
                    {...register('name', {
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    })}
                    placeholder="Full Name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Select
                    value={watch('role') || ''}
                    onValueChange={(value) => setValue('role', value as 'user' | 'admin')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent className="z-[1000]">
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
        <div className="flex flex-col gap-4">
          {/* Search and filters row */}
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
            <div className="sm:w-36">
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

            {/* Status filter */}
            <div className="sm:w-36">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Verification filter */}
            <div className="sm:w-36">
              <Select value={selectedVerification} onValueChange={setSelectedVerification}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verification</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                Showing {filteredUsers.length} of {users.length} on this page ({totalUsers} total)
              </div>
              <div>Admins: {users.filter((u) => u.role === 'admin').length}</div>
              <div>Verified: {users.filter((u) => u.emailVerified).length}</div>
              <div>Banned: {users.filter((u) => u.banned).length}</div>
            </div>
          </div>
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
                {searchQuery ||
                selectedRole !== 'all' ||
                selectedStatus !== 'all' ||
                selectedVerification !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No users have been created yet'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={`${user.name} avatar`}
                      className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white">
                      {getAvatarInitials(user.name)}
                    </div>
                  )}

                  {/* User Details - Now taking full width */}
                  <div className="min-w-0 flex-1">
                    {/* Name Row with inline editing */}
                    <div className="group flex items-center space-x-2">
                      {editing.userId === user.id && editing.field === 'name' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            ref={inputRef}
                            type="text"
                            value={editing.value}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, value: e.target.value }))
                            }
                            onKeyDown={handleKeyPress}
                            onBlur={handleBlur}
                            className="rounded border border-blue-300 bg-white px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            disabled={isUpdating}
                          />
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur
                              if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                                blurTimeoutRef.current = null;
                              }
                            }}
                            onClick={saveEditing}
                            disabled={isUpdating}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur
                              isUserCancellingRef.current = true;
                            }}
                            onClick={cancelEditing}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4
                            className="cursor-pointer text-sm font-medium text-gray-900 hover:text-orange-600 group-hover:underline dark:text-white dark:hover:text-orange-400"
                            onClick={() => startEditing(user.id, 'name', user.name)}
                            title="Click to edit name"
                          >
                            {user.name}
                          </h4>
                          <Edit className="h-3 w-3 text-orange-400 opacity-0 transition-opacity group-hover:opacity-100" />
                        </>
                      )}
                      {getRoleBadge(user)}
                      {getUserStatusBadge(user)}
                    </div>

                    {/* Email Row with inline editing */}
                    <div className="group mt-1 flex items-center space-x-2">
                      {editing.userId === user.id && editing.field === 'email' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            ref={inputRef}
                            type="email"
                            value={editing.value}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, value: e.target.value }))
                            }
                            onKeyDown={handleKeyPress}
                            onBlur={handleBlur}
                            className="rounded border border-blue-300 bg-white px-2 py-1 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-400"
                            disabled={isUpdating}
                          />
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur
                              if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                                blurTimeoutRef.current = null;
                              }
                            }}
                            onClick={saveEditing}
                            disabled={isUpdating}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur
                              isUserCancellingRef.current = true;
                            }}
                            onClick={cancelEditing}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p
                            className="cursor-pointer text-sm text-gray-600 hover:text-orange-600 group-hover:underline dark:text-gray-400 dark:hover:text-orange-400"
                            onClick={() => startEditing(user.id, 'email', user.email)}
                            title="Click to edit email"
                          >
                            {user.email}
                          </p>
                          <Edit className="h-3 w-3 text-orange-400 opacity-0 transition-opacity group-hover:opacity-100" />
                        </>
                      )}
                    </div>

                    {/* Metadata Row */}
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
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

                    {/* Ban Info Row - only show for banned users */}
                    {user.banned && (
                      <div className="mt-2 flex flex-col space-y-1 text-xs text-red-600 dark:text-red-400">
                        {user.banReason && (
                          <div className="flex items-center space-x-1">
                            <Ban className="h-3 w-3" />
                            <span>Ban reason: {user.banReason}</span>
                          </div>
                        )}
                        {user.banExpires && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Ban expires: {new Date(user.banExpires).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {!user.banExpires && (
                          <div className="flex items-center space-x-1">
                            <Ban className="h-3 w-3" />
                            <span>Permanently banned</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Links Row */}
                    <div className="mt-3 flex items-center space-x-4 text-sm">
                      <button
                        onClick={() => handlePromoteUser(user)}
                        className="flex items-center space-x-1 text-purple-600 transition-colors hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        <Shield className="h-4 w-4" />
                        <span>{user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}</span>
                      </button>

                      <button
                        onClick={() => handleRevokeUserSessions(user.id)}
                        className="flex items-center space-x-1 text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                      >
                        <Activity className="h-4 w-4" />
                        <span>Revoke Sessions</span>
                      </button>

                      <button
                        onClick={() => handleBanUser(user)}
                        className={`flex items-center space-x-1 transition-colors ${
                          user.banned
                            ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                            : 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                        }`}
                      >
                        {user.banned ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                        <span>{user.banned ? 'Unban User' : 'Ban User'}</span>
                      </button>

                      {/* Role quick edit */}
                      {editing.userId === user.id && editing.field === 'role' ? (
                        <div className="flex items-center space-x-2">
                          <Select
                            value={editing.value}
                            onValueChange={(value) => setEditing((prev) => ({ ...prev, value }))}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur
                              if (blurTimeoutRef.current) {
                                clearTimeout(blurTimeoutRef.current);
                                blurTimeoutRef.current = null;
                              }
                            }}
                            onClick={saveEditing}
                            disabled={isUpdating}
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur
                              isUserCancellingRef.current = true;
                            }}
                            onClick={cancelEditing}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(user.id, 'role', user.role)}
                          className="flex items-center space-x-1 text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Change Role</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={i}
                      variant={pageNum === currentPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

      {/* Ban User Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent className="sm:max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban {userToBan?.name || userToBan?.email} from accessing the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6">
            <div>
              <Input
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Ban Reason"
                autoFocus={false}
              />
            </div>

            <div className="space-y-4">
              {!isPermanentBan && (
                <div className="space-y-2">
                  <Select
                    value={banDuration}
                    onValueChange={(value) => {
                      setBanDuration(value);
                      // Calculate expiration date based on selection
                      const days = parseInt(value);
                      const expiryDate = new Date();
                      expiryDate.setDate(expiryDate.getDate() + days);
                      setBanExpiresDate(expiryDate.toISOString().split('T')[0]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ban duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">6 months</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  {banDuration && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ban expires on{' '}
                      {(() => {
                        const date = new Date();
                        date.setDate(date.getDate() + parseInt(banDuration));
                        return date.toLocaleDateString();
                      })()}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="permanentBan" className="text-sm font-medium">
                  Permanent ban
                </Label>
                <Switch
                  id="permanentBan"
                  checked={isPermanentBan}
                  onCheckedChange={setIsPermanentBan}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmBan}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { UserManagement };
