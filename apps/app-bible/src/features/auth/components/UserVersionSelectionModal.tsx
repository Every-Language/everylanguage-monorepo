import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks';
import { useLocalization } from '@/shared/hooks';
import { useUserVersions } from '@/features/languages/hooks/useUserVersions';
import { AudioVersion, TextVersion } from '@/features/languages/types/entities';
import { logger } from '@/shared/utils/logger';
import { ModalHeader, Button } from '@everylanguage/shared-native-ui';

// Logging configuration for this module
const ENABLE_LOGGING = true;

interface UserVersionSelectionModalProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface VersionOptionProps {
  version: AudioVersion | TextVersion;
  type: 'audio' | 'text';
  isSelected: boolean;
  onSelect: (version: AudioVersion | TextVersion) => void;
}

const VersionOption: React.FC<VersionOptionProps> = ({
  version,
  type,
  isSelected,
  onSelect,
}) => {
  const { theme } = useTheme();
  const { t } = useLocalization();

  const handlePress = () => {
    onSelect(version);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isSelected
        ? theme.colors.primary + '20' // Add transparency
        : theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginVertical: 4,
      borderWidth: 2,
      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    typeLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.primary,
      textTransform: 'uppercase',
      marginTop: 4,
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Text style={styles.title}>{version.name}</Text>
      <Text style={styles.subtitle}>
        {version.languageName || t('languages.unknown')}
      </Text>
      <Text style={styles.typeLabel}>
        {type === 'audio' ? t('versions.audio') : t('versions.text')}
      </Text>
    </TouchableOpacity>
  );
};

export const UserVersionSelectionModal: React.FC<
  UserVersionSelectionModalProps
> = ({ visible, onComplete, onSkip }) => {
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation();

  const {
    savedAudioVersions,
    savedTextVersions,
    currentAudioVersion,
    currentTextVersion,
    setCurrentAudioVersion,
    setCurrentTextVersion,
    refreshVersions,
    isLoading,
    error,
  } = useUserVersions();

  const [selectedAudioVersion, setSelectedAudioVersion] =
    useState<AudioVersion | null>(null);
  const [selectedTextVersion, setSelectedTextVersion] =
    useState<TextVersion | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize selections with current versions or first available
  useEffect(() => {
    if (visible && !isLoading) {
      setSelectedAudioVersion(
        currentAudioVersion || savedAudioVersions[0] || null
      );
      setSelectedTextVersion(
        currentTextVersion || savedTextVersions[0] || null
      );
    }
  }, [
    visible,
    isLoading,
    currentAudioVersion,
    currentTextVersion,
    savedAudioVersions,
    savedTextVersions,
  ]);

  const handleAudioSelect = useCallback(
    (version: AudioVersion | TextVersion) => {
      setSelectedAudioVersion(version as AudioVersion);
    },
    []
  );

  const handleTextSelect = useCallback(
    (version: AudioVersion | TextVersion) => {
      setSelectedTextVersion(version as TextVersion);
    },
    []
  );

  const handleComplete = useCallback(async () => {
    try {
      setIsSaving(true);

      // Save selected versions
      if (selectedAudioVersion) {
        await setCurrentAudioVersion(selectedAudioVersion);
      }
      if (selectedTextVersion) {
        await setCurrentTextVersion(selectedTextVersion);
      }

      logger.info(
        ENABLE_LOGGING,
        'UserVersionSelectionModal: Versions saved successfully'
      );
      onComplete();
    } catch (error) {
      logger.error(
        ENABLE_LOGGING,
        'UserVersionSelectionModal: Error saving versions:',
        error
      );
      Alert.alert(t('common.error'), t('versions.saveError'));
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedAudioVersion,
    selectedTextVersion,
    setCurrentAudioVersion,
    setCurrentTextVersion,
    onComplete,
    t,
  ]);

  const handleSkip = useCallback(() => {
    logger.info(
      ENABLE_LOGGING,
      'UserVersionSelectionModal: User skipped version selection'
    );
    onSkip();
  }, [onSkip]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const canComplete = selectedAudioVersion || selectedTextVersion;
  const hasVersions =
    savedAudioVersions.length > 0 || savedTextVersions.length > 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 22,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    emptyState: {
      padding: 32,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      paddingTop: 20,
    },
    button: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
    },
  });

  if (!visible) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ModalHeader
          title={t('versions.selectVersions')}
          showClose={true}
          onClose={handleClose}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ModalHeader
          title={t('versions.selectVersions')}
          showClose={true}
          onClose={handleClose}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('versions.loadError')}</Text>
          <Button
            title={t('common.retry')}
            onPress={() => {
              // Refresh the versions data
              refreshVersions();
            }}
            variant='primary'
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ModalHeader
        title={t('versions.selectVersions')}
        showClose={true}
        onClose={handleClose}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('versions.welcomeTitle')}</Text>
        <Text style={styles.subtitle}>{t('versions.welcomeSubtitle')}</Text>

        {!hasVersions ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {t('versions.noVersionsAvailable')}
            </Text>
          </View>
        ) : (
          <>
            {savedTextVersions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('versions.textVersions')}
                </Text>
                {savedTextVersions.map(version => (
                  <VersionOption
                    key={version.id}
                    version={version}
                    type='text'
                    isSelected={selectedTextVersion?.id === version.id}
                    onSelect={handleTextSelect}
                  />
                ))}
              </View>
            )}

            {savedAudioVersions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('versions.audioVersions')}
                </Text>
                {savedAudioVersions.map(version => (
                  <VersionOption
                    key={version.id}
                    version={version}
                    type='audio'
                    isSelected={selectedAudioVersion?.id === version.id}
                    onSelect={handleAudioSelect}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={t('common.skip')}
            onPress={handleSkip}
            variant='secondary'
            style={styles.button}
            disabled={isSaving}
          />
          <Button
            title={t('common.continue')}
            onPress={handleComplete}
            variant='primary'
            style={styles.button}
            disabled={!canComplete || isSaving}
            loading={isSaving}
          />
        </View>
      </ScrollView>
    </View>
  );
};
