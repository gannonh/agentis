/**
 * @fileoverview Unified form dialog component for admin interfaces
 * @module components/Admin/shared/AdminFormDialog
 */

import React from 'react';
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
} from '~/components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/Select';

export interface AdminFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'password';
  placeholder?: string;
  required?: boolean;
  pattern?: string;
  title?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

interface AdminFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: AdminFormField[];
  onSubmit: (data: Record<string, string>) => void | Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
  initialValues?: Record<string, string>;
}

/**
 * Unified form dialog for admin CRUD operations
 */
const AdminFormDialog: React.FC<AdminFormDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  submitLabel = 'Save',
  isSubmitting = false,
  initialValues = {},
}) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data: Record<string, string> = {};
    
    fields.forEach(field => {
      data[field.name] = formData.get(field.name) as string || '';
    });
    
    await onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          
          <div className="space-y-4 py-4 px-6">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                
                {field.type === 'select' ? (
                  <Select
                    name={field.name}
                    defaultValue={initialValues[field.name] || field.defaultValue || ''}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    pattern={field.pattern}
                    title={field.title}
                    defaultValue={initialValues[field.name] || field.defaultValue || ''}
                  />
                )}
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? `${submitLabel}...` : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { AdminFormDialog };