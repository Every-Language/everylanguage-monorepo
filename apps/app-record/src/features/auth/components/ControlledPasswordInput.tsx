import React from 'react';
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from 'react-hook-form';
import { PasswordInput, PasswordInputProps } from './PasswordInput';

interface ControlledPasswordInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<PasswordInputProps, 'value' | 'onChangeText' | 'error'> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TName>;
}

export function ControlledPasswordInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  rules,
  ...passwordInputProps
}: ControlledPasswordInputProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules || {}}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <PasswordInput
          {...passwordInputProps}
          value={value || ''}
          onChangeText={(password: string, _isValid: boolean) => {
            onChange(password);
          }}
          error={error?.message || ''}
        />
      )}
    />
  );
}
