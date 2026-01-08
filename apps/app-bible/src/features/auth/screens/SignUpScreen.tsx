import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useLocalization } from '@/shared/hooks';
import { useAuthContext } from '@/features/auth/hooks/useAuthFromStore';
import type {
  SignUpScreenProps,
  AuthStackNavigationProp,
} from '../navigation/AuthStackNavigator';
import { SignUpForm } from '@/features/auth/components/SignUpForm';

interface SignUpScreenPropsWithOnboarding extends SignUpScreenProps {
  onAuthComplete?: (() => void) | undefined;
  onSkipAuth?: (() => void) | undefined;
}

export const SignUpScreen: React.FC<SignUpScreenPropsWithOnboarding> = ({
  onAuthComplete,
  onSkipAuth,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<AuthStackNavigationProp>();
  const { user } = useAuthContext();

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
    skipButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.overlay,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    skipButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipIcon: {
      marginLeft: 6,
    },
    skipButtonText: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    authContainer: { flex: 1, padding: 16 },
  });

  const isAuthenticated =
    !!user &&
    (user as { is_anonymous?: boolean } | null)?.is_anonymous !== true;

  // If user logs in while on auth view, handle completion
  React.useEffect(() => {
    if (isAuthenticated) {
      if (onAuthComplete) {
        // In onboarding context, call the completion handler
        onAuthComplete();
      } else {
        // In main app context, close the modal
        navigation.getParent()?.goBack();
      }
    }
  }, [isAuthenticated, navigation, onAuthComplete]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSwitchToSignIn = useCallback(() => {
    navigation.navigate('SignIn');
  }, [navigation]);

  const handleNavigateToVerify = useCallback(
    (type: 'email' | 'phone', email?: string, phone?: string) => {
      navigation.navigate('VerifyCode', {
        type,
        ...(email && { email }),
        ...(phone && { phone }),
        purpose: 'signup',
      });
    },
    [navigation]
  );

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
        {onSkipAuth ? (
          <TouchableOpacity
            onPress={() => onSkipAuth()}
            style={[
              styles.skipButton,
              { backgroundColor: theme.colors.primary },
            ]}>
            <View style={styles.skipButtonContent}>
              <Text
                style={[
                  styles.skipButtonText,
                  { color: theme.colors.textInverse },
                ]}>
                {t('common.skip')}
              </Text>
              <Ionicons
                name='arrow-forward'
                size={16}
                color={theme.colors.textInverse}
                style={styles.skipIcon}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.getParent()?.goBack()}
            style={styles.closeButton}>
            <Ionicons
              name='close'
              size={24}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.authContainer}>
        <SignUpForm
          onSwitchToSignIn={handleSwitchToSignIn}
          onNavigateToVerify={handleNavigateToVerify}
        />
      </View>
    </SafeAreaView>
  );
};
