'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, authService } from '@/features/auth';
import {
  Form,
  FormActions,
  FormField,
  FormLabel,
} from '@/shared/components/ui/Form';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { useToast } from '@/shared/theme/hooks/useToast';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { useState } from 'react';

export const ResetPasswordPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.newPassword =
        'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user?.email) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Verify current password by attempting to sign in
      // This will fail if the password is incorrect
      await authService.signIn(user.email, currentPassword);

      // If sign-in succeeds, update to new password
      await authService.updatePassword(newPassword);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Password reset error:', error);

      // Check if it's a password verification error
      if (
        error?.message?.includes('Invalid login credentials') ||
        error?.message?.includes('Invalid password') ||
        error?.status === 400
      ) {
        setErrors({
          currentPassword: 'Current password is incorrect',
        });
        toast({
          title: 'Password reset failed',
          description: 'Current password is incorrect.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Password reset failed',
          description: error?.message || 'Please try again later.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        Loading…
      </div>
    );
  }

  if (!user) return null;

  return (
    <Card className='border border-neutral-200 dark:border-neutral-800'>
      <CardContent className='p-6 sm:p-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-neutral-900 dark:text-neutral-100'>
            Reset Password
          </h1>
          <p className='text-sm text-neutral-500 dark:text-neutral-400 mt-1'>
            Change your account password
          </p>
        </div>

        <Form onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <FormField name='currentPassword'>
              <FormLabel>Current Password</FormLabel>
              <Input
                type='password'
                value={currentPassword}
                onChange={e => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword) {
                    setErrors({ ...errors, currentPassword: undefined });
                  }
                }}
                placeholder='Enter your current password'
                error={errors.currentPassword}
                aria-invalid={!!errors.currentPassword}
              />
            </FormField>

            <FormField name='newPassword'>
              <FormLabel>New Password</FormLabel>
              <Input
                type='password'
                value={newPassword}
                onChange={e => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) {
                    setErrors({ ...errors, newPassword: undefined });
                  }
                  // Clear confirm password error if new password changes
                  if (
                    errors.confirmPassword &&
                    e.target.value === confirmPassword
                  ) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                placeholder='Enter your new password'
                error={errors.newPassword}
                aria-invalid={!!errors.newPassword}
              />
              {!errors.newPassword && (
                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                  Must be at least 8 characters
                </p>
              )}
            </FormField>

            <FormField name='confirmPassword'>
              <FormLabel>Confirm New Password</FormLabel>
              <Input
                type='password'
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                placeholder='Confirm your new password'
                error={errors.confirmPassword}
                aria-invalid={!!errors.confirmPassword}
              />
            </FormField>
          </div>

          <FormActions className='mt-6'>
            <Button
              type='button'
              variant='secondary'
              onClick={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setErrors({});
              }}
              disabled={isSubmitting}>
              Clear
            </Button>
            <Button
              type='submit'
              disabled={isSubmitting}
              loading={isSubmitting}>
              Update Password
            </Button>
          </FormActions>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ResetPasswordPage;
