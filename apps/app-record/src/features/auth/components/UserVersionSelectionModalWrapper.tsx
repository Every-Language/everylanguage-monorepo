import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { UserVersionSelectionModal } from './UserVersionSelectionModal';

/**
 * Navigation wrapper for UserVersionSelectionModal
 * This component handles the navigation props and passes them to the actual modal
 */
export const UserVersionSelectionModalWrapper: React.FC = () => {
  const navigation = useNavigation();

  const handleComplete = useCallback(() => {
    // Navigate back to the previous screen
    navigation.goBack();
  }, [navigation]);

  const handleSkip = useCallback(() => {
    // Navigate back to the previous screen
    navigation.goBack();
  }, [navigation]);

  return (
    <UserVersionSelectionModal
      visible={true}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
};
