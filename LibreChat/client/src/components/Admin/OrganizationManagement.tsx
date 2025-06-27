/**
 * @fileoverview Organization management interface for admin panel
 * @module components/Admin/OrganizationManagement
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Users,
  Search,
  Globe,
  Edit,
  Trash2,
  Calendar,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/Table';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  memberCount: number;
  createdAt: string;
}


interface CreateOrganizationData {
  name: string;
  slug: string;
  domain?: string;
}

interface OrganizationManagementProps {
  className?: string;
}

/**
 * Fetch organizations from admin API
 */
const fetchOrganizations = async (
  search?: string,
  page = 1,
  limit = 10,
): Promise<{
  organizations?: Organization[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`/api/admin/organizations?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch organizations');
  }

  const data = await response.json();

  // Handle both paginated and simple array responses
  if (Array.isArray(data)) {
    return { organizations: data };
  }

  return data;
};


/**
 * Create a new organization
 */
const createOrganization = async (data: CreateOrganizationData): Promise<Organization> => {
  const response = await fetch('/api/admin/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create organization');
  }

  return response.json();
};

/**
 * Update an organization
 */
const updateOrganization = async (
  id: string,
  data: Partial<CreateOrganizationData>,
): Promise<Organization> => {
  const response = await fetch(`/api/admin/organizations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update organization');
  }

  return response.json();
};

/**
 * Delete an organization
 */
const deleteOrganization = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/organizations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete organization');
  }
};

/**
 * Organization management component for admin panel
 */
const OrganizationManagement: React.FC<OrganizationManagementProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);
  const [organizationToEdit, setOrganizationToEdit] = useState<Organization | null>(null);

  const queryClient = useQueryClient();

  // Fetch organizations
  const {
    data: organizationData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-organizations', searchQuery, currentPage],
    queryFn: () => fetchOrganizations(searchQuery, currentPage, 10),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  // Create organization mutation
  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setIsCreateDialogOpen(false);
      logger.info('Organization created successfully');
    },
    onError: (error: Error) => {
      logger.error('Failed to create organization', error);
    },
  });

  // Update organization mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateOrganizationData> }) =>
      updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setIsEditDialogOpen(false);
      setOrganizationToEdit(null);
      logger.info('Organization updated successfully');
    },
    onError: (error: Error) => {
      logger.error('Failed to update organization', error);
    },
  });

  // Delete organization mutation
  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
      setIsDeleteDialogOpen(false);
      setOrganizationToDelete(null);
      logger.info('Organization deleted successfully');
    },
    onError: (error: Error) => {
      logger.error('Failed to delete organization', error);
    },
  });

  const organizations = organizationData?.organizations || [];
  const pagination = organizationData?.pagination;

  const handleCreateOrganization = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const data: CreateOrganizationData = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      domain: (formData.get('domain') as string) || undefined,
    };

    createMutation.mutate(data);
  };

  const handleUpdateOrganization = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organizationToEdit) return;

    const formData = new FormData(event.currentTarget);

    const data: Partial<CreateOrganizationData> = {
      name: formData.get('name') as string,
      slug: formData.get('slug') as string,
      domain: (formData.get('domain') as string) || undefined,
    };

    updateMutation.mutate({ id: organizationToEdit.id, data });
  };

  const handleDeleteOrganization = () => {
    if (organizationToDelete) {
      deleteMutation.mutate(organizationToDelete.id);
    }
  };


  const handleEditClick = (organization: Organization) => {
    setOrganizationToEdit(organization);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (organization: Organization) => {
    setOrganizationToDelete(organization);
    setIsDeleteDialogOpen(true);
  };

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Error loading organizations
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {(error as Error)?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Organization Management
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage organizations and their members across the platform
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <form onSubmit={handleCreateOrganization}>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
                <DialogDescription>
                  Create a new organization to manage teams and access control.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 px-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input id="name" name="name" placeholder="Acme Corporation" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="acme-corp"
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens allowed"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain (Optional)</Label>
                  <Input id="domain" name="domain" placeholder="acme.com" />
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
                <Button type="submit" disabled={createMutation.isLoading}>
                  {createMutation.isLoading ? 'Creating...' : 'Create Organization'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="w-full rounded-lg border bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  Loading organizations...
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  {searchQuery
                    ? 'No organizations found matching your search.'
                    : 'No organizations found.'}
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{org.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{org.slug}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {org.domain ? (
                        <>
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {org.domain}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No domain</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{org.memberCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(org)}
                        className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(org)}
                        className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {organizations.length} of {pagination.total} organizations
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
              disabled={currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}


      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{organizationToDelete?.name}&quot;? This action
              cannot be undone.
              {organizationToDelete && organizationToDelete.memberCount > 0 && (
                <div className="mt-2 rounded bg-orange-50 p-2 dark:bg-orange-900/20">
                  <strong>Warning:</strong> This organization has {organizationToDelete.memberCount}{' '}
                  member(s). They will lose access to this organization.
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpdateOrganization}>
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
              <DialogDescription>Update the organization information below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 px-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Organization Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={organizationToEdit?.name || ''}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">URL Slug</Label>
                <Input
                  id="edit-slug"
                  name="slug"
                  defaultValue={organizationToEdit?.slug || ''}
                  placeholder="acme-corp"
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens allowed"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-domain">Domain (Optional)</Label>
                <Input
                  id="edit-domain"
                  name="domain"
                  defaultValue={organizationToEdit?.domain || ''}
                  placeholder="acme.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isLoading}>
                {updateMutation.isLoading ? 'Updating...' : 'Update Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { OrganizationManagement };
