import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../theme/utils';

const textareaVariants = cva(
  [
    'flex w-full rounded-lg border transition-colors duration-200',
    'placeholder:text-neutral-500 dark:placeholder:text-neutral-400',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'aria-[invalid=true]:border-error-500 aria-[invalid=true]:focus-visible:ring-error-500',
    'text-neutral-900 dark:text-neutral-100',
    'resize-y',
  ],
  {
    variants: {
      variant: {
        default: [
          'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800',
          'hover:border-neutral-300 dark:hover:border-neutral-600',
          'focus-visible:border-primary-500 dark:focus-visible:border-primary-400 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          'focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
        ],
        filled: [
          'border-transparent bg-neutral-100 dark:bg-neutral-700',
          'hover:bg-neutral-50 dark:hover:bg-neutral-600',
          'focus-visible:bg-white dark:focus-visible:bg-neutral-800 focus-visible:border-primary-500 dark:focus-visible:border-primary-400 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          'focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
        ],
      },
      size: {
        sm: 'h-20 px-3 py-2 text-sm',
        md: 'h-32 px-3 py-2 text-sm',
        lg: 'h-40 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface TextareaProps
  extends
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant,
      size,
      label,
      error,
      helperText,
      containerClassName,
      id,
      ...props
    },
    ref
  ) => {
    const textareaId =
      id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className='block text-sm font-medium text-neutral-700 dark:text-neutral-300'>
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          className={cn(textareaVariants({ variant, size }), className)}
          ref={ref}
          aria-invalid={hasError}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
                ? `${textareaId}-helper`
                : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
            className='text-sm text-error-600 dark:text-error-400'>
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${textareaId}-helper`}
            className='text-sm text-neutral-500 dark:text-neutral-400'>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
