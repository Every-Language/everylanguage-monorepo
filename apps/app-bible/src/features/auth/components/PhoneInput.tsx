import React from 'react';
import { View, Text } from 'react-native';
import {
  PhoneInput as PhoneInputLib,
  isValidNumber,
} from 'react-native-phone-entry';
import { useTheme } from '@/shared/hooks';
import { createThemedStyles } from '@everylanguage/shared-native-ui';

const themedStyles = createThemedStyles({
  container: theme => ({
    marginBottom: theme.spacing.lg,
  }),
  label: theme => ({
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  }),
  phoneInputContainer: theme => ({
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  }),
  phoneInputTextContainer: theme => ({
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  }),
  phoneInputTextInput: theme => ({
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
  }),
  phoneInputCodeText: theme => ({
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.md,
  }),
  errorText: theme => ({
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  }),
});

interface PhoneInputProps {
  onChangeText: (phone: string, isValid: boolean) => void;
  error?: string;
}

export function PhoneInputComponent({ onChangeText, error }: PhoneInputProps) {
  const { theme } = useTheme();
  const styles = themedStyles(theme);

  const handleChangeText = (text: string) => {
    // Use the library's validation function with US as default
    const isValid = isValidNumber(text, 'US');
    onChangeText(text, isValid);
  };

  const handleChangeCountry = (_country: { cca2: string }) => {
    // Country change is handled by the library
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phone Number*</Text>

      <PhoneInputLib
        defaultValues={{
          countryCode: 'US',
          callingCode: '+1',
          phoneNumber: '+1',
        }}
        onChangeText={handleChangeText}
        onChangeCountry={handleChangeCountry}
        autoFocus={false}
        disabled={false}
        countryPickerProps={{
          withFilter: true,
          withFlag: true,
          withCountryNameButton: true,
          // Remove any country restrictions to allow all countries
        }}
        theme={{
          containerStyle: styles.phoneInputContainer,
          textInputStyle: styles.phoneInputTextInput,
          codeTextStyle: styles.phoneInputCodeText,
          flagButtonStyle: styles.phoneInputTextContainer,
          enableDarkTheme: theme.mode === 'dark',
        }}
        hideDropdownIcon={false}
        isCallingCodeEditable={false}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}
