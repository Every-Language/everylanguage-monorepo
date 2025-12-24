import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/hooks';
import { createThemedStyles } from '@/shared';
import { CodeValidationScreen } from '../screens/CodeValidationScreen';
import { useValidationFlow } from '../hooks/useValidationFlow';

const themedStyles = createThemedStyles({
  container: theme => ({
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  }),
  title: theme => ({
    fontSize: theme.typography.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  }),
  button: theme => ({
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: 8,
    marginBottom: theme.spacing.md,
  }),
  buttonText: theme => ({
    color: theme.colors.background,
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  }),
});

/**
 * Example component demonstrating how to use the validation screens
 * This shows how to integrate the validation flow into your own components
 */
export function ValidationExample() {
  const { theme } = useTheme();
  const styles = themedStyles(theme);

  const {
    validationState,
    startEmailValidation,
    startPhoneValidation,
    completeValidation,
    cancelValidation,
  } = useValidationFlow();

  // Show validation screen if validation is required
  if (validationState.isValidationRequired && validationState.validationType) {
    return (
      <CodeValidationScreen
        type={validationState.validationType}
        {...(validationState.email ? { email: validationState.email } : {})}
        {...(validationState.phone ? { phone: validationState.phone } : {})}
        onVerificationComplete={completeValidation}
        onBack={cancelValidation}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Validation Example</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => startEmailValidation('user@example.com')}>
        <Text style={styles.buttonText}>Test Email Validation</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={() => startPhoneValidation('+1234567890')}>
        <Text style={styles.buttonText}>Test Phone Validation</Text>
      </TouchableOpacity>
    </View>
  );
}
