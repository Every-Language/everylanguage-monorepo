import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/shared/hooks/useThemeFromStore';
import { useLocalization } from '@/shared/hooks';
import { useVersionsStore } from '../store/versionsStore';
import type { AudioVersion, TextVersion } from '../types/entities';
import type {
  VersionsScreenProps,
  VersionSelectionStackNavigationProp,
} from '../navigation/VersionSelectionStackNavigator';
import { SavedVersionItem } from '../components/SavedVersionItem';
import { logger } from '@/shared/utils/logger';
import { StyleSheet } from 'react-native';
import { ModalHeader } from '@/shared/components/ModalHeader';

// Logging configuration for this module
const ENABLE_LOGGING = true;

export const VersionsScreen: React.FC<VersionsScreenProps> = ({ route }) => {
  const { versionType, title } = route.params;
  const { theme } = useTheme();
  const { t } = useLocalization();
  const navigation = useNavigation<VersionSelectionStackNavigationProp>();
  const insets = useSafeAreaInsets();

  const {
    savedAudioVersions,
    savedTextVersions,
    currentAudioVersion,
    currentTextVersion,
    setCurrentAudioVersion,
    setCurrentTextVersion,
    removeSavedVersion,
    isReady,
    error,
  } = useVersionsStore();

  const isLoading = !isReady;
  const savedVersions =
    versionType === 'audio' ? savedAudioVersions : savedTextVersions;
  const currentVersion =
    versionType === 'audio' ? currentAudioVersion : currentTextVersion;

  const handleVersionSelect = useCallback(
    async (version: AudioVersion | TextVersion) => {
      try {
        if (versionType === 'audio') {
          await setCurrentAudioVersion(version as AudioVersion);
        } else {
          await setCurrentTextVersion(version as TextVersion);
        }
        navigation.getParent()?.goBack(); // Close the modal
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Error selecting version:', error);
      }
    },
    [versionType, setCurrentAudioVersion, setCurrentTextVersion, navigation]
  );

  const handleRemoveVersion = useCallback(
    async (versionId: string) => {
      try {
        await removeSavedVersion(versionId, versionType);
      } catch (error) {
        logger.error(ENABLE_LOGGING, 'Error removing version:', error);
      }
    },
    [removeSavedVersion, versionType]
  );

  const handleAddNewVersion = useCallback(() => {
    navigation.navigate('LanguageSearch', {
      versionType,
      title: title || `Search ${versionType} versions`,
    });
  }, [navigation, versionType, title]);

  const openVersionInfo = useCallback(
    (version: AudioVersion | TextVersion) => {
      navigation.navigate('VersionInfo', { version, versionType });
    },
    [navigation, versionType]
  );

  const handleClose = useCallback(() => {
    navigation.getParent()?.goBack();
  }, [navigation]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.modalBackground,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <ModalHeader
        title={title || t('versions.modalSelect', { versionType })}
        showBack={false}
        showClose={true}
        onClose={handleClose}
      />

      {/* Error Message */}
      {error && (
        <View
          style={[
            styles.errorContainer,
            { backgroundColor: theme.colors.surfaceOverlay },
          ]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t('versions.loadingSaved')}
          </Text>
        </View>
      ) : (
        <>
          {/* Add New Version Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleAddNewVersion}>
              <Ionicons name='add' size={20} color={theme.colors.textInverse} />
              <Text
                style={[
                  styles.addButtonText,
                  { color: theme.colors.textInverse },
                ]}>
                {t('versions.addNew', { versionType })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Saved Versions List */}
          <ScrollView style={styles.scrollView}>
            {savedVersions.length > 0 ? (
              <>
                <View style={[styles.sectionHeader]}>
                  <Text
                    style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {t('versions.savedListTitle', {
                      versionType,
                      count: savedVersions.length,
                    })}
                  </Text>
                </View>

                {savedVersions.map((version: AudioVersion | TextVersion) => (
                  <SavedVersionItem
                    key={version.id}
                    version={version}
                    isSelected={currentVersion?.id === version.id}
                    onSelect={handleVersionSelect}
                    onRemove={handleRemoveVersion}
                    versionType={versionType}
                    onInfoRequested={() => openVersionInfo(version)}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.textSecondary },
                  ]}>
                  {t('versions.noSaved', { versionType })}
                </Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  addButtonContainer: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
});
