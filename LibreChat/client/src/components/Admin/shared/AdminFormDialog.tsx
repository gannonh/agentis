/**
 * @fileoverview Unified form dialog component for admin interfaces
 * @module components/Admin/shared/AdminFormDialog
 */

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  // Create default values from fields and initial values
  const defaultValues = fields.reduce(
    (acc, field) => {
      acc[field.name] = initialValues[field.name] || field.defaultValue || '';
      return acc;
    },
    {} as Record<string, string>,
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<Record<string, string>>({
    mode: 'onSubmit',
    defaultValues,
  });

  // Reset form when initialValues change or dialog opens
  React.useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [isOpen, reset, defaultValues]);

  const onSubmitHandler = async (data: Record<string, string>) => {
    try {
      await onSubmit(data);
    } catch (err) {
      setError('root', {
        type: 'server',
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmitHandler)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {errors.root && (
            <div className="mx-6 mb-4 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-600">{errors.root.message}</p>
            </div>
          )}

          <div className="space-y-4 px-6 py-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>

                {field.type === 'select' ? (
                  <Controller
                    name={field.name}
                    control={control}
                    rules={{ required: field.required ? `${field.label} is required` : false }}
                    render={({ field: controllerField }) => (
                      <Select
                        value={controllerField.value}
                        onValueChange={controllerField.onChange}
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
                    )}
                  />
                ) : (
                  <Controller
                    name={field.name}
                    control={control}
                    rules={{
                      required: field.required ? `${field.label} is required` : false,
                      pattern: field.pattern
                        ? {
                            value: new RegExp(field.pattern),
                            message: field.title || `Invalid ${field.label.toLowerCase()}`,
                          }
                        : undefined,
                    }}
                    render={({ field: controllerField }) => (
                      <Input
                        id={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        title={field.title}
                        {...controllerField}
                      />
                    )}
                  />
                )}

                {errors[field.name] && (
                  <p className="text-xs text-red-500">{errors[field.name]?.message}</p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
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
