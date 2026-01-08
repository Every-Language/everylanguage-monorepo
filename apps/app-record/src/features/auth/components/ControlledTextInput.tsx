import React from 'react';
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  RegisterOptions,
} from 'react-hook-form';
import { TextInput, TextInputProps } from './TextInput';

interface ControlledTextInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<TextInputProps, 'value' | 'onChangeText' | 'error'> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TName>;
}

export function ControlledTextInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  control,
  rules,
  ...textInputProps
}: ControlledTextInputProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules || {}}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <TextInput
          {...textInputProps}
          value={value || ''}
          onChangeText={(text: string, _isValid: boolean) => {
            onChange(text);
          }}
          error={error?.message || ''}
        />
      )}
    />
  );
}
