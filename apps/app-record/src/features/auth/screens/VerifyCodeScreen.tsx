import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useLocalization } from '@/shared/hooks';
import { useAuthContext } from '@/features/auth/hooks/useAuthFromStore';
import { authService } from '../services/authService';
import { logger } from '@/shared/utils/logger';
import type {
  VerifyCodeScreenProps,
  AuthStackNavigationProp,
} from '../navigation/AuthStackNavigator';
import {
  EmailCodeValidation,
  PhoneCodeValidation,
} from '@/features/auth/components';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export const VerifyCodeScreen: React.FC<VerifyCodeScreenProps> = ({
  route,
}) => {
  const { type, email, phone, purpose } = route.params;
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { user } = useAuthContext();

  const isAuthenticated =
    !!user &&
    (user as { is_anonymous?: boolean } | null)?.is_anonymous !== true;

  // If user gets verified while on this screen, close the modal
  React.useEffect(() => {
    if (isAuthenticated && purpose === 'signup') {
      // Close the entire auth modal
      navigation.getParent()?.goBack();
    }
  }, [isAuthenticated, navigation, purpose]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

  const handleVerificationComplete = useCallback(() => {
    if (purpose === 'signup') {
      // For signup verification, close the entire auth modal
      navigation.getParent()?.goBack();
    } else {
      // For other purposes, go back to sign in
      navigation.navigate('SignIn');
    }
  }, [navigation, purpose]);

  const handleResendEmail = useCallback(async () => {
    try {
      logger.info(
        ENABLE_LOGGING,
        'VerifyCodeScreen: Resending email verification'
      );
      const { error } = await authService.resendEmailVerification(email || '');
      if (error) {
        logger.error(
          ENABLE_LOGGING,
          'VerifyCodeScreen: Resend email failed:',
          error
        );
        Alert.alert(t('common.error'), error);
        return;
      }
      logger.info(
        ENABLE_LOGGING,
        'VerifyCodeScreen: Email verification resent successfully to:',
        email
      );
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'VerifyCodeScreen: Resend email error:',
        error
      );
      const message =
        error instanceof Error ? error.message : t('auth.errors.generic');
      Alert.alert(t('common.error'), message);
    }
  }, [email, t]);

  const handleResendSms = useCallback(() => {
    // TODO: Implement resend SMS logic
    // console.log('Resend SMS requested');
  }, []);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[
        styles.container,
        { backgroundColor: theme.colors.modalBackground },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons
            name='chevron-back'
            size={24}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name='close' size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {type === 'email' && email ? (
          <EmailCodeValidation
            email={email}
            onVerificationComplete={handleVerificationComplete}
            onBack={handleBack}
            onResendEmail={handleResendEmail}
          />
        ) : type === 'phone' && phone ? (
          <PhoneCodeValidation
            phone={phone}
            onVerificationComplete={handleVerificationComplete}
            onBack={handleBack}
            onResendSms={handleResendSms}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44, // Status bar height + some padding
    paddingBottom: 12,
  },
  closeButton: { padding: 8 },
  backButton: { padding: 8, marginLeft: -8 },
  content: { flex: 1, padding: 16 },
});
