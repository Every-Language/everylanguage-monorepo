import React from 'react';
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from 'react-hook-form';
import { EmailInput, EmailInputProps } from './EmailInput';

interface ControlledEmailInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<EmailInputProps, 'value' | 'onChangeText' | 'error'> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TName>;
}

export function ControlledEmailInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  rules,
  ...emailInputProps
}: ControlledEmailInputProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules || {}}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <EmailInput
          {...emailInputProps}
          value={value || ''}
          onChangeText={(email: string, _isValid: boolean) => {
            onChange(email);
          }}
          error={error?.message || ''}
        />
      )}
    />
  );
}
