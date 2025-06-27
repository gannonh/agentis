/**
 * @fileoverview Unified data table component for admin interfaces
 * @module components/Admin/shared/AdminDataTable
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/Table';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Search } from 'lucide-react';

interface AdminColumn<T> {
  key: keyof T | 'actions';
  header: string;
  accessor?: (item: T) => React.ReactNode;
  className?: string;
}

interface AdminAction<T> {
  label: string | ((item: T) => string);
  icon: React.ComponentType<{ className?: string }> | ((item: T) => React.ComponentType<{ className?: string }>);
  onClick: (item: T) => void;
  variant?: 'edit' | 'delete' | 'primary' | ((item: T) => 'edit' | 'delete' | 'primary');
  className?: string;
}

interface AdminDataTableProps<T> {
  data: T[];
  columns: AdminColumn<T>[];
  actions?: AdminAction<T>[];
  isLoading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Unified admin data table with consistent styling and behavior
 */
function AdminDataTable<T extends { id: string }>({
  data,
  columns,
  actions = [],
  isLoading = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found.',
  className = '',
}: AdminDataTableProps<T>) {
  const getActionButtonClass = (variant?: string) => {
    switch (variant) {
      case 'edit':
        return 'h-8 px-2 text-xs text-blue-600 hover:text-blue-700';
      case 'delete':
        return 'h-8 px-2 text-xs text-red-600 hover:text-red-700';
      case 'primary':
        return 'h-8 px-2 text-xs text-green-600 hover:text-green-700';
      default:
        return 'h-8 px-2 text-xs';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Section */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="w-full rounded-lg bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className={column.className || (column.key === 'actions' ? 'text-right' : '')}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-8 text-center">
                  {searchValue ? 'No items found matching your search.' : emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)} className={column.className}>
                      {column.key === 'actions' ? (
                        <div className="flex items-center justify-end space-x-2">
                          {actions.map((action, index) => {
                            const label = typeof action.label === 'function' ? action.label(item) : action.label;
                            const IconComponent = typeof action.icon === 'function' ? action.icon(item) : action.icon;
                            const variant = typeof action.variant === 'function' ? action.variant(item) : action.variant;
                            
                            return (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => action.onClick(item)}
                                className={getActionButtonClass(variant)}
                              >
                                <IconComponent className="mr-1 h-3 w-3" />
                                {label}
                              </Button>
                            );
                          })}
                        </div>
                      ) : column.accessor ? (
                        column.accessor(item)
                      ) : (
                        (item[column.key as keyof T] as React.ReactNode)
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export { AdminDataTable, type AdminColumn, type AdminAction };