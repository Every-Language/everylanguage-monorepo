import React from 'react';
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
  useWatch,
} from 'react-hook-form';
import { ConfirmPasswordInput } from './ConfirmPasswordInput';

interface ControlledConfirmPasswordInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TName>;
  originalPasswordField: FieldPath<TFieldValues>;
  placeholder?: string;
  label?: string;
  // Note: originalPassword is handled internally via useWatch
}

export function ControlledConfirmPasswordInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  rules,
  originalPasswordField,
  ...confirmPasswordInputProps
}: ControlledConfirmPasswordInputProps<TFieldValues, TName>) {
  // Watch the original password field
  const originalPassword = useWatch({
    control,
    name: originalPasswordField,
  }) as string;

  return (
    <Controller
      name={name}
      control={control}
      rules={rules || {}}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <ConfirmPasswordInput
          {...confirmPasswordInputProps}
          value={value || ''}
          originalPassword={originalPassword || ''}
          onChangeText={(confirmPassword: string, _isValid: boolean) => {
            onChange(confirmPassword);
          }}
          error={error?.message || ''}
        />
      )}
    />
  );
}
