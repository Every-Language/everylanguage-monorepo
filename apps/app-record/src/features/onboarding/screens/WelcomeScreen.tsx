import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, useLocalization } from '@/shared/hooks';
import { DatabaseStatusCard } from '../components/DatabaseStatusCard';
import { WelcomeCard } from '../components/WelcomeCard';
import { OnboardingHeader } from '../components';
import { useDatabaseStatus } from '../hooks/useDatabaseStatus';
import { SafeAreaView } from 'react-native-safe-area-context';
// Removed useOnboardingStore import - no longer needed

interface WelcomeScreenProps {
  onNavigateToMotherTongue: () => void;
  onNavigateToImportBible: () => void;
  onComplete: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNavigateToMotherTongue,
  onNavigateToImportBible,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const { databaseStatus, databaseProgress, error, handleRetryDatabase } =
    useDatabaseStatus();
  // Removed sign out progress handling - moved to OnboardingAuthScreen

  const [showDatabaseCard, setShowDatabaseCard] = useState(false);

  useEffect(() => {
    if (databaseStatus === 'ready') {
      // Show import cards when database is ready
      setShowDatabaseCard(false);
    } else if (databaseStatus === 'error') {
      // Show database card only when there's an error
      setShowDatabaseCard(true);
    } else {
      // Database is loading, show import cards with loading state
      setShowDatabaseCard(false);
    }
  }, [databaseStatus]);

  const canProceed = databaseStatus !== 'error';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingHeader
        title={t('onboarding.welcome')}
        subtitle={t('onboarding.setupChoice')}
        showBackButton={false}
        showControls={true}
      />

      <View style={styles.content}>
        {/* Database Status Card */}
        {showDatabaseCard && (
          <View style={styles.databaseCardContainer}>
            <DatabaseStatusCard
              status={databaseStatus}
              progress={databaseProgress}
              error={error}
              onRetry={handleRetryDatabase}
            />
          </View>
        )}

        {/* Main Setup Cards */}
        {canProceed && (
          <View style={styles.cardsSection}>
            {/* Online Bible Setup Card */}
            <View style={styles.cardContainer}>
              <WelcomeCard
                icon='cloud'
                title={t('onboarding.onlineSetup.title')}
                description={t('onboarding.onlineSetup.description')}
                backgroundColor={theme.colors.secondary}
                onPress={onNavigateToMotherTongue}
              />
            </View>

            {/* Offline Bible Setup Card */}
            <View style={styles.cardContainer}>
              <WelcomeCard
                icon='folder'
                title={t('onboarding.offlineSetup.title')}
                description={t('onboarding.offlineSetup.description')}
                backgroundColor={theme.colors.secondary}
                onPress={onNavigateToImportBible}
              />
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  databaseCardContainer: {
    marginBottom: 24,
  },
  cardsSection: {
    flex: 1,
    gap: 0,
  },
  cardContainer: {
    width: '100%',
  },
});
