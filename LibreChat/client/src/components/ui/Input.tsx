import * as React from 'react';

import { cn } from '~/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-500 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:hover:border-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20',
        className ?? '',
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
