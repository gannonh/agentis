/**
 * @fileoverview Unified user management interface for admin panel
 * @module components/Admin/UserManagementUnified
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  UserPlus,
  Shield,
  Calendar,
  Crown,
  Ban,
  UserCheck,
  Edit,
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
import { useAdmin } from './AdminProvider';
import { AdminDataTable, AdminPagination, AdminStatusBadge, type AdminColumn, type AdminAction } from './shared';
import type { AdminUser } from '~/config/betterAuth';

interface CreateUserFormData {
  email: string;
  name: string;
  role: 'user' | 'admin';
}

interface UserManagementProps {
  className?: string;
}

/**
 * Unified user management component for admin panel
 */
const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVerification, setSelectedVerification] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;

  const {
    users,
    totalUsers,
    loadUsers,
    createUser,
    updateUser,
    setUserRole,
    banUser,
    unbanUser,
    revokeUserSessions,
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

  // Filter users
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

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // Load users when pagination or filters change
  useEffect(() => {
    const buildQuery = () => {
      const query: any = {
        limit: usersPerPage,
        offset: (currentPage - 1) * usersPerPage,
      };

      if (searchQuery) {
        query.searchField = 'email';
        query.searchOperator = 'contains';
        query.searchValue = searchQuery;
      }

      if (selectedRole !== 'all') {
        query.filterField = 'role';
        query.filterOperator = 'eq';
        query.filterValue = selectedRole;
      }

      query.sortBy = 'createdAt';
      query.sortDirection = 'desc';

      return query;
    };

    loadUsers(buildQuery());
  }, [currentPage, searchQuery, selectedRole, loadUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole]);

  const handlePromoteUser = async (user: AdminUser) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await setUserRole(user.id, newRole);
    } catch (error) {
      logger.error('Failed to update user role', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleBanUser = async (user: AdminUser) => {
    try {
      if (user.banned) {
        await unbanUser(user.id);
      } else {
        // Simple ban for 7 days
        const banExpiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
        await banUser(user.id, 'Policy violation', banExpiresIn);
      }
    } catch (error) {
      logger.error('Failed to ban/unban user', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleRevokeUserSessions = async (user: AdminUser) => {
    if (!confirm('Are you sure you want to revoke all sessions for this user?')) {
      return;
    }

    try {
      await revokeUserSessions(user.id);
    } catch (error) {
      logger.error('Failed to revoke user sessions', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleEditUser = (user: AdminUser) => {
    setUserToEdit(user);
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userToEdit) return;

    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    };

    try {
      await updateUser(userToEdit.id, data);
      setIsEditDialogOpen(false);
      setUserToEdit(null);
    } catch (error) {
      logger.error('Failed to update user', error instanceof Error ? error : new Error(String(error)));
      alert('Failed to update user. Please check the console for details.');
    }
  };

  const onCreateUser = async (data: CreateUserFormData) => {
    try {
      const randomPassword = crypto
        .getRandomValues(new Uint8Array(32))
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');

      const createUserData = {
        ...data,
        password: randomPassword,
      };

      await createUser(createUserData);
      reset();
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      logger.error('Failed to create user', error instanceof Error ? error : new Error(String(error)));

      if (error?.message?.includes('already exists') || error?.code === 'USER_ALREADY_EXISTS') {
        alert(`User with email ${data.email} already exists.`);
      } else {
        alert(error?.message || 'Failed to create user. Please check the console for details.');
      }
    }
  };

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Define table columns for unified design
  const columns: AdminColumn<AdminUser>[] = [
    {
      key: 'name',
      header: 'User',
      accessor: (user) => (
        <div className="flex items-center space-x-3">
          {user.image ? (
            <img
              src={user.image}
              alt={`${user.name} avatar`}
              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-semibold text-white">
              {getAvatarInitials(user.name)}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      accessor: (user) => <AdminStatusBadge variant="role" value={user.role} />,
    },
    {
      key: 'emailVerified',
      header: 'Status',
      accessor: (user) => (
        <div className="flex items-center space-x-2">
          <AdminStatusBadge
            variant="verification"
            value={user.emailVerified ? 'verified' : 'unverified'}
          />
          {user.banned && <AdminStatusBadge variant="status" value="banned" />}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      accessor: (user) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(user.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
    },
  ];

  // Define table actions for unified design
  const actions: AdminAction<AdminUser>[] = [
    {
      label: 'Edit',
      icon: Edit,
      onClick: handleEditUser,
      variant: 'edit',
    },
    {
      label: (user) => (user.role === 'admin' ? 'Demote' : 'Promote'),
      icon: (user) => (user.role === 'admin' ? UserCheck : Crown),
      onClick: handlePromoteUser,
      variant: 'primary',
    },
    {
      label: (user) => (user.banned ? 'Unban' : 'Ban'),
      icon: Ban,
      onClick: handleBanUser,
      variant: (user) => (user.banned ? 'primary' : 'delete'),
    },
    {
      label: 'Revoke Sessions',
      icon: Shield,
      onClick: handleRevokeUserSessions,
      variant: 'edit',
    },
  ];

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
            Manage user accounts and permissions across the platform
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleSubmit(onCreateUser)}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new user account. They can sign in with Google or magic link.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 px-6">
                <div className="space-y-2">
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
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
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
                    required
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Select
                    value={watch('role') || ''}
                    onValueChange={(value) => setValue('role', value as 'user' | 'admin')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
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
        <div className="flex flex-col gap-4 sm:flex-row">
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

        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div>Showing {filteredUsers.length} of {users.length} on this page ({totalUsers} total)</div>
          <div>Admins: {users.filter((u) => u.role === 'admin').length}</div>
          <div>Verified: {users.filter((u) => u.emailVerified).length}</div>
          <div>Banned: {users.filter((u) => u.banned).length}</div>
        </div>
      </div>

      {/* Users Table */}
      <AdminDataTable
        data={filteredUsers}
        columns={columns}
        actions={actions}
        isLoading={isLoadingUsers}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search users by name or email..."
        emptyMessage="No users found."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalUsers}
          itemsPerPage={usersPerPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update the user information below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 px-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={userToEdit?.name || ''}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  defaultValue={userToEdit?.email || ''}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { UserManagement };