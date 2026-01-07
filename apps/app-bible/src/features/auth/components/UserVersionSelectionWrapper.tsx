import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '@/app/navigation/RootNavigator';
import { useAuthStore } from '@/shared/store/authStore';
import { logger } from '@/shared/utils/logger';

// Logging configuration for this module
const ENABLE_LOGGING = false;

/**
 * Wrapper component that listens to auth store and shows version selection modal when needed
 * This should be placed at the root level of the app to monitor auth state changes
 */
export const UserVersionSelectionWrapper: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { needsVersionSelection, clearVersionSelectionFlag } = useAuthStore();

  useEffect(() => {
    if (needsVersionSelection) {
      logger.info(
        ENABLE_LOGGING,
        'UserVersionSelectionWrapper: Showing version selection modal'
      );

      // Navigate to the version selection modal
      navigation.navigate('UserVersionSelectionModal');

      // Clear the flag immediately to prevent duplicate navigation
      clearVersionSelectionFlag();
    }
  }, [needsVersionSelection, navigation, clearVersionSelectionFlag]);

  // This component doesn't render anything - it just listens to state changes
  return null;
};
