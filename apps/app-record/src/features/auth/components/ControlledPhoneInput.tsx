import React from 'react';
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from 'react-hook-form';
import { PhoneInputComponent as PhoneInput } from './PhoneInput';

interface ControlledPhoneInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TName>;
}

export function ControlledPhoneInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ name, control, rules }: ControlledPhoneInputProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules || {}}
      render={({
        field: { onChange, value: _value },
        fieldState: { error },
      }) => (
        <PhoneInput
          onChangeText={(phone: string, _isValid: boolean) => {
            onChange(phone);
          }}
          error={error?.message || ''}
        />
      )}
    />
  );
}
