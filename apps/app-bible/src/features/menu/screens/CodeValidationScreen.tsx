import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { CodeValidationScreen as AuthCodeValidationScreen } from '@/features/auth/screens/CodeValidationScreen';
import { useAuthContext } from '@/features/auth/hooks/useAuthFromStore';
import { logger } from '@/shared/utils/logger';
import type { MenuStackNavigationProp } from '../navigation/MenuStackNavigator';

// Logging configuration for this module
const ENABLE_LOGGING = false;

interface CodeValidationScreenProps {
  route: {
    params: {
      type: 'email' | 'phone';
      email?: string;
      phone?: string;
    };
  };
}

export const CodeValidationScreen: React.FC<CodeValidationScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<MenuStackNavigationProp>();
  const { completeVerification } = useAuthContext();
  const { type, email, phone } = route.params;

  const handleVerificationComplete = async () => {
    try {
      await completeVerification();
      // Navigate back to sign in after successful verification
      navigation.getParent()?.navigate('AuthModal');
    } catch (error) {
      logger.error(ENABLE_LOGGING, 'Verification completion error:', error);
    }
  };

  const handleBack = () => {
    // Navigate back to sign in
    navigation.getParent()?.navigate('AuthModal');
  };

  return (
    <AuthCodeValidationScreen
      type={type}
      {...(email && { email })}
      {...(phone && { phone })}
      onVerificationComplete={handleVerificationComplete}
      onBack={handleBack}
    />
  );
};
